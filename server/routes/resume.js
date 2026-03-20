// routes/resume.js - Resume Upload & Analysis Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { protect } = require('../middleware/auth');
const Resume = require('../models/Resume');
const { analyzeResume } = require('../services/huggingface');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user._id}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF and DOCX files allowed'));
  }
});

// Extract text from file
async function extractText(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    } else if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    return '';
  } catch (err) {
    console.error('Text extraction error:', err);
    return 'Unable to extract text from file';
  }
}

// POST /api/resume/analyze - Upload and analyze resume
router.post('/analyze', protect, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { targetRole } = req.body;
    const role = targetRole || 'software_engineer';

    // Extract text from resume
    const text = await extractText(req.file.path, req.file.mimetype);
    if (!text || text.length < 50) {
      return res.status(400).json({ success: false, message: 'Could not extract text from resume' });
    }

    // Analyze with HuggingFace
    const analysis = await analyzeResume(text, role);

    // Save to database
    const resume = await Resume.create({
      student: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      extractedText: text.substring(0, 5000),
      targetRole: role,
      analysis
    });

    // Clean up uploaded file
    fs.unlink(req.file.path, () => {});

    res.json({ success: true, resume });
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/resume/history - Get student's resume analyses
router.get('/history', protect, async (req, res) => {
  try {
    const resumes = await Resume.find({ student: req.user._id })
      .sort({ createdAt: -1 })
      .select('-extractedText');
    res.json({ success: true, resumes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/resume/:id - Get specific resume analysis
router.get('/:id', protect, async (req, res) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, student: req.user._id });
    if (!resume) return res.status(404).json({ success: false, message: 'Resume not found' });
    res.json({ success: true, resume });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
