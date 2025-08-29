import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Direct migration script to avoid timeout issues
async function migrateUsersDirectly() {
  try {
    console.log('Starting direct user migration...');

    // Connect to source database
    console.log('Connecting to source database...');
    const sourceConnection = mongoose.createConnection(process.env.GET_DETAIL_MONGO_URI, {
      dbName: 'blackhole_db',
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    // Connect to target database
    console.log('Connecting to target database...');
    const targetConnection = mongoose.createConnection(process.env.MONGODB_URI, {
      dbName: 'salary_blackhole',
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    // Wait for connections
    await new Promise((resolve, reject) => {
      let connectionsReady = 0;
      
      sourceConnection.on('connected', () => {
        console.log('Source database connected');
        connectionsReady++;
        if (connectionsReady === 2) resolve();
      });
      
      targetConnection.on('connected', () => {
        console.log('Target database connected');
        connectionsReady++;
        if (connectionsReady === 2) resolve();
      });
      
      sourceConnection.on('error', reject);
      targetConnection.on('error', reject);
    });

    // Define schemas
    const sourceUserSchema = new mongoose.Schema({}, { collection: 'users', strict: false });
    const SourceUser = sourceConnection.model('SourceUser', sourceUserSchema);

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

    // Get all users from source
    console.log('Fetching users from source database...');
    const sourceUsers = await SourceUser.find({}).lean();
    console.log(`Found ${sourceUsers.length} users in source database`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process users in batches
    const batchSize = 10;
    for (let i = 0; i < sourceUsers.length; i += batchSize) {
      const batch = sourceUsers.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(sourceUsers.length/batchSize)}`);
      
      for (const sourceUser of batch) {
        try {
          if (!sourceUser.email || !sourceUser.password) {
            console.log(`Skipping user without email/password: ${sourceUser.name || sourceUser.username || 'Unknown'}`);
            skipped++;
            continue;
          }

          // Check if user already exists
          const existingUser = await TargetUser.findOne({ email: sourceUser.email });
          
          const userData = {
            email: sourceUser.email,
            password: sourceUser.password, // Keep existing hash
            name: sourceUser.name || sourceUser.username || 'Unknown User',
            department: sourceUser.department || 'General',
            role: sourceUser.role === 'admin' ? 'admin' : 'user',
            employeeId: sourceUser.employeeId || sourceUser._id.toString(),
            joiningDate: sourceUser.joiningDate || sourceUser.createdAt || new Date(),
            isActive: sourceUser.isActive !== false,
            baseSalary: sourceUser.baseSalary || 8000,
            createdAt: sourceUser.createdAt || new Date(),
            updatedAt: new Date()
          };

          if (existingUser) {
            await TargetUser.updateOne({ email: sourceUser.email }, userData);
            updated++;
            console.log(`Updated user: ${sourceUser.email}`);
          } else {
            await TargetUser.create(userData);
            created++;
            console.log(`Created user: ${sourceUser.email}`);
          }
        } catch (error) {
          console.error(`Error processing user ${sourceUser.email}:`, error.message);
          errors++;
        }
      }
    }

    console.log('\nMigration completed!');
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    // Close connections
    await sourceConnection.close();
    await targetConnection.close();
    
    return { created, updated, skipped, errors };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateUsersDirectly()
  .then(result => {
    console.log('Migration successful:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
