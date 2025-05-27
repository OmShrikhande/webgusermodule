const Task = require('../models/task.model');
const User = require('../models/user.model');

/**
 * Create a new task
 * @route POST /api/tasks
 * @access Private (Admin/Manager)
 */
const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority } = req.body;
    
    // Validate required fields
    if (!title || !assignedTo || !dueDate) {
      return res.status(400).json({ message: 'Title, assignedTo, and dueDate are required' });
    }
    
    // Check if assigned user exists
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({ message: 'Assigned user not found' });
    }
    
    // Create new task
    const newTask = new Task({
      title,
      description,
      assignedTo,
      assignedBy: req.user.id,
      dueDate,
      priority: priority || 'Medium'
    });
    
    await newTask.save();
    
    // Populate user information
    const task = await Task.findById(newTask._id)
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar');
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all tasks
 * @route GET /api/tasks
 * @access Private (Admin/Manager)
 */
const getAllTasks = async (req, res) => {
  try {
    // If user is admin or manager, return all tasks
    // Otherwise, return only tasks assigned to the user
    let query = {};
    
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      query.assignedTo = req.user.id;
    }
    
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar')
      .sort({ dueDate: 1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Get all tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get tasks assigned to current user
 * @route GET /api/tasks/my-tasks
 * @access Private
 */
const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id })
      .populate('assignedBy', 'name email avatar')
      .sort({ dueDate: 1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get task by ID
 * @route GET /api/tasks/:id
 * @access Private
 */
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user is authorized to view this task
    if (
      req.user.role !== 'admin' && 
      req.user.role !== 'manager' && 
      task.assignedTo._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update task
 * @route PUT /api/tasks/:id
 * @access Private
 */
const updateTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, status, priority } = req.body;
    
    // Find task
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user is authorized to update this task
    const isAssignedUser = task.assignedTo.toString() === req.user.id;
    const isAssigner = task.assignedBy.toString() === req.user.id;
    const isAdminOrManager = req.user.role === 'admin' || req.user.role === 'manager';
    
    // Only assigned user can update status
    // Admin/manager or assigner can update all fields
    if (
      (!isAssignedUser && !isAssigner && !isAdminOrManager) ||
      (isAssignedUser && !isAssigner && !isAdminOrManager && Object.keys(req.body).some(key => key !== 'status'))
    ) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }
    
    // Build update object
    const updateFields = {};
    if (title) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (assignedTo && (isAssigner || isAdminOrManager)) updateFields.assignedTo = assignedTo;
    if (dueDate) updateFields.dueDate = dueDate;
    if (status) updateFields.status = status;
    if (priority) updateFields.priority = priority;
    
    // Update task
    task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    )
      .populate('assignedTo', 'name email avatar')
      .populate('assignedBy', 'name email avatar');
    
    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete task
 * @route DELETE /api/tasks/:id
 * @access Private (Admin/Manager/Assigner)
 */
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if user is authorized to delete this task
    const isAssigner = task.assignedBy.toString() === req.user.id;
    const isAdminOrManager = req.user.role === 'admin' || req.user.role === 'manager';
    
    if (!isAssigner && !isAdminOrManager) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }
    
    await Task.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getMyTasks,
  getTaskById,
  updateTask,
  deleteTask
};