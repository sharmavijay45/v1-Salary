import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Reset database and migrate users with proper admin roles
async function resetAndMigrateUsers() {
  try {
    console.log('🚀 Starting database reset and user migration...');
    
    // Connect to source database
    console.log('📡 Connecting to source database...');
    const sourceConnection = mongoose.createConnection(process.env.GET_DETAIL_MONGO_URI, {
      dbName: 'blackhole_db',
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    // Connect to target database
    console.log('📡 Connecting to target database...');
    const targetConnection = mongoose.createConnection(process.env.MONGODB_URI, {
      dbName: 'salary_blackhole',
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    await sourceConnection.asPromise();
    await targetConnection.asPromise();
    console.log('✅ Database connections established');

    // Define source user schema (from existing users collection)
    const sourceUserSchema = new mongoose.Schema({
      email: String,
      password: String,
      name: String,
      username: String,
      department: String,
      role: String,
      employeeId: String,
      joiningDate: Date,
      isActive: { type: Boolean, default: true },
      baseSalary: { type: Number, default: 8000 },
      createdAt: Date,
      updatedAt: Date
    }, { collection: 'users' });

    const SourceUser = sourceConnection.model('SourceUser', sourceUserSchema);

    // Define target user schema
    const targetUserSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      name: { type: String, required: true },
      department: { type: String, required: true },
      role: { type: String, enum: ['user', 'admin'], default: 'user' },
      employeeId: { type: String, unique: true, sparse: true },
      joiningDate: { type: Date },
      isActive: { type: Boolean, default: true },
      baseSalary: { type: Number, default: 8000 },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, { collection: 'Users' });

    const TargetUser = targetConnection.model('TargetUser', targetUserSchema);

    // Step 1: Clear existing data from target database
    console.log('🗑️  Clearing existing data from target database...');
    
    // Drop all collections in target database
    const collections = await targetConnection.db.listCollections().toArray();
    for (const collection of collections) {
      console.log(`   Dropping collection: ${collection.name}`);
      await targetConnection.db.collection(collection.name).drop().catch(() => {
        console.log(`   Collection ${collection.name} doesn't exist or already dropped`);
      });
    }
    console.log('✅ Target database cleared');

    // Step 2: Fetch all users from source database
    console.log('📥 Fetching users from source database...');
    const sourceUsers = await SourceUser.find({}).lean();
    console.log(`   Found ${sourceUsers.length} users in source database`);

    if (sourceUsers.length === 0) {
      console.log('⚠️  No users found in source database');
      return;
    }

    // Step 3: Define admin users (you can modify this list)
    const adminEmails = [
      'admin@company.com',
      'blackholeinfiverse45@gmail.com',
      'admin@blackhole.com',
      'superadmin@company.com'
    ];

    console.log('👑 Admin emails configured:', adminEmails);

    // Step 4: Migrate users with proper roles
    console.log('🔄 Starting user migration...');
    let migratedCount = 0;
    let adminCount = 0;
    let userCount = 0;
    const errors = [];

    for (const sourceUser of sourceUsers) {
      try {
        // Determine if user should be admin
        const isAdmin = adminEmails.includes(sourceUser.email?.toLowerCase()) || 
                       sourceUser.role === 'admin' ||
                       sourceUser.email?.toLowerCase().includes('admin');

        const userData = {
          email: sourceUser.email,
          password: sourceUser.password, // Keep existing password hash
          name: sourceUser.name || sourceUser.username || 'Unknown User',
          department: sourceUser.department || 'General',
          role: isAdmin ? 'admin' : 'user',
          employeeId: sourceUser.employeeId || sourceUser._id.toString(),
          joiningDate: sourceUser.joiningDate || sourceUser.createdAt || new Date(),
          isActive: sourceUser.isActive !== false,
          baseSalary: sourceUser.baseSalary || 8000,
          createdAt: sourceUser.createdAt || new Date(),
          updatedAt: new Date()
        };

        // Create new user
        const newUser = new TargetUser(userData);
        await newUser.save();

        migratedCount++;
        if (isAdmin) {
          adminCount++;
          console.log(`   ✅ Admin user migrated: ${userData.email} (${userData.name})`);
        } else {
          userCount++;
          console.log(`   ✅ User migrated: ${userData.email} (${userData.name})`);
        }

      } catch (error) {
        console.error(`   ❌ Error migrating user ${sourceUser.email}:`, error.message);
        errors.push({ email: sourceUser.email, error: error.message });
      }
    }

    // Step 5: Create a default admin if no admin exists
    if (adminCount === 0) {
      console.log('🔧 No admin users found, creating default admin...');
      try {
        const defaultAdmin = new TargetUser({
          email: 'admin@company.com',
          password: 'admin123', // You should change this password
          name: 'System Administrator',
          department: 'Administration',
          role: 'admin',
          employeeId: 'ADMIN001',
          isActive: true,
          baseSalary: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await defaultAdmin.save();
        adminCount++;
        migratedCount++;
        console.log('   ✅ Default admin created: admin@company.com (password: admin123)');
      } catch (error) {
        console.error('   ❌ Error creating default admin:', error.message);
      }
    }

    // Step 6: Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   Total users migrated: ${migratedCount}`);
    console.log(`   Admin users: ${adminCount}`);
    console.log(`   Regular users: ${userCount}`);
    console.log(`   Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Migration Errors:');
      errors.forEach(error => {
        console.log(`   ${error.email}: ${error.error}`);
      });
    }

    // Step 7: Verify admin users
    console.log('\n👑 Admin Users in System:');
    const adminUsers = await TargetUser.find({ role: 'admin' }).lean();
    adminUsers.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.name}) - Department: ${admin.department}`);
    });

    console.log('\n✅ Database reset and migration completed successfully!');
    console.log('\n🔑 Login Instructions:');
    console.log('   - Use your existing email and password to login');
    console.log('   - Admin users will have access to admin dashboard');
    console.log('   - Regular users will have access to user dashboard');
    
    if (adminCount > 0) {
      console.log('\n⚠️  Important: Please change default admin passwords after first login!');
    }

    // Close connections
    await sourceConnection.close();
    await targetConnection.close();
    console.log('📡 Database connections closed');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
resetAndMigrateUsers()
  .then(() => {
    console.log('🎉 Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  });
