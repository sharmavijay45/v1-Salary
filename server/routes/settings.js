import express from 'express';
import mongoose from 'mongoose';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get current settings
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update settings
router.put('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const updates = req.body;
    const settings = await Settings.updateSettings(updates, req.user.id);
    
    res.json({ 
      message: 'Settings updated successfully', 
      settings 
    });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Reset settings to default
router.post('/reset', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Delete existing settings to trigger default creation
    await Settings.deleteMany({});
    const settings = await Settings.getSettings();
    settings.lastUpdatedBy = req.user.id;
    await settings.save();
    
    res.json({ 
      message: 'Settings reset to default values', 
      settings 
    });
  } catch (err) {
    console.error('Reset settings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system statistics
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    
    // Get database size (approximate)
    const collections = await mongoose.connection.db.listCollections().toArray();
    const stats = await Promise.all(
      collections.map(async (collection) => {
        const collStats = await mongoose.connection.db.collection(collection.name).stats();
        return {
          name: collection.name,
          documents: collStats.count,
          size: collStats.size
        };
      })
    );

    const totalSize = stats.reduce((sum, stat) => sum + stat.size, 0);
    const totalDocuments = stats.reduce((sum, stat) => sum + stat.documents, 0);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        inactive: totalUsers - activeUsers
      },
      database: {
        collections: stats,
        totalSize: totalSize,
        totalDocuments: totalDocuments,
        sizeFormatted: formatBytes(totalSize)
      },
      system: {
        nodeVersion: process.version,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        platform: process.platform
      }
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Backup settings
router.post('/backup', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const settings = await Settings.getSettings();
    const backup = {
      settings: settings.toObject(),
      timestamp: new Date(),
      version: settings.version,
      createdBy: req.user.id
    };

    // In a real application, you would save this to a file or cloud storage
    res.json({
      message: 'Settings backup created successfully',
      backup: backup,
      downloadUrl: `/api/settings/download-backup/${Date.now()}`
    });
  } catch (err) {
    console.error('Backup settings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Restore settings from backup
router.post('/restore', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { backup } = req.body;
    if (!backup || !backup.settings) {
      return res.status(400).json({ message: 'Invalid backup data' });
    }

    const settings = await Settings.updateSettings(backup.settings, req.user.id);
    
    res.json({
      message: 'Settings restored successfully from backup',
      settings
    });
  } catch (err) {
    console.error('Restore settings error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user salary settings
router.put('/user-salary/:userId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userId } = req.params;
    const { baseSalary, dailyWage } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (baseSalary !== undefined) user.baseSalary = baseSalary;
    if (dailyWage !== undefined) user.dailyWage = dailyWage;
    
    await user.save();

    res.json({
      message: 'User salary settings updated successfully',
      user: {
        id: user._id,
        name: user.name,
        baseSalary: user.baseSalary,
        dailyWage: user.dailyWage
      }
    });
  } catch (err) {
    console.error('Update user salary error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk update user salaries
router.put('/bulk-salary-update', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { updates } = req.body; // Array of {userId, baseSalary, dailyWage}
    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: 'Updates must be an array' });
    }

    const results = [];
    for (const update of updates) {
      try {
        const user = await User.findById(update.userId);
        if (user) {
          if (update.baseSalary !== undefined) user.baseSalary = update.baseSalary;
          if (update.dailyWage !== undefined) user.dailyWage = update.dailyWage;
          await user.save();
          results.push({ userId: update.userId, status: 'success' });
        } else {
          results.push({ userId: update.userId, status: 'not_found' });
        }
      } catch (error) {
        results.push({ userId: update.userId, status: 'error', error: error.message });
      }
    }

    res.json({
      message: 'Bulk salary update completed',
      results,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status !== 'success').length
    });
  } catch (err) {
    console.error('Bulk salary update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default router;