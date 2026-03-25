// routes/interview.js - Interview Routes
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Interview = require('../models/Interview');
const { evaluateInterview } = require('../services/huggingface');
const questions = require('../utils/questions.json');

const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

router.post('/stt-token', protect, async (req, res) => {
  try {
    const key = process.env.DEEPGRAM_KEY;
    if (!key) return res.status(500).json({ success: false, message: 'DEEPGRAM_KEY not set in server .env' });
    // Return the key as a temp token — Deepgram handles auth via query param in WS URL
    res.json({ success: true, token: key });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// GET /api/interview/questions/:role - Get questions for a job role
router.get('/questions/:role', protect, (req, res) => {
  try {
    const roleKey = req.params.role.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
    const roleQuestions = questions[roleKey];
    if (!roleQuestions) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    res.json({ success: true, questions: roleQuestions, total: roleQuestions.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/interview/start - Start a new interview session
router.post('/start', protect, async (req, res) => {
  try {
    const { jobRole } = req.body;
    if (!jobRole) return res.status(400).json({ success: false, message: 'Job role required' });

    const roleKey = jobRole.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
    const roleQuestions = questions[roleKey];
    if (!roleQuestions) return res.status(400).json({ success: false, message: 'Invalid job role' });

    const interview = await Interview.create({
      student: req.user._id,
      jobRole,
      status: 'in-progress',
      totalQuestions: roleQuestions.length,
      proctoring: { tabSwitches: 0, faceAbsences: 0, alerts: [], violations: [] }
    });

    res.status(201).json({ success: true, interviewId: interview._id, message: 'Interview started' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/interview/submit - Submit all answers and evaluate
router.post('/submit', protect, async (req, res) => {
  try {
    const { interviewId, answers, duration, proctoring } = req.body;

    const interview = await Interview.findOne({ _id: interviewId, student: req.user._id });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    // Evaluate answers using HuggingFace
    const { evaluatedAnswers, evaluation } = await evaluateInterview(answers, interview.jobRole);

    // Update interview record
    interview.answers = evaluatedAnswers;
    interview.evaluation = evaluation;
    interview.overallScore = evaluation.totalScore;
    interview.status = 'completed';
    interview.completedAt = new Date();
    interview.duration = duration;
    interview.attemptedQuestions = answers.filter(a => a.answer?.trim()).length;

    if (proctoring) {
      interview.proctoring = {
        tabSwitches: proctoring.tabSwitches || 0,
        faceAbsences: proctoring.faceAbsences || 0,
        violations: proctoring.violations || [],
        alerts: proctoring.alerts || []
      };
    }

    await interview.save();

    res.json({ success: true, interview, evaluation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/interview/proctoring - Log proctoring event
router.post('/proctoring', protect, async (req, res) => {
  try {
    const { interviewId, eventType, message } = req.body;
    const interview = await Interview.findOne({ _id: interviewId, student: req.user._id });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    if (!interview.proctoring) interview.proctoring = { tabSwitches: 0, faceAbsences: 0, alerts: [], violations: [] };

    if (eventType === 'tab_switch') interview.proctoring.tabSwitches += 1;
    if (eventType === 'face_absence') interview.proctoring.faceAbsences += 1;

    interview.proctoring.violations.push({ message, timestamp: new Date() });
    await interview.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/interview/history - Get student's interview history
router.get('/history', protect, async (req, res) => {
  try {
    const interviews = await Interview.find({ student: req.user._id })
      .sort({ createdAt: -1 })
      .select('-answers.answer');

    // Auto-mark as abandoned if left unsubmitted for 30+ minutes
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    for (const inv of interviews) {
      if (inv.status === 'in-progress' && inv.createdAt < thirtyMinsAgo) {
        inv.status = 'abandoned';
        await inv.save();
      }
    }

    res.json({ success: true, interviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/interview/:id - Get specific interview result
router.get('/:id', protect, async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, student: req.user._id })
      .populate('student', 'name email');
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });
    res.json({ success: true, interview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
