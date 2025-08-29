import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Create a separate connection for the source database with better timeout settings
const sourceConnection = mongoose.createConnection(process.env.GET_DETAIL_MONGO_URI, {
  dbName: 'blackhole_db',
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10
});

// Define the source user schema (from existing users collection - lowercase)
const sourceUserSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  username: String, // Some users might have username instead of name
  department: String,
  role: { type: String, default: 'user' },
  employeeId: String,
  joiningDate: Date,
  isActive: { type: Boolean, default: true },
  baseSalary: { type: Number, default: 8000 },
  createdAt: Date,
  updatedAt: Date
}, { collection: 'users' }); // Use lowercase 'users' collection

const SourceUser = sourceConnection.model('SourceUser', sourceUserSchema);

/**
 * Migrate users from source database to target database
 * @param {boolean} forceUpdate - Whether to update existing users
 * @returns {Object} Migration result
 */
export const migrateUsers = async (forceUpdate = false) => {
  try {
    console.log('Starting user migration...');
    
    // Fetch all users from source database
    const sourceUsers = await SourceUser.find({ isActive: { $ne: false } });
    console.log(`Found ${sourceUsers.length} users in source database`);

    const migrationResults = {
      total: sourceUsers.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const sourceUser of sourceUsers) {
      try {
        // Check if user already exists in target database
        const existingUser = await User.findOne({ email: sourceUser.email });

        if (existingUser && !forceUpdate) {
          migrationResults.skipped++;
          continue;
        }

        const userData = {
          email: sourceUser.email,
          password: sourceUser.password,
          name: sourceUser.name || sourceUser.username || 'Unknown User',
          department: sourceUser.department || 'General',
          role: sourceUser.role || 'user',
          employeeId: sourceUser.employeeId || sourceUser._id.toString(),
          joiningDate: sourceUser.joiningDate || sourceUser.createdAt,
          isActive: sourceUser.isActive !== false,
          baseSalary: sourceUser.baseSalary || 8000,
          createdAt: sourceUser.createdAt || new Date(),
          updatedAt: new Date()
        };

        if (existingUser) {
          // Update existing user
          await User.findByIdAndUpdate(existingUser._id, userData);
          migrationResults.updated++;
          console.log(`Updated user: ${userData.email}`);
        } else {
          // Create new user
          const newUser = new User(userData);
          await newUser.save();
          migrationResults.created++;
          console.log(`Created user: ${userData.email}`);
        }
      } catch (error) {
        console.error(`Error migrating user ${sourceUser.email}:`, error.message);
        migrationResults.errors.push({
          email: sourceUser.email,
          error: error.message
        });
      }
    }

    console.log('Migration completed:', migrationResults);
    return migrationResults;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

/**
 * Get user details from source database
 * @param {string} email - User email
 * @returns {Object} User details
 */
export const getUserFromSource = async (email) => {
  try {
    const sourceUser = await SourceUser.findOne({ email, isActive: { $ne: false } });
    return sourceUser;
  } catch (error) {
    console.error('Error fetching user from source:', error);
    throw error;
  }
};

/**
 * Sync specific user from source to target database
 * @param {string} email - User email
 * @returns {Object} Sync result
 */
export const syncUser = async (email) => {
  try {
    const sourceUser = await getUserFromSource(email);
    if (!sourceUser) {
      throw new Error('User not found in source database');
    }

    const userData = {
      email: sourceUser.email,
      password: sourceUser.password,
      name: sourceUser.name || sourceUser.username || 'Unknown User',
      department: sourceUser.department || 'General',
      role: sourceUser.role || 'user',
      employeeId: sourceUser.employeeId || sourceUser._id.toString(),
      joiningDate: sourceUser.joiningDate || sourceUser.createdAt,
      isActive: sourceUser.isActive !== false,
      baseSalary: sourceUser.baseSalary || 8000,
      createdAt: sourceUser.createdAt || new Date(),
      updatedAt: new Date()
    };

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await User.findByIdAndUpdate(existingUser._id, userData);
      return { action: 'updated', user: userData };
    } else {
      const newUser = new User(userData);
      await newUser.save();
      return { action: 'created', user: userData };
    }
  } catch (error) {
    console.error('Error syncing user:', error);
    throw error;
  }
};

// Close source connection when process exits
process.on('SIGINT', () => {
  sourceConnection.close();
});

process.on('SIGTERM', () => {
  sourceConnection.close();
});
