const express = require('express');
const { body, validationResult } = require('express-validator');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/questions
// @desc    Get all questions with pagination and filters
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || 'newest'; // newest, votes, views, unanswered
    const tag = req.query.tag;
    const search = req.query.search;

    const query = { isDeleted: false };

    // Add tag filter
    if (tag) {
      query.tags = { $in: [tag.toLowerCase()] };
    }

    // Add search filter
    if (search) {
      query.$text = { $search: search };
    }

    // Add unanswered filter
    if (sort === 'unanswered') {
      query.answers = { $size: 0 };
    }

    let sortOptions = {};
    switch (sort) {
      case 'votes':
        sortOptions = { voteCount: -1, createdAt: -1 };
        break;
      case 'views':
        sortOptions = { views: -1, createdAt: -1 };
        break;
      case 'unanswered':
        sortOptions = { createdAt: -1 };
        break;
      default: // newest
        sortOptions = { createdAt: -1 };
    }

    const questions = await Question.find(query)
      .populate('author', 'username avatar reputation')
      .populate('answers')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Add answer count and accepted answer info
    const questionsWithCounts = questions.map(q => ({
      ...q,
      answerCount: q.answers.length,
      hasAcceptedAnswer: q.acceptedAnswer !== null
    }));

    const total = await Question.countDocuments(query);

    res.json({
      questions: questionsWithCounts,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/questions/:id
// @desc    Get a specific question by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('author', 'username avatar reputation')
      .populate({
        path: 'answers',
        populate: {
          path: 'author',
          select: 'username avatar reputation'
        }
      })
      .populate('acceptedAnswer');

    if (!question || question.isDeleted) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Increment view count if user is authenticated
    if (req.user) {
      question.views += 1;
      await question.save();
    }

    res.json({ question });
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/questions
// @desc    Create a new question
// @access  Private
router.post('/', auth, [
  body('title')
    .isLength({ min: 10, max: 300 })
    .withMessage('Title must be between 10 and 300 characters'),
  body('description')
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters long'),
  body('tags')
    .isArray({ min: 1, max: 5 })
    .withMessage('Must provide 1-5 tags')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, tags } = req.body;

    // Clean and validate tags
    const cleanTags = tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 20)
      .slice(0, 5);

    if (cleanTags.length === 0) {
      return res.status(400).json({ message: 'At least one valid tag is required' });
    }

    const question = new Question({
      title,
      description,
      tags: cleanTags,
      author: req.user._id
    });

    await question.save();

    // Update user's question count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { questionsCount: 1 }
    });

    // Populate author info
    await question.populate('author', 'username avatar reputation');

    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/questions/:id
// @desc    Update a question
// @access  Private (author only)
router.put('/:id', auth, [
  body('title')
    .optional()
    .isLength({ min: 10, max: 300 })
    .withMessage('Title must be between 10 and 300 characters'),
  body('description')
    .optional()
    .isLength({ min: 20 })
    .withMessage('Description must be at least 20 characters long'),
  body('tags')
    .optional()
    .isArray({ min: 1, max: 5 })
    .withMessage('Must provide 1-5 tags')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const question = await Question.findById(req.params.id);
    
    if (!question || question.isDeleted) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (!question.author.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this question' });
    }

    const { title, description, tags } = req.body;

    if (title) question.title = title;
    if (description) question.description = description;
    
    if (tags) {
      const cleanTags = tags
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= 20)
        .slice(0, 5);

      if (cleanTags.length === 0) {
        return res.status(400).json({ message: 'At least one valid tag is required' });
      }
      question.tags = cleanTags;
    }

    await question.save();
    await question.populate('author', 'username avatar reputation');

    res.json({
      message: 'Question updated successfully',
      question
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/questions/:id
// @desc    Delete a question (soft delete)
// @access  Private (author or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question || question.isDeleted) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (!question.author.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this question' });
    }

    question.isDeleted = true;
    await question.save();

    // Update user's question count
    await User.findByIdAndUpdate(question.author, {
      $inc: { questionsCount: -1 }
    });

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/questions/:id/vote
// @desc    Vote on a question
// @access  Private
router.post('/:id/vote', auth, [
  body('voteType').isIn(['upvote', 'downvote', 'remove']).withMessage('Invalid vote type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const question = await Question.findById(req.params.id);
    
    if (!question || question.isDeleted) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.author.equals(req.user._id)) {
      return res.status(400).json({ message: 'Cannot vote on your own question' });
    }

    const { voteType } = req.body;

    if (voteType === 'remove') {
      question.removeVote(req.user._id);
    } else {
      question.addVote(req.user._id, voteType);
    }

    await question.save();

    res.json({
      message: 'Vote updated successfully',
      voteCount: question.voteCount
    });
  } catch (error) {
    console.error('Vote question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/questions/tags/popular
// @desc    Get popular tags
// @access  Public
router.get('/tags/popular', async (req, res) => {
  try {
    const tags = await Question.aggregate([
      { $match: { isDeleted: false } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({ tags });
  } catch (error) {
    console.error('Get popular tags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 