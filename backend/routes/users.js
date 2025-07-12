const express = require('express');
const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/:id
// @desc    Get user profile by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isBanned) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: user.getPublicProfile() });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id/questions
// @desc    Get questions by user
// @access  Public
router.get('/:id/questions', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const user = await User.findById(req.params.id);
    if (!user || user.isBanned) {
      return res.status(404).json({ message: 'User not found' });
    }

    const questions = await Question.find({
      author: req.params.id,
      isDeleted: false
    })
      .populate('author', 'username avatar reputation')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Question.countDocuments({
      author: req.params.id,
      isDeleted: false
    });

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
    console.error('Get user questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id/answers
// @desc    Get answers by user
// @access  Public
router.get('/:id/answers', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const user = await User.findById(req.params.id);
    if (!user || user.isBanned) {
      return res.status(404).json({ message: 'User not found' });
    }

    const answers = await Answer.find({
      author: req.params.id,
      isDeleted: false
    })
      .populate('author', 'username avatar reputation')
      .populate('question', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Answer.countDocuments({
      author: req.params.id,
      isDeleted: false
    });

    res.json({
      answers,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user answers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/:id/activity
// @desc    Get user activity summary
// @access  Public
router.get('/:id/activity', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.isBanned) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [questions, answers, acceptedAnswers] = await Promise.all([
      Question.countDocuments({ author: req.params.id, isDeleted: false }),
      Answer.countDocuments({ author: req.params.id, isDeleted: false }),
      Answer.countDocuments({ author: req.params.id, isAccepted: true, isDeleted: false })
    ]);

    const recentQuestions = await Question.find({
      author: req.params.id,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt voteCount');

    const recentAnswers = await Answer.find({
      author: req.params.id,
      isDeleted: false
    })
      .populate('question', 'title')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('content question createdAt voteCount isAccepted');

    res.json({
      activity: {
        questions,
        answers,
        acceptedAnswers,
        reputation: user.reputation
      },
      recentQuestions,
      recentAnswers
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/search
// @desc    Search users
// @access  Public
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q: query, page = 1, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchQuery = {
      $and: [
        { isBanned: false },
        {
          $or: [
            { username: { $regex: query.trim(), $options: 'i' } },
            { email: { $regex: query.trim(), $options: 'i' } }
          ]
        }
      ]
    };

    const users = await User.find(searchQuery)
      .select('username avatar reputation questionsCount answersCount acceptedAnswersCount')
      .sort({ reputation: -1, username: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(searchQuery);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/leaderboard
// @desc    Get user leaderboard
// @access  Public
router.get('/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { type = 'reputation', limit = 10 } = req.query;

    let sortField = 'reputation';
    let sortOrder = -1;

    switch (type) {
      case 'questions':
        sortField = 'questionsCount';
        break;
      case 'answers':
        sortField = 'answersCount';
        break;
      case 'accepted':
        sortField = 'acceptedAnswersCount';
        break;
      default:
        sortField = 'reputation';
    }

    const users = await User.find({ isBanned: false })
      .select('username avatar reputation questionsCount answersCount acceptedAnswersCount')
      .sort({ [sortField]: sortOrder, username: 1 })
      .limit(parseInt(limit));

    res.json({ users });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 