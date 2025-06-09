const express = require('express');
const router = express.Router();
const Task = require('../model/taskModel.cjs');
const Notification = require('../model/notificationModel.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');

// Get all tasks assigned to a user
router.get('/tasks/assigned/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const tasks = await Task.find({ assignedTo: userId })
            .populate('assignedBy', 'name email')
            .sort({ createdAt: -1 });
        
        return res.status(200).json({
            success: true,
            tasks
        });
    } catch (error) {
        console.error('Error fetching assigned tasks:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching assigned tasks',
            error: error.message
        });
    }
});

// Get unread tasks count for a user
router.get('/tasks/unread-count/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const unreadCount = await Task.countDocuments({ 
            assignedTo: userId, 
            isRead: false 
        });
        
        return res.status(200).json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching unread tasks count:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching unread tasks count',
            error: error.message
        });
    }
});

// Mark task as read
router.put('/tasks/:taskId/read', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        
        const task = await Task.findByIdAndUpdate(
            taskId,
            { isRead: true },
            { new: true }
        );
        
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        return res.status(200).json({
            success: true,
            task
        });
    } catch (error) {
        console.error('Error marking task as read:', error);
        return res.status(500).json({
            success: false,
            message: 'Error marking task as read',
            error: error.message
        });
    }
});

// Update task status
router.put('/tasks/:taskId/status', authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;
        const userId = req.user.id || req.user.userId;
        
        const updateData = { status };
        if (status === 'Completed') {
            updateData.completedAt = new Date();
        }
        
        const task = await Task.findByIdAndUpdate(
            taskId,
            updateData,
            { new: true }
        ).populate('assignedBy', 'name email')
          .populate('assignedTo', 'name email');
        
        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }
        
        // Create notification for task status change
        let notificationMessage = '';
        switch(status) {
            case 'In Progress':
                notificationMessage = `Task "${task.title}" has been started`;
                break;
            case 'Completed':
                notificationMessage = `Task "${task.title}" has been completed`;
                break;
            case 'Cancelled':
                notificationMessage = `Task "${task.title}" has been cancelled`;
                break;
            default:
                notificationMessage = `Task "${task.title}" status changed to ${status}`;
        }
        
        // Create notification for task owner
        const ownerNotification = new Notification({
            userId: task.assignedBy,
            message: notificationMessage,
            data: { 
                type: 'task_status_update', 
                taskId: task._id,
                taskTitle: task.title,
                status: status,
                updatedBy: userId,
                timestamp: new Date()
            }
        });
        await ownerNotification.save();
        
        // Create notification for assignee if they didn't make the change
        if (task.assignedTo.toString() !== userId && task.assignedTo.toString() !== task.assignedBy.toString()) {
            const assigneeNotification = new Notification({
                userId: task.assignedTo,
                message: notificationMessage,
                data: { 
                    type: 'task_status_update', 
                    taskId: task._id,
                    taskTitle: task.title,
                    status: status,
                    updatedBy: userId,
                    timestamp: new Date()
                }
            });
            await assigneeNotification.save();
        }
        
        return res.status(200).json({
            success: true,
            task
        });
    } catch (error) {
        console.error('Error updating task status:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating task status',
            error: error.message
        });
    }
});

// Create a new task (for admin/manager)
router.post('/tasks', authenticateToken, async (req, res) => {
    try {
        const { title, description, assignedTo, dueDate, priority } = req.body;
        const assignedBy = req.user.id;
        
        const task = new Task({
            title,
            description,
            assignedTo,
            assignedBy,
            dueDate,
            priority
        });
        
        await task.save();
        
        // Create notification for the assigned user
        const notification = new Notification({
            userId: assignedTo,
            message: `New task assigned: ${title}`,
            timestamp: new Date()
        });
        
        await notification.save();
        
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name email')
            .populate('assignedBy', 'name email');
        
        return res.status(201).json({
            success: true,
            task: populatedTask
        });
    } catch (error) {
        console.error('Error creating task:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating task',
            error: error.message
        });
    }
});

module.exports = router;