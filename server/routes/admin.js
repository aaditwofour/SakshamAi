// routes/admin.js - Admin Dashboard Routes
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Interview = require('../models/Interview');
const Resume = require('../models/Resume');

// All admin routes require authentication + admin role
router.use(protect, adminOnly);

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [totalStudents, totalInterviews, completedInterviews, totalResumes] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      Interview.countDocuments(),
      Interview.countDocuments({ status: 'completed' }),
      Resume.countDocuments()
    ]);

    // Average score across all interviews
    const scoreAgg = await Interview.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, avgScore: { $avg: '$overallScore' } } }
    ]);
    const avgScore = scoreAgg[0]?.avgScore ? Math.round(scoreAgg[0].avgScore) : 0;

    // Interviews by role
    const byRole = await Interview.aggregate([
      { $group: { _id: '$jobRole', count: { $sum: 1 }, avgScore: { $avg: '$overallScore' } } },
      { $sort: { count: -1 } }
    ]);

    // Interviews over time (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const daily = await Interview.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Score distribution
    const scoreDistribution = await Interview.aggregate([
      { $match: { status: 'completed' } },
      {
        $bucket: {
          groupBy: '$overallScore',
          boundaries: [0, 20, 40, 60, 80, 101],
          default: 'Other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    res.json({
      success: true,
      stats: { totalStudents, totalInterviews, completedInterviews, totalResumes, avgScore },
      byRole,
      daily,
      scoreDistribution
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/students - List all students
router.get('/students', async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Enrich with interview/resume stats
    const enriched = await Promise.all(students.map(async (s) => {
      const [interviews, resumes] = await Promise.all([
        Interview.find({ student: s._id }).select('overallScore jobRole status createdAt'),
        Resume.find({ student: s._id }).select('analysis.score targetRole createdAt')
      ]);

      return {
        ...s.toObject(),
        interviewCount: interviews.length,
        avgInterviewScore: interviews.length
          ? Math.round(interviews.reduce((a, b) => a + (b.overallScore || 0), 0) / interviews.length)
          : 0,
        lastInterview: interviews[0]?.createdAt,
        resumeCount: resumes.length,
        lastResumeScore: resumes[0]?.analysis?.score
      };
    }));

    // Filter by role if specified
    let filtered = enriched;
    if (role) {
      const interviews = await Interview.find({ jobRole: { $regex: role, $options: 'i' } });
      const studentIds = [...new Set(interviews.map(i => i.student.toString()))];
      filtered = enriched.filter(s => studentIds.includes(s._id.toString()));
    }

    res.json({ success: true, students: filtered, total: filtered.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/students/:id/report - Full student report
router.get('/students/:id/report', async (req, res) => {
  try {
    const student = await User.findById(req.params.id).select('-password');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const [interviews, resumes] = await Promise.all([
      Interview.find({ student: req.params.id }).sort({ createdAt: -1 }),
      Resume.find({ student: req.params.id }).sort({ createdAt: -1 }).select('-extractedText')
    ]);

    res.json({ success: true, student, interviews, resumes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/interviews - All interview records
router.get('/interviews', async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.jobRole = { $regex: role, $options: 'i' };
    if (status) query.status = status;

    const interviews = await Interview.find(query)
      .populate('student', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-answers');

    const total = await Interview.countDocuments(query);
    res.json({ success: true, interviews, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
