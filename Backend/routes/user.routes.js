const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  getTeamMembers
} = require('../controllers/user.controller');
const { authenticate, isManagerOrAdmin } = require('../middleware/auth.middleware');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin/Manager)
router.get('/', authenticate, isManagerOrAdmin, getAllUsers);

// @route   GET /api/users/team
// @desc    Get team members
// @access  Private (Admin/Manager)
router.get('/team', authenticate, isManagerOrAdmin, getTeamMembers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticate, getUserById);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', authenticate, updateUser);

// @route   PATCH /api/users/:id/status
// @desc    Update user status
// @access  Private
router.patch('/:id/status', authenticate, updateUserStatus);

module.exports = router;