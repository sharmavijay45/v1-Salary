import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  name: { type: String, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['government', 'company', 'festival', 'other'], 
    default: 'company' 
  },
  monthYear: { type: String, required: true }, // Format: YYYY-MM
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, required: true }, // Admin user ID
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries
holidaySchema.index({ monthYear: 1, date: 1 });
holidaySchema.index({ isActive: 1 });

export default mongoose.model('Holiday', holidaySchema);