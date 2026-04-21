const mongoose = require('mongoose');

const attendanceEntrySchema = new mongoose.Schema(
  {
    member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['PRESENT', 'ABSENT'], required: true },
    note: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const attendanceSessionSchema = new mongoose.Schema(
  {
    church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true, index: true },
    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD (local church day)
    entries: { type: [attendanceEntrySchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ church: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
