const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  Name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  ispremium: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema); 