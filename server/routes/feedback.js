import express from 'express';
import Feedback from '../models/Feedback.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Submit feedback
router.post('/', auth, async (req, res) => {
  try {
    const { message, type, attendanceId } = req.body;

    const feedback = new Feedback({
      userId: req.user.id,
      message,
      type: type || 'general',
      attendanceId,
      monthYear: new Date().toISOString().slice(0, 7) // YYYY-MM format
    });

    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        _id: feedback._id,
        message: feedback.message,
        type: feedback.type,
        status: feedback.status,
        createdAt: feedback.createdAt
      }
    });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback',
      error: err.message
    });
  }
});

// Get all feedbacks (admin) or user's own feedbacks
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    // If not admin, only show user's own feedback
    if (req.user.role !== 'admin') {
      query.userId = req.user.id;
    }

    const feedbacks = await Feedback.find(query)
      .populate('attendanceId', 'name monthYear')
      .sort({ createdAt: -1 });

    // Get user details for admin view
    if (req.user.role === 'admin') {
      const userIds = [...new Set(feedbacks.map(f => f.userId))];
      const users = await User.find({ _id: { $in: userIds } }, 'name email');
      const userMap = users.reduce((acc, user) => {
        acc[user._id] = user;
        return acc;
      }, {});

      const enrichedFeedbacks = feedbacks.map(feedback => ({
        ...feedback.toObject(),
        user: userMap[feedback.userId] || { name: 'Unknown User', email: 'N/A' }
      }));

      res.json(enrichedFeedbacks);
    } else {
      res.json(feedbacks);
    }
  } catch (err) {
    console.error('Get feedbacks error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedbacks',
      error: err.message
    });
  }
});

// Admin: Respond to feedback
router.put('/respond/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { adminResponse, status } = req.body;

    if (!adminResponse) {
      return res.status(400).json({ message: 'Admin response is required' });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    feedback.adminResponse = adminResponse;
    feedback.status = status || 'reviewed';
    feedback.respondedBy = req.user.id;
    feedback.respondedAt = new Date();
    feedback.updatedAt = new Date();

    await feedback.save();

    res.json({
      success: true,
      message: 'Response added successfully',
      feedback
    });
  } catch (err) {
    console.error('Feedback response error:', err);
    res.status(500).json({
      success: false,
      message: 'Error responding to feedback',
      error: err.message
    });
  }
});

// Admin: Update feedback status
router.put('/status/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { status } = req.body;

    if (!['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    feedback.status = status;
    feedback.updatedAt = new Date();

    if (status === 'resolved') {
      feedback.respondedBy = req.user.id;
      feedback.respondedAt = new Date();
    }

    await feedback.save();

    res.json({
      success: true,
      message: 'Status updated successfully',
      feedback
    });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: err.message
    });
  }
});

// Get feedback statistics (admin only)
router.get('/stats', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeStats = await Feedback.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalFeedbacks = await Feedback.countDocuments();

    res.json({
      success: true,
      stats: {
        total: totalFeedbacks,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        byType: typeStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
    });
  } catch (err) {
    console.error('Feedback stats error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback statistics',
      error: err.message
    });
  }
});

export default router;