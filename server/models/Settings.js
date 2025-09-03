import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Salary Configuration
  defaultDailyWage: {
    type: Number,
    default: 258,
    min: 0
  },
  defaultBaseSalary: {
    type: Number,
    default: 8000,
    min: 0
  },
  maxWorkingDays: {
    type: Number,
    default: 26,
    min: 1,
    max: 31
  },
  
  // Working Hours Configuration
  standardWorkingHours: {
    type: Number,
    default: 8,
    min: 1,
    max: 24
  },
  overtimeMultiplier: {
    type: Number,
    default: 1.5,
    min: 1
  },
  
  // Attendance Configuration
  lateArrivalThreshold: {
    type: Number,
    default: 15, // minutes
    min: 0
  },
  earlyDepartureThreshold: {
    type: Number,
    default: 15, // minutes
    min: 0
  },
  minimumWorkingHours: {
    type: Number,
    default: 4,
    min: 1,
    max: 12
  },
  
  // Leave Configuration
  casualLeavePerMonth: {
    type: Number,
    default: 2,
    min: 0
  },
  sickLeavePerMonth: {
    type: Number,
    default: 1,
    min: 0
  },
  
  // Calculation Methods
  salaryCalculationMethod: {
    type: String,
    enum: ['daily_wage', 'proportional', 'hybrid'],
    default: 'daily_wage'
  },
  
  // Deduction Configuration
  lateDeductionPercentage: {
    type: Number,
    default: 0.5, // 0.5% per late arrival
    min: 0,
    max: 100
  },
  absentDeductionPercentage: {
    type: Number,
    default: 100, // 100% deduction for absent days
    min: 0,
    max: 100
  },
  
  // Bonus Configuration
  attendanceBonusThreshold: {
    type: Number,
    default: 95, // 95% attendance for bonus
    min: 0,
    max: 100
  },
  attendanceBonusAmount: {
    type: Number,
    default: 500,
    min: 0
  },
  
  // System Configuration
  autoExposeAfterDays: {
    type: Number,
    default: 3, // Auto-expose salary after 3 days
    min: 0
  },
  enableEmailNotifications: {
    type: Boolean,
    default: true
  },
  enableSMSNotifications: {
    type: Boolean,
    default: false
  },
  
  // Company Information
  companyName: {
    type: String,
    default: 'Your Company Name'
  },
  companyAddress: {
    type: String,
    default: ''
  },
  companyPhone: {
    type: String,
    default: ''
  },
  companyEmail: {
    type: String,
    default: ''
  },
  
  // Financial Year
  financialYearStart: {
    type: String,
    default: 'April', // April to March
    enum: ['January', 'April', 'July', 'October']
  },
  
  // Currency Settings
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  currencySymbol: {
    type: String,
    default: '₹'
  },
  
  // Backup Configuration
  autoBackupEnabled: {
    type: Boolean,
    default: true
  },
  backupFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  },
  
  // Security Settings
  sessionTimeout: {
    type: Number,
    default: 480, // 8 hours in minutes
    min: 30
  },
  passwordExpiryDays: {
    type: Number,
    default: 90,
    min: 0
  },
  maxLoginAttempts: {
    type: Number,
    default: 5,
    min: 1
  },
  
  // Report Settings
  defaultReportFormat: {
    type: String,
    enum: ['csv', 'excel', 'pdf'],
    default: 'excel'
  },
  includeChartsInReports: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: String,
    default: '1.0.0'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

settingsSchema.statics.updateSettings = async function(updates, userId) {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create(updates);
  } else {
    Object.assign(settings, updates);
    settings.lastUpdatedBy = userId;
    await settings.save();
  }
  return settings;
};

export default mongoose.model('Settings', settingsSchema);