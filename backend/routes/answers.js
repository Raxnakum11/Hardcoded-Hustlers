const express = require('express');
const { body, validationResult } = require('express-validator');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

const ADMIN_EMAIL = 'parikhhet91@gmail.com';

// @route   POST /api/answers
// @desc    Post an answer to a question
// @access  Private
router.post('/', auth, [
  body('content')
    .isLength({ min: 20 })
    .withMessage('Answer must be at least 20 characters long'),
  body('questionId')
    .isMongoId()
    .withMessage('Valid question ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, questionId } = req.body;

    // Check if question exists and is not deleted
    const question = await Question.findById(questionId);
    if (!question || question.isDeleted) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if question is closed
    if (question.isClosed) {
      return res.status(400).json({ message: 'Cannot answer a closed question' });
    }

    // Check if user already answered this question
    const existingAnswer = await Answer.findOne({
      question: questionId,
      author: req.user._id,
      isDeleted: false
    });

    if (existingAnswer) {
      return res.status(400).json({ message: 'You have already answered this question' });
    }

    const answer = new Answer({
      content,
      author: req.user._id,
      question: questionId
    });

    await answer.save();

    // Add answer to question
    question.answers.push(answer._id);
    await question.save();

    // Update user's answer count
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { answersCount: 1 }
    });

    // Create notification for question author
    if (!question.author.equals(req.user._id)) {
      await Notification.create({
        recipient: question.author,
        sender: req.user._id,
        type: 'answer',
        title: 'New answer to your question',
        message: `${req.user.username} answered your question: "${question.title}"`,
        question: questionId,
        answer: answer._id
      });

      // Send real-time notification
      const io = req.app.get('io');
      io.to(question.author.toString()).emit('notification', {
        type: 'answer',
        message: `${req.user.username} answered your question`
      });
    }

    // Populate author info
    await answer.populate('author', 'username avatar reputation');

    res.status(201).json({
      message: 'Answer posted successfully',
      answer
    });
  } catch (error) {
    console.error('Post answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/answers/:id
// @desc    Update an answer
// @access  Private (author only)
router.put('/:id', auth, [
  body('content')
    .isLength({ min: 20 })
    .withMessage('Answer must be at least 20 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const answer = await Answer.findById(req.params.id);
    
    if (!answer || answer.isDeleted) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (!answer.author.equals(req.user._id) && req.user.role !== 'admin' && req.user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Not authorized to edit this answer' });
    }

    answer.content = req.body.content;
    await answer.save();

    await answer.populate('author', 'username avatar reputation');

    res.json({
      message: 'Answer updated successfully',
      answer
    });
  } catch (error) {
    console.error('Update answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/answers/:id
// @desc    Delete an answer (soft delete)
// @access  Private (author or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    
    if (!answer || answer.isDeleted) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (!answer.author.equals(req.user._id) && req.user.role !== 'admin' && req.user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Not authorized to delete this answer' });
    }

    answer.isDeleted = true;
    await answer.save();

    // Remove answer from question
    await Question.findByIdAndUpdate(answer.question, {
      $pull: { answers: answer._id }
    });

    // Update user's answer count
    await User.findByIdAndUpdate(answer.author, {
      $inc: { answersCount: -1 }
    });

    res.json({ message: 'Answer deleted successfully' });
  } catch (error) {
    console.error('Delete answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/answers/:id/vote
// @desc    Vote on an answer
// @access  Private
router.post('/:id/vote', auth, [
  body('voteType').isIn(['upvote', 'downvote', 'remove']).withMessage('Invalid vote type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const answer = await Answer.findById(req.params.id);
    
    if (!answer || answer.isDeleted) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (answer.author.equals(req.user._id)) {
      return res.status(400).json({ message: 'Cannot vote on your own answer' });
    }

    const { voteType } = req.body;

    if (voteType === 'remove') {
      answer.removeVote(req.user._id);
    } else {
      answer.addVote(req.user._id, voteType);
    }

    await answer.save();

    res.json({
      message: 'Vote updated successfully',
      voteCount: answer.voteCount
    });
  } catch (error) {
    console.error('Vote answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/answers/:id/accept
// @desc    Accept an answer (question owner only)
// @access  Private
router.post('/:id/accept', auth, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    
    if (!answer || answer.isDeleted) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    const question = await Question.findById(answer.question);
    
    if (!question || question.isDeleted) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (!question.author.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the question owner can accept answers' });
    }

    // Unaccept previously accepted answer if any
    if (question.acceptedAnswer) {
      const prevAccepted = await Answer.findById(question.acceptedAnswer);
      if (prevAccepted) {
        prevAccepted.isAccepted = false;
        await prevAccepted.save();
      }
    }

    // Accept the new answer
    answer.isAccepted = true;
    await answer.save();

    question.acceptedAnswer = answer._id;
    await question.save();

    // Update user's accepted answers count
    await User.findByIdAndUpdate(answer.author, {
      $inc: { acceptedAnswersCount: 1 }
    });

    // Create notification for answer author
    if (!answer.author.equals(req.user._id)) {
      await Notification.create({
        recipient: answer.author,
        sender: req.user._id,
        type: 'accept',
        title: 'Your answer was accepted',
        message: `${req.user.username} accepted your answer to: "${question.title}"`,
        question: question._id,
        answer: answer._id
      });

      // Send real-time notification
      const io = req.app.get('io');
      io.to(answer.author.toString()).emit('notification', {
        type: 'accept',
        message: `${req.user.username} accepted your answer`
      });
    }

    res.json({
      message: 'Answer accepted successfully',
      answer
    });
  } catch (error) {
    console.error('Accept answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/answers/:id/comments
// @desc    Add a comment to an answer
// @access  Private
router.post('/:id/comments', auth, [
  body('content')
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const answer = await Answer.findById(req.params.id);
    
    if (!answer || answer.isDeleted) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    const { content } = req.body;

    // Check for mentions (@username)
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);
    
    if (mentions) {
      for (const mention of mentions) {
        const username = mention.substring(1);
        const mentionedUser = await User.findOne({ username });
        
        if (mentionedUser && !mentionedUser._id.equals(req.user._id)) {
          await Notification.create({
            recipient: mentionedUser._id,
            sender: req.user._id,
            type: 'mention',
            title: 'You were mentioned in a comment',
            message: `${req.user.username} mentioned you in a comment: "${content}"`,
            question: answer.question,
            answer: answer._id
          });

          // Send real-time notification
          const io = req.app.get('io');
          io.to(mentionedUser._id.toString()).emit('notification', {
            type: 'mention',
            message: `${req.user.username} mentioned you in a comment`
          });
        }
      }
    }

    answer.addComment(content, req.user._id);
    await answer.save();

    // Create notification for answer author if commenter is not the author
    if (!answer.author.equals(req.user._id)) {
      await Notification.create({
        recipient: answer.author,
        sender: req.user._id,
        type: 'comment',
        title: 'New comment on your answer',
        message: `${req.user.username} commented on your answer`,
        question: answer.question,
        answer: answer._id
      });

      // Send real-time notification
      const io = req.app.get('io');
      io.to(answer.author.toString()).emit('notification', {
        type: 'comment',
        message: `${req.user.username} commented on your answer`
      });
    }

    await answer.populate('author', 'username avatar reputation');
    await answer.populate('comments.author', 'username avatar');

    res.json({
      message: 'Comment added successfully',
      answer
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 