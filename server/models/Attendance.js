import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  employeeId: { type: String, required: true },
  userName: { type: String }, // Store user name for better matching
  name: { type: String, required: true },
  dept: { type: String, required: true },
  daysPresent: { type: Number, required: true, default: 0 },
  hoursWorked: { type: Number, required: true, default: 0 },
  totalWorkingDays: { type: Number, required: true, default: 26 },
  workingDaysInMonth: { type: Number, default: 26 }, // Actual working days in month (excluding Sundays)
  expectedTotalHours: { type: Number, default: 208 }, // Expected total hours (26 days * 8 hours)
  avgHoursPerDay: { type: Number, default: 0 }, // Average hours worked per day
  avgHoursPerMonth: { type: Number, default: 0 }, // Total hours worked in month
  dailyWage: { type: Number, default: 258 }, // Daily wage rate
  baseSalary: { type: Number, required: true, default: 8000 }, // Legacy field for backward compatibility
  calculatedSalary: { type: Number, required: true },
  adjustedSalary: { type: Number, required: true },
  salaryPercentage: { type: Number, required: true },
  hoursPercentage: { type: Number, default: 0 }, // Percentage based on hours worked
  attendancePercentage: { type: Number, default: 0 }, // Attendance percentage based on working days
  attendanceDetails: [{
    date: { type: String },
    checkIn: { type: String },
    checkOut: { type: String },
    hoursWorked: { type: Number, default: 0 },
    status: { type: String, enum: ['Present', 'Absent', 'Half Day'], default: 'Absent' }
  }],
  monthYear: { type: String, required: true }, // Format: "2025-01"
  exposed: { type: Boolean, default: false },
  dataSource: { type: String, enum: ['pdf', 'excel', 'unknown'], default: 'unknown' }, // Track data source
  manualAttendanceSource: { type: String, enum: ['pdf', 'excel'], default: 'excel' }, // Track manual attendance source
  aiInsights: { type: String },
  // Working days related fields
  sundayAttendance: { type: Number, default: 0 }, // Number of Sundays marked as present
  validWorkingDays: { type: Number, default: 0 }, // Valid working days attendance (excluding Sundays)
  monthStatistics: {
    totalDays: { type: Number },
    workingDays: { type: Number },
    sundays: { type: Number },
    sundayDates: [{ type: String }],
    requiredWorkingDays: { type: Number }
  },
  validationWarnings: [{ type: String }], // Warnings about Sunday attendance, etc.
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
attendanceSchema.index({ userId: 1, monthYear: 1 }, { unique: true });
attendanceSchema.index({ exposed: 1 });

export default mongoose.model('Attendance', attendanceSchema);