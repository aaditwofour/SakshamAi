// services/huggingface.js - AI Evaluation Service
// Uses node-fetch v2 (CommonJS compatible with Node 22)
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const HF_API_KEY  = process.env.HUGGINGFACE_API_KEY;
const HF_BASE_URL = 'https://api-inference.huggingface.co/models';

// ─── HuggingFace API call with retries ────────────────────────────────────
async function callHF(model, payload, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`${HF_BASE_URL}/${model}`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 503) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      const data = await res.json();
      if (data.error && i < retries) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return data;
    } catch (err) {
      if (i === retries) return null; // return null instead of throwing
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

// ─── Evaluate a single answer ─────────────────────────────────────────────
async function evaluateAnswer(question, answer, jobRole) {
  try {
    const trimmed = (answer || '').trim();

    // Empty or too short
    if (!trimmed || trimmed.split(/\s+/).length < 2) {
      return {
        relevance: 5, completeness: 5, keywords: 5, score: 5,
        feedback: 'No meaningful answer provided.'
      };
    }

    // ── Completeness: word count ──────────────────────────────────────────
    const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
    let completeness;
    if      (wordCount >= 50) completeness = Math.min(100, 85 + Math.floor((wordCount - 50) / 10) * 3);
    else if (wordCount >= 25) completeness = 65 + Math.floor((wordCount - 25) / 25 * 20);
    else if (wordCount >= 10) completeness = 30 + Math.floor((wordCount - 10) / 15 * 35);
    else                      completeness = Math.max(10, wordCount * 3);

    // ── Keywords: how many topic words are in the answer ──────────────────
    const keywords    = extractKeywords(question);
    const answerLower = trimmed.toLowerCase();
    const matched     = keywords.filter(k => answerLower.includes(k));
    let keywordScore;
    if (keywords.length === 0) {
      keywordScore = 50;
    } else {
      const ratio = matched.length / keywords.length;
      if      (ratio >= 0.7) keywordScore = Math.round(75 + ratio * 25);
      else if (ratio >= 0.4) keywordScore = Math.round(50 + ratio * 60);
      else if (ratio >= 0.1) keywordScore = Math.round(20 + ratio * 100);
      else                   keywordScore = 10;
    }

    // ── Relevance: HuggingFace zero-shot (with fallback) ──────────────────
    let relevanceScore = calculateFallbackScore(question, trimmed); // start with fallback

    const result = await callHF('facebook/bart-large-mnli', {
      inputs: `Question: ${question}\nAnswer: ${trimmed}`,
      parameters: { candidate_labels: ['highly relevant', 'partially relevant', 'not relevant'] }
    });

    if (result && result.labels && result.scores && !result.error) {
      const highIdx    = result.labels.indexOf('highly relevant');
      const partialIdx = result.labels.indexOf('partially relevant');
      const notIdx     = result.labels.indexOf('not relevant');
      const hScore = result.scores[highIdx]    || 0;
      const pScore = result.scores[partialIdx] || 0;
      const nScore = result.scores[notIdx]     || 0;
      const hfScore = Math.round((hScore * 100) + (pScore * 55) - (nScore * 20));
      relevanceScore = Math.max(5, Math.min(100, hfScore));
    }

    // ── Overall ───────────────────────────────────────────────────────────
    const overall = Math.max(5, Math.min(100,
      Math.round((relevanceScore * 0.50) + (completeness * 0.30) + (keywordScore * 0.20))
    ));

    return {
      relevance:    Math.round(relevanceScore),
      completeness: Math.round(completeness),
      keywords:     Math.round(keywordScore),
      score:        overall,
      feedback:     generateAnswerFeedback(overall, relevanceScore, wordCount, matched, keywords)
    };

  } catch (err) {
    console.error('evaluateAnswer error:', err.message);
    const score = calculateFallbackScore(question, answer || '');
    return { relevance: score, completeness: score, keywords: score, score, feedback: 'Evaluated with fallback scoring.' };
  }
}

// ─── Evaluate full interview ───────────────────────────────────────────────
async function evaluateInterview(answers, jobRole) {
  if (!answers || answers.length === 0) {
    return {
      evaluatedAnswers: [],
      evaluation: {
        totalScore: 0, percentage: 0, grade: 'F',
        strengths: ['No answers submitted'],
        weaknesses: ['Interview was not completed'],
        suggestions: ['Please complete the interview and answer all questions'],
        sectionScores: { relevance: 0, completeness: 0, keywords: 0 },
        summary: 'No answers were submitted for evaluation.'
      }
    };
  }

  const evaluated = [];
  let totalScore  = 0;

  for (const a of answers) {
    const result = await evaluateAnswer(a.question || '', a.answer || '', jobRole);
    evaluated.push({ ...a, ...result });
    totalScore += result.score;
  }

  const avgScore = Math.round(totalScore / answers.length);
  const grade    = getGrade(avgScore);

  const sectionScores = {
    relevance:    Math.round(evaluated.reduce((s, a) => s + (a.relevance    || 0), 0) / evaluated.length),
    completeness: Math.round(evaluated.reduce((s, a) => s + (a.completeness || 0), 0) / evaluated.length),
    keywords:     Math.round(evaluated.reduce((s, a) => s + (a.keywords     || 0), 0) / evaluated.length)
  };

  return {
    evaluatedAnswers: evaluated,
    evaluation: {
      totalScore:   avgScore,
      percentage:   avgScore,
      grade,
      strengths:    generateStrengths(evaluated, avgScore),
      weaknesses:   generateWeaknesses(evaluated, avgScore),
      suggestions:  generateSuggestions(jobRole, evaluated),
      sectionScores,
      summary: `You completed the ${(jobRole || '').replace(/_/g, ' ')} interview with an overall score of ${avgScore}%. ${
        avgScore >= 75 ? 'Great performance!' :
        avgScore >= 55 ? 'Decent attempt — keep practicing.' :
        'Keep practicing to improve your scores.'
      }`
    }
  };
}

// ─── Analyze Resume ────────────────────────────────────────────────────────
async function analyzeResume(text, targetRole) {
  try {
    const roleSkills  = getRoleSkills(targetRole);
    const textLower   = (text || '').toLowerCase();
    const wordCount   = text.split(/\s+/).length;

    const presentSkills = roleSkills.filter(s => textLower.includes(s.toLowerCase()));
    const missingSkills = roleSkills.filter(s => !textLower.includes(s.toLowerCase()));
    const skillScore    = Math.round((presentSkills.length / Math.max(roleSkills.length, 1)) * 100);

    // Section heuristics
    const hasExperience  = /experience|work|employment|job|position|role/i.test(text);
    const hasEducation   = /education|university|college|degree|bachelor|master|b\.tech|m\.tech/i.test(text);
    const hasProjects    = /project|portfolio|built|developed|created/i.test(text);
    const hasContact     = /email|phone|linkedin|github/i.test(text);

    const experienceScore = hasExperience ? Math.min(100, 50 + (hasProjects ? 25 : 0) + (wordCount > 300 ? 25 : 10)) : 30;
    const educationScore  = hasEducation  ? 80 : 40;
    const formattingScore = hasContact    ? Math.min(100, 55 + (hasEducation ? 15 : 0) + (hasExperience ? 15 : 0) + (wordCount > 200 ? 15 : 0)) : 40;

    const overallScore = Math.round(
      (skillScore * 0.40) + (experienceScore * 0.30) +
      (educationScore * 0.15) + (formattingScore * 0.15)
    );

    // Try HuggingFace quality check (optional — don't fail if unavailable)
    let qualityScore = 60;
    try {
      const sentiment = await callHF('distilbert-base-uncased-finetuned-sst-2-english', {
        inputs: text.substring(0, 512)
      });
      if (sentiment && Array.isArray(sentiment) && sentiment[0]) {
        qualityScore = sentiment[0].label === 'POSITIVE'
          ? Math.round(55 + sentiment[0].score * 35)
          : Math.round(30 + sentiment[0].score * 25);
      }
    } catch { /* HF unavailable — use default */ }

    const atsScore = Math.round((skillScore * 0.6) + (formattingScore * 0.4));

    return {
      score:               Math.min(100, overallScore),
      grade:               getGrade(overallScore),
      presentSkills,
      missingSkills,
      keywordOptimization: generateKeywordTips(missingSkills, targetRole),
      roleSuggestions:     generateRoleSuggestions(overallScore, targetRole, missingSkills),
      strengths:           generateResumeStrengths(presentSkills, formattingScore, wordCount),
      improvements:        generateResumeImprovements(missingSkills, formattingScore, wordCount),
      atsScore,
      sections: {
        skills:      skillScore,
        experience:  experienceScore,
        education:   educationScore,
        formatting:  formattingScore
      },
      summary: `Your resume scores ${overallScore}/100 for the ${(targetRole || '').replace(/_/g, ' ')} role. ${
        overallScore >= 75 ? 'Strong profile!' :
        overallScore >= 55 ? 'Good base — add more relevant skills.' :
        'Consider adding more relevant skills and experience.'
      }`
    };
  } catch (err) {
    console.error('analyzeResume error:', err.message);
    return {
      score: 50, grade: 'D',
      presentSkills: [], missingSkills: [],
      keywordOptimization: ['Add more relevant keywords'],
      roleSuggestions: ['Tailor resume to job description'],
      strengths: ['Resume submitted successfully'],
      improvements: ['Add more details about your experience'],
      atsScore: 45,
      sections: { skills: 50, experience: 50, education: 50, formatting: 50 },
      summary: 'Resume analyzed with basic scoring. Please review suggestions.'
    };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function calculateFallbackScore(question, answer) {
  if (!answer || answer.trim().length < 5) return 5;
  const wordCount   = answer.trim().split(/\s+/).filter(w => w.length > 0).length;
  const keywords    = extractKeywords(question);
  const answerLower = answer.toLowerCase();
  const matches     = keywords.filter(k => answerLower.includes(k)).length;
  const lengthScore = Math.min(50, Math.round((wordCount / 40) * 50));
  const kwScore     = keywords.length > 0 ? Math.round((matches / keywords.length) * 50) : 25;
  return Math.max(5, Math.min(100, lengthScore + kwScore));
}

function extractKeywords(text) {
  const stopWords = new Set([
    'what','how','why','when','where','which','who','the','a','an','is','are',
    'was','were','be','been','in','of','and','or','to','for','with','on','at',
    'you','your','would','could','should','will','do','does','explain','describe',
    'define','tell','give','example','between','difference','use','used','using','about'
  ]);
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
}

function getGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function generateAnswerFeedback(overall, relevance, wordCount, matched, keywords) {
  if (overall >= 80) return 'Excellent answer — highly relevant and well-explained.';
  if (overall >= 65) {
    const missing = keywords.filter(k => !matched.includes(k)).slice(0, 2);
    return `Good answer. ${missing.length > 0 ? `Try to mention: ${missing.join(', ')}.` : 'Well covered.'}`;
  }
  if (overall >= 50) {
    return wordCount < 15
      ? 'Too brief — elaborate with an example or more detail.'
      : 'Partially correct — touched the topic but missed some key points.';
  }
  if (relevance < 30) return 'Answer does not seem relevant to the question. Re-read carefully.';
  return 'Needs more depth — mention key concepts and give a short example.';
}

function generateStrengths(evaluated, avgScore) {
  const strengths    = [];
  const attempted    = evaluated.filter(a => a.answer && a.answer.trim().length > 5);
  const highScoring  = evaluated.filter(a => a.score >= 70);
  const goodRelevance= evaluated.filter(a => a.relevance >= 65);
  const detailed     = evaluated.filter(a => a.completeness >= 70);
  const goodKeywords = evaluated.filter(a => a.keywords >= 60);

  if (highScoring.length >= 3)
    strengths.push(`Scored 70%+ on ${highScoring.length} questions — solid performance`);
  else if (highScoring.length > 0)
    strengths.push(`${highScoring.length} answer${highScoring.length > 1 ? 's' : ''} scored above 70%`);

  if (goodRelevance.length >= Math.ceil(evaluated.length * 0.6))
    strengths.push(`${goodRelevance.length} answers were directly relevant to the questions`);

  if (detailed.length >= 2)
    strengths.push(`${detailed.length} answers had good depth and detail`);

  if (goodKeywords.length >= 3)
    strengths.push(`Strong use of technical keywords in ${goodKeywords.length} answers`);

  if (avgScore >= 80) strengths.push('Excellent overall technical understanding demonstrated');
  else if (avgScore >= 65) strengths.push('Good technical foundation — keep building on this');

  if (attempted.length === evaluated.length && attempted.length > 0)
    strengths.push('Attempted all questions — no blanks left');

  if (strengths.length === 0) {
    if (attempted.length > 0)
      strengths.push(`Attempted ${attempted.length} of ${evaluated.length} questions`);
    else
      strengths.push('Interview session was completed');
  }

  return strengths.slice(0, 4);
}

function generateWeaknesses(evaluated, avgScore) {
  const weaknesses  = [];
  const unanswered  = evaluated.filter(a => !a.answer || a.answer.trim().length < 5);
  const lowRelevance= evaluated.filter(a => a.score > 5 && a.relevance < 45);
  const shortAnswers= evaluated.filter(a => a.score > 5 && a.completeness < 35);
  const lowKeywords = evaluated.filter(a => a.score > 5 && a.keywords < 30);

  if (unanswered.length > 0)
    weaknesses.push(`${unanswered.length} question${unanswered.length > 1 ? 's' : ''} left unanswered`);
  if (lowRelevance.length > 0)
    weaknesses.push(`${lowRelevance.length} answer${lowRelevance.length > 1 ? 's were' : ' was'} not sufficiently on-topic`);
  if (shortAnswers.length > 0)
    weaknesses.push(`${shortAnswers.length} answer${shortAnswers.length > 1 ? 's were' : ' was'} too brief — aim for 2–3 sentences`);
  if (lowKeywords.length > 0)
    weaknesses.push(`Technical keywords missing in ${lowKeywords.length} answer${lowKeywords.length > 1 ? 's' : ''}`);
  if (avgScore < 50 && weaknesses.length < 2)
    weaknesses.push('Overall score below 50% — more interview preparation recommended');
  if (weaknesses.length === 0)
    weaknesses.push('Minor improvements possible in technical depth and concrete examples');

  return weaknesses.slice(0, 4);
}

function generateSuggestions(jobRole, evaluated) {
  const role = (jobRole || '').replace(/_/g, ' ');
  const suggestions = [
    `Review core ${role} concepts and practice explaining them out loud`,
    'Use the STAR method (Situation, Task, Action, Result) for practical questions',
    'Include specific examples, numbers, or project references in your answers',
    'Aim for 2–4 sentences per answer — enough detail without rambling'
  ];
  if (evaluated.some(a => a.relevance < 40))
    suggestions.push('Read each question carefully before answering — focus on what is specifically asked');
  return suggestions.slice(0, 4);
}

function getRoleSkills(role) {
  const skills = {
    'software_engineer':    ['javascript','python','java','algorithms','data structures','git','linux','rest api','oop','design patterns','sql','agile'],
    'sql_developer':        ['sql','mysql','postgresql','joins','indexes','stored procedures','triggers','normalization','query optimization','database design','transactions','views'],
    'full_stack_developer': ['react','nodejs','javascript','html','css','mongodb','rest api','git','express','typescript','docker','authentication'],
    'data_analyst':         ['python','sql','pandas','numpy','matplotlib','statistics','machine learning','excel','tableau','power bi','data cleaning','visualization']
  };
  const key = (role || '').toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
  return skills[key] || skills['software_engineer'];
}

function generateKeywordTips(missing, role) {
  return missing.slice(0, 5).map(
    s => `Add "${s}" with context — describe a project or experience using ${s}`
  );
}

function generateRoleSuggestions(score, role, missing) {
  const r = (role || '').replace(/_/g, ' ');
  const s = [`Tailor your resume specifically for ${r} positions`];
  if (missing.length > 0) s.push(`Consider learning or adding: ${missing.slice(0, 3).join(', ')}`);
  if (score < 65) s.push('Add quantifiable achievements, e.g. "Reduced load time by 30%"');
  s.push('Include a concise professional summary at the top of your resume');
  return s;
}

function generateResumeStrengths(present, formatting, wordCount) {
  const s = [];
  if (present.length >= 6) s.push(`Good skill coverage: ${present.slice(0, 4).join(', ')} and more`);
  else if (present.length > 0) s.push(`Has relevant skills: ${present.join(', ')}`);
  if (formatting >= 65) s.push('Resume has a clear, well-structured format');
  if (wordCount > 250) s.push('Sufficient detail and content in the resume');
  if (s.length === 0) s.push('Resume submitted and analyzed successfully');
  return s;
}

function generateResumeImprovements(missing, formatting, wordCount) {
  const improvements = [];
  if (missing.length > 0)
    improvements.push(`Add these missing skills: ${missing.slice(0, 4).join(', ')}`);
  if (formatting < 65)
    improvements.push('Structure resume clearly: separate Contact, Education, Experience, Skills');
  if (wordCount < 200)
    improvements.push('Resume is too short — add more detail about projects and responsibilities');
  improvements.push('Quantify achievements with numbers and impact metrics');
  return improvements;
}

module.exports = { evaluateAnswer, evaluateInterview, analyzeResume };
