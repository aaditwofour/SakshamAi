// models/Interview.js - Interview Session Schema
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: String,
  question: String,
  answer: String,
  language: { type: String, default: 'en' },
  score: { type: Number, default: 0 },
  relevance: { type: Number, default: 0 },
  completeness: { type: Number, default: 0 },
  keywords: { type: Number, default: 0 },
  feedback: String
});

const proctoringSchema = new mongoose.Schema({
  tabSwitches: { type: Number, default: 0 },
  faceAbsences: { type: Number, default: 0 },
  alerts: [{ type: String, timestamp: Date }],
  violations: [{ message: String, timestamp: Date }]
});

const interviewSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  jobRole: { type: String, required: true },
  status: { type: String, enum: ['in-progress', 'completed', 'abandoned'], default: 'in-progress' },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  duration: Number, // in seconds
  answers: [answerSchema],
  proctoring: proctoringSchema,
  overallScore: { type: Number, default: 0 },
  totalQuestions: Number,
  attemptedQuestions: { type: Number, default: 0 },
  evaluation: {
    totalScore: Number,
    percentage: Number,
    grade: String,
    strengths: [String],
    weaknesses: [String],
    suggestions: [String],
    sectionScores: {
      relevance: Number,
      completeness: Number,
      keywords: Number
    },
    summary: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);
