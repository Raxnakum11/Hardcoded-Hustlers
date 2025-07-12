const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Notification = require('../models/Notification');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Admin
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalQuestions = await Question.countDocuments({ isDeleted: false });
    const totalAnswers = await Answer.countDocuments({ isDeleted: false });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('username email role createdAt');

    const recentQuestions = await Question.find({ isDeleted: false })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title author createdAt');

    res.json({
      stats: {
        totalUsers,
        totalQuestions,
        totalAnswers,
        bannedUsers
      },
      recentUsers,
      recentQuestions
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filters
// @access  Admin
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const role = req.query.role;
    const banned = req.query.banned;

    const query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (banned !== undefined) {
      query.isBanned = banned === 'true';
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id/ban
// @desc    Ban or unban a user
// @access  Admin
router.put('/users/:id/ban', adminAuth, [
  body('isBanned').isBoolean().withMessage('isBanned must be a boolean'),
  body('banReason').optional().isString().withMessage('Ban reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { isBanned, banReason } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot ban admin users' });
    }

    user.isBanned = isBanned;
    user.banReason = isBanned ? (banReason || 'Violation of platform policies') : '';

    await user.save();

    res.json({
      message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Change user role
// @access  Admin
router.put('/users/:id/role', adminAuth, [
  body('role').isIn(['user', 'admin']).withMessage('Role must be user or admin')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'User role updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user (admin only)
// @access  Admin
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin users' });
    }

    // Soft delete user's content
    await Question.updateMany(
      { author: user._id },
      { isDeleted: true }
    );

    await Answer.updateMany(
      { author: user._id },
      { isDeleted: true }
    );

    // Delete user's notifications
    await Notification.deleteMany({
      $or: [
        { recipient: user._id },
        { sender: user._id }
      ]
    });

    // Delete the user
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/questions
// @desc    Get all questions for moderation
// @access  Admin
router.get('/questions', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const status = req.query.status; // all, deleted, active

    const query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (status === 'deleted') {
      query.isDeleted = true;
    } else if (status === 'active') {
      query.isDeleted = false;
    }

    const questions = await Question.find(query)
      .populate('author', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Question.countDocuments(query);

    res.json({
      questions,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get questions for moderation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/questions/:id/restore
// @desc    Restore a deleted question
// @access  Admin
router.put('/questions/:id/restore', adminAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    question.isDeleted = false;
    await question.save();

    res.json({
      message: 'Question restored successfully',
      question
    });
  } catch (error) {
    console.error('Restore question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/notifications/broadcast
// @desc    Send platform-wide notification
// @access  Admin
router.post('/notifications/broadcast', adminAuth, [
  body('title').isLength({ min: 1, max: 100 }).withMessage('Title is required and must be less than 100 characters'),
  body('message').isLength({ min: 1, max: 500 }).withMessage('Message is required and must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, message } = req.body;

    // Get all users
    const users = await User.find({ isBanned: false });

    // Create notifications for all users
    const notifications = users.map(user => ({
      recipient: user._id,
      sender: req.user._id,
      type: 'admin',
      title,
      message
    }));

    await Notification.insertMany(notifications);

    // Send real-time notifications
    const io = req.app.get('io');
    users.forEach(user => {
      io.to(user._id.toString()).emit('notification', {
        type: 'admin',
        message: title
      });
    });

    res.json({
      message: `Broadcast notification sent to ${users.length} users`
    });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/reports
// @desc    Get platform reports and statistics
// @access  Admin
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const reportType = req.query.type || 'general';

    let report = {};

    switch (reportType) {
      case 'user-activity':
        const userStats = await User.aggregate([
          {
            $group: {
              _id: null,
              totalUsers: { $sum: 1 },
              activeUsers: { $sum: { $cond: [{ $eq: ['$isBanned', false] }, 1, 0] } },
              bannedUsers: { $sum: { $cond: [{ $eq: ['$isBanned', true] }, 1, 0] } },
              avgReputation: { $avg: '$reputation' }
            }
          }
        ]);

        const recentRegistrations = await User.aggregate([
          { $match: { isBanned: false } },
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $project: {
              username: 1,
              email: 1,
              createdAt: 1,
              reputation: 1
            }
          }
        ]);

        report = {
          stats: userStats[0] || {},
          recentRegistrations
        };
        break;

      case 'content-stats':
        const contentStats = await Promise.all([
          Question.countDocuments({ isDeleted: false }),
          Answer.countDocuments({ isDeleted: false }),
          Question.countDocuments({ isDeleted: false, answers: { $size: 0 } }),
          Question.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: null, avgViews: { $avg: '$views' } } }
          ])
        ]);

        const popularTags = await Question.aggregate([
          { $match: { isDeleted: false } },
          { $unwind: '$tags' },
          {
            $group: {
              _id: '$tags',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]);

        report = {
          totalQuestions: contentStats[0],
          totalAnswers: contentStats[1],
          unansweredQuestions: contentStats[2],
          avgViews: contentStats[3][0]?.avgViews || 0,
          popularTags
        };
        break;

      default: // general
        const generalStats = await Promise.all([
          User.countDocuments(),
          User.countDocuments({ isBanned: true }),
          Question.countDocuments({ isDeleted: false }),
          Answer.countDocuments({ isDeleted: false }),
          Notification.countDocuments({ isRead: false })
        ]);

        report = {
          totalUsers: generalStats[0],
          bannedUsers: generalStats[1],
          totalQuestions: generalStats[2],
          totalAnswers: generalStats[3],
          unreadNotifications: generalStats[4]
        };
    }

    res.json({ report });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 