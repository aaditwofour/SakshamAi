// models/Resume.js - Resume Analysis Schema
const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: String,
  originalName: String,
  extractedText: String,
  targetRole: String,
  analysis: {
    score: { type: Number, default: 0 },
    grade: String,
    missingSkills: [String],
    presentSkills: [String],
    keywordOptimization: [String],
    roleSuggestions: [String],
    strengths: [String],
    improvements: [String],
    atsScore: Number,
    summary: String,
    sections: {
      skills: Number,
      experience: Number,
      education: Number,
      formatting: Number
    }
  },
  language: { type: String, default: 'en' },
  analyzedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);
