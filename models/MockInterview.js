const mongoose = require('mongoose');

const mockInterviewSchema = new mongoose.Schema({
  email: { type: String, required: true },
  duration: { type: Number, required: true },
  topics: [{ type: String }],
  dates: [{ type: String }],
  cost: { type: Number },
  status: { type: String, default: 'In Progress' },
  mock_date: { type: String },
  mock_time: { type: String },
  mentor_email: { type: String },
  student_score: { type: Number },
  mentor_score: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('MockInterview', mockInterviewSchema); 