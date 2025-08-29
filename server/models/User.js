import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  employeeId: { type: String, unique: true, sparse: true },
  joiningDate: { type: Date },
  isActive: { type: Boolean, default: true },
  
  // Enhanced salary configuration
  baseSalary: { type: Number, default: 8000 },
  salaryType: { 
    type: String, 
    enum: ['fixed', 'daily_wage', 'hourly'], 
    default: 'daily_wage' 
  },
  dailyWage: { type: Number, default: 258 },
  hourlyRate: { type: Number, default: 32.25 }, // 258/8 hours
  
  // Working preferences
  expectedWorkingHours: { type: Number, default: 8 }, // Expected hours per day
  workingDaysPerWeek: { type: Number, default: 6 }, // Monday to Saturday
  
  // Salary calculation preferences
  salaryCalculationMethod: {
    type: String,
    enum: ['proportional', 'daily_wage', 'performance_based'],
    default: 'daily_wage'
  },
  
  // Additional employee details
  position: { type: String },
  location: { type: String },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Contract details
  contractType: {
    type: String,
    enum: ['permanent', 'contract', 'intern', 'temporary'],
    default: 'permanent'
  },
  
  // Override settings for special cases
  overrideSettings: {
    customWorkingDays: { type: Number }, // Override monthly working days
    fixedSalary: { type: Number }, // Override calculated salary
    salaryFreeze: { type: Boolean, default: false }, // Freeze salary changes
    specialRates: {
      overtimeRate: { type: Number },
      holidayRate: { type: Number },
      nightShiftRate: { type: Number }
    }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Use the existing Users collection from your MongoDB
export default mongoose.model('User', userSchema, 'Users');