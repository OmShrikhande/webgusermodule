const User = require('../models/user.model');

/**
 * Get all users
 * @route GET /api/users
 * @access Private (Admin/Manager)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @access Private
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user is requesting their own profile or is admin/manager
    if (
      req.user.id !== req.params.id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'manager'
    ) {
      return res.status(403).json({ message: 'Not authorized to view this profile' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user
 * @route PUT /api/users/:id
 * @access Private
 */
const updateUser = async (req, res) => {
  try {
    // Check if user is updating their own profile or is admin
    if (
      req.user.id !== req.params.id && 
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }
    
    const { name, avatar, status } = req.body;
    
    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (avatar) updateFields.avatar = avatar;
    if (status) updateFields.status = status;
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user status
 * @route PATCH /api/users/:id/status
 * @access Private
 */
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    // Check if user is updating their own status or is admin/manager
    if (
      req.user.id !== req.params.id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'manager'
    ) {
      return res.status(403).json({ message: 'Not authorized to update this status' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get team members (for managers and admins)
 * @route GET /api/users/team
 * @access Private (Admin/Manager)
 */
const getTeamMembers = async (req, res) => {
  try {
    // If user is not admin or manager, return error
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Not authorized to view team members' });
    }
    
    const users = await User.find({ 
      _id: { $ne: req.user.id } // Exclude current user
    }).select('-password');
    
    res.json(users);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  getTeamMembers
};