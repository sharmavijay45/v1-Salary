import express from 'express';
import { migrateUsers, syncUser, getUserFromSource } from '../utils/userMigration.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * Migrate all users from source database
 * POST /api/migration/migrate-users
 */
router.post('/migrate-users', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { forceUpdate = false } = req.body;
    
    console.log('Starting user migration process...');
    const result = await migrateUsers(forceUpdate);
    
    res.json({
      success: true,
      message: 'User migration completed',
      result
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

/**
 * Sync specific user from source database
 * POST /api/migration/sync-user
 */
router.post('/sync-user', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const result = await syncUser(email);
    
    res.json({
      success: true,
      message: `User ${result.action} successfully`,
      result
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'User sync failed',
      error: error.message
    });
  }
});

/**
 * Get user details from source database
 * GET /api/migration/source-user/:email
 */
router.get('/source-user/:email', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { email } = req.params;
    const user = await getUserFromSource(email);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found in source database' });
    }
    
    res.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        department: user.department,
        role: user.role,
        employeeId: user.employeeId,
        joiningDate: user.joiningDate,
        isActive: user.isActive,
        baseSalary: user.baseSalary
      }
    });
  } catch (error) {
    console.error('Source user fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user from source',
      error: error.message
    });
  }
});

export default router;
