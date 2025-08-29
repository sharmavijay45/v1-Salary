import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
  message: { type: String, required: true },
  type: { type: String, enum: ['salary_dispute', 'attendance_query', 'general'], default: 'general' },
  status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  adminResponse: { type: String },
  respondedBy: { type: String }, // Admin user ID
  respondedAt: { type: Date },
  monthYear: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Feedback', feedbackSchema);