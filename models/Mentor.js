const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema({
  Name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Mentor', mentorSchema); 