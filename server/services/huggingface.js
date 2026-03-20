// services/huggingface.js - AI Evaluation Service using HuggingFace
const fetch = require('node-fetch');

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_BASE_URL = 'https://api-inference.huggingface.co/models';

// ─── Call HuggingFace API with retries ────────────────────────────────────
async function callHF(model, payload, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`${HF_BASE_URL}/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
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
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

// ─── Evaluate a single answer ─────────────────────────────────────────────
// Scoring philosophy:
//   - Relevant answer with good keywords  → 70–100
//   - Partially relevant / brief answer   → 45–70
//   - Off-topic or very thin answer       → 10–45
//   - No answer / gibberish               → 0–15
async function evaluateAnswer(question, answer, jobRole) {
  try {
    const trimmed = (answer || '').trim();

    // Empty or one-word answer
    if (!trimmed || trimmed.split(' ').length < 2) {
      return { relevance: 5, completeness: 5, keywords: 5, score: 5, feedback: 'No meaningful answer provided.' };
    }

    // ── Relevance via HuggingFace zero-shot classification ──
    const labels = ['highly relevant', 'partially relevant', 'not relevant'];
    const result = await callHF('facebook/bart-large-mnli', {
      inputs: `Question: ${question}\nAnswer: ${trimmed}`,
      parameters: { candidate_labels: labels }
    });

    let relevanceScore = 0;
    if (result && result.labels && result.scores) {
      const highIdx = result.labels.indexOf('highly relevant');
      const partialIdx = result.labels.indexOf('partially relevant');
      const notIdx = result.labels.indexOf('not relevant');

      const highScore = result.scores[highIdx] || 0;
      const partialScore = result.scores[partialIdx] || 0;
      const notScore = result.scores[notIdx] || 0;

      // Weighted: highly relevant counts full, partial counts half, not relevant pulls down
      relevanceScore = Math.round(
        (highScore * 100) +
        (partialScore * 55) -
        (notScore * 20)
      );
      relevanceScore = Math.max(5, Math.min(100, relevanceScore));
    } else {
      relevanceScore = calculateFallbackScore(question, trimmed);
    }

    // ── Completeness: based on word count ──
    // 0–9 words   → 10–30  (too short)
    // 10–25 words → 30–65  (decent)
    // 25–50 words → 65–85  (good)
    // 50+ words   → 85–100 (comprehensive)
    const wordCount = trimmed.split(' ').filter(w => w.length > 0).length;
    let completeness;
    if (wordCount >= 50) completeness = Math.min(100, 85 + Math.floor((wordCount - 50) / 10) * 3);
    else if (wordCount >= 25) completeness = 65 + Math.floor((wordCount - 25) / 25 * 20);
    else if (wordCount >= 10) completeness = 30 + Math.floor((wordCount - 10) / 15 * 35);
    else completeness = Math.max(10, wordCount * 3);

    // ── Keyword score: how many topic keywords appear in the answer ──
    const keywords = extractKeywords(question);
    const answerLower = trimmed.toLowerCase();
    const matchedKeywords = keywords.filter(k => answerLower.includes(k));

    let keywordScore;
    if (keywords.length === 0) {
      // No keywords extractable from question — neutral score
      keywordScore = 50;
    } else {
      const ratio = matchedKeywords.length / keywords.length;
      if (ratio >= 0.7) keywordScore = Math.round(75 + ratio * 25);  // 75–100
      else if (ratio >= 0.4) keywordScore = Math.round(50 + ratio * 60);  // 50–74
      else if (ratio >= 0.1) keywordScore = Math.round(20 + ratio * 100); // 20–49
      else keywordScore = 10;
    }

    // ── Overall: relevance is king (50%), then completeness (30%), keywords (20%) ──
    const overall = Math.max(5, Math.min(100,
      Math.round((relevanceScore * 0.50) + (completeness * 0.30) + (keywordScore * 0.20))
    ));

    return {
      relevance: Math.round(relevanceScore),
      completeness: Math.round(completeness),
      keywords: Math.round(keywordScore),
      score: overall,
      feedback: generateAnswerFeedback(overall, relevanceScore, wordCount, matchedKeywords, keywords)
    };

  } catch (err) {
    console.error('HF Evaluation Error:', err.message);
    const score = calculateFallbackScore(question, answer || '');
    return { relevance: score, completeness: score, keywords: score, score, feedback: 'Answer evaluated with fallback.' };
  }
}

// ─── Evaluate full interview ───────────────────────────────────────────────
async function evaluateInterview(answers, jobRole) {
  const evaluated = [];
  let totalScore = 0;

  for (const a of answers) {
    const result = await evaluateAnswer(a.question, a.answer || '', jobRole);
    evaluated.push({ ...a, ...result });
    totalScore += result.score;
  }

  const avgScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;
  const grade = getGrade(avgScore);

  const sectionScores = {
    relevance: Math.round(evaluated.reduce((s, a) => s + (a.relevance || 0), 0) / (evaluated.length || 1)),
    completeness: Math.round(evaluated.reduce((s, a) => s + (a.completeness || 0), 0) / (evaluated.length || 1)),
    keywords: Math.round(evaluated.reduce((s, a) => s + (a.keywords || 0), 0) / (evaluated.length || 1))
  };

  return {
    evaluatedAnswers: evaluated,
    evaluation: {
      totalScore: avgScore,
      percentage: avgScore,
      grade,
      strengths: generateStrengths(evaluated, avgScore),
      weaknesses: generateWeaknesses(evaluated, avgScore),
      suggestions: generateSuggestions(jobRole, evaluated),
      sectionScores,
      summary: `You completed the ${jobRole} interview with an overall score of ${avgScore}%. ${avgScore >= 75 ? 'Great performance!' :
        avgScore >= 55 ? 'Decent attempt — keep practicing.' :
          'Keep practicing to improve your scores.'
        }`
    }
  };
}

// ─── Analyze Resume ────────────────────────────────────────────────────────
async function analyzeResume(text, targetRole) {
  try {
    const roleSkills = getRoleSkills(targetRole);
    const textLower = text.toLowerCase();

    const presentSkills = roleSkills.filter(s => textLower.includes(s.toLowerCase()));
    const missingSkills = roleSkills.filter(s => !textLower.includes(s.toLowerCase()));

    // Skill score: purely based on how many required skills are present
    const skillScore = Math.round((presentSkills.length / roleSkills.length) * 100);

    // Quality score via HuggingFace sentiment on resume text
    let qualityScore = 60;
    try {
      const sentiment = await callHF('distilbert-base-uncased-finetuned-sst-2-english', {
        inputs: text.substring(0, 512)
      });
      if (sentiment && sentiment[0]) {
        qualityScore = sentiment[0].label === 'POSITIVE'
          ? Math.round(55 + sentiment[0].score * 35)
          : Math.round(35 + sentiment[0].score * 25);
      }
    } catch (e) { /* use default */ }

    const wordCount = text.split(' ').length;
    const hasContact = /email|phone|linkedin/i.test(text);
    const hasEducation = /education|degree|bachelor|master|university/i.test(text);
    const hasExperience = /experience|worked|years|company/i.test(text);
    const hasProjects = /project|built|developed|created/i.test(text);

    const formattingScore = Math.min(100,
      (hasContact ? 25 : 0) +
      (hasEducation ? 20 : 0) +
      (hasExperience ? 25 : 0) +
      (hasProjects ? 15 : 0) +
      (wordCount > 200 ? 15 : 5)
    );

    const overallScore = Math.round(
      (skillScore * 0.40) +
      (qualityScore * 0.30) +
      (formattingScore * 0.30)
    );

    return {
      score: overallScore,
      grade: getGrade(overallScore),
      presentSkills,
      missingSkills: missingSkills.slice(0, 8),
      keywordOptimization: generateKeywordTips(missingSkills, targetRole),
      roleSuggestions: generateRoleSuggestions(overallScore, targetRole, missingSkills),
      strengths: generateResumeStrengths(presentSkills, formattingScore, wordCount),
      improvements: generateResumeImprovements(missingSkills, formattingScore, wordCount),
      atsScore: Math.round(overallScore * 0.92),
      sections: {
        skills: skillScore,
        experience: hasExperience ? Math.min(100, 50 + (hasProjects ? 25 : 0) + (wordCount > 300 ? 25 : 10)) : 20,
        education: hasEducation ? 80 : 20,
        formatting: formattingScore
      },
      summary: `Your resume scores ${overallScore}/100 for the ${targetRole} role. ${overallScore >= 75 ? 'Strong profile!' :
        overallScore >= 55 ? 'Good base — add more relevant skills.' :
          'Consider adding more relevant skills and experience.'
        }`
    };
  } catch (err) {
    console.error('Resume Analysis Error:', err.message);
    return {
      score: 50, grade: 'D',
      presentSkills: [], missingSkills: [],
      keywordOptimization: ['Add more relevant keywords'],
      roleSuggestions: ['Tailor resume to job description'],
      strengths: ['Resume submitted successfully'],
      improvements: ['Add more details about your experience'],
      atsScore: 45,
      sections: { skills: 50, experience: 50, education: 50, formatting: 50 },
      summary: 'Resume analyzed. Please review the suggestions below.'
    };
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────────

// Fallback scoring when HF API is unavailable
// Purely based on answer length + keyword overlap
function calculateFallbackScore(question, answer) {
  if (!answer || answer.trim().length < 5) return 5;
  const wordCount = answer.trim().split(' ').filter(w => w.length > 0).length;
  const keywords = extractKeywords(question);
  const answerLower = answer.toLowerCase();
  const matches = keywords.filter(k => answerLower.includes(k)).length;

  // Length component: peaks at 40 words
  const lengthScore = Math.min(50, Math.round((wordCount / 40) * 50));
  // Keyword component: how many topic words appear
  const keywordScore = keywords.length > 0
    ? Math.round((matches / keywords.length) * 50)
    : 25;

  return Math.max(5, Math.min(100, lengthScore + keywordScore));
}

// Extract meaningful topic words from question text
function extractKeywords(text) {
  const stopWords = new Set([
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'in', 'of', 'and', 'or', 'to', 'for', 'with', 'on', 'at',
    'you', 'your', 'would', 'could', 'should', 'will', 'do', 'does',
    'explain', 'describe', 'define', 'tell', 'give', 'example', 'between',
    'difference', 'use', 'used', 'using', 'between', 'about'
  ]);
  return text.toLowerCase()
    .split(/\W+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
}

// Grade thresholds — standard academic scale
function getGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// Per-answer feedback based on relevance + overall score
function generateAnswerFeedback(overall, relevance, wordCount, matched, keywords) {
  if (overall >= 80) return 'Excellent answer! Highly relevant and well-explained.';
  if (overall >= 65) {
    const missing = keywords.filter(k => !matched.includes(k)).slice(0, 2);
    return `Good answer. ${missing.length > 0 ? `Try to also mention: ${missing.join(', ')}.` : 'Well covered.'}`;
  }
  if (overall >= 50) {
    return wordCount < 15
      ? 'Answer is too brief. Elaborate with an example or more detail.'
      : 'Partially correct. You touched the topic but missed some key points.';
  }
  if (relevance < 30) return 'Answer does not seem relevant to the question. Re-read the question carefully.';
  return 'Answer needs more depth. Try to mention key concepts and give a short example.';
}

function generateStrengths(evaluated, avgScore) {
  const strengths = [];
  const highScoring = evaluated.filter(a => a.score >= 70);
  const goodRelevance = evaluated.filter(a => a.relevance >= 65);

  if (highScoring.length > 0)
    strengths.push(`Scored well on ${highScoring.length} out of ${evaluated.length} questions`);
  if (goodRelevance.length > evaluated.length / 2)
    strengths.push('Majority of answers were relevant to the questions asked');
  if (avgScore >= 70)
    strengths.push('Good overall technical understanding demonstrated');
  if (evaluated.some(a => a.completeness >= 75))
    strengths.push('Provided detailed answers on several questions');
  if (strengths.length === 0)
    strengths.push('Attempted all questions', 'Shows willingness to engage with technical topics');

  return strengths;
}

function generateWeaknesses(evaluated, avgScore) {
  const weaknesses = [];
  const lowRelevance = evaluated.filter(a => a.relevance < 40);
  const shortAnswers = evaluated.filter(a => a.completeness < 35);
  const lowKeywords = evaluated.filter(a => a.keywords < 30);

  if (lowRelevance.length > 0)
    weaknesses.push(`${lowRelevance.length} answers were not sufficiently relevant to the questions`);
  if (shortAnswers.length > 0)
    weaknesses.push(`${shortAnswers.length} answers were too brief — aim for at least 2-3 sentences`);
  if (lowKeywords.length > 0)
    weaknesses.push('Missing technical keywords in several answers');
  if (avgScore < 50)
    weaknesses.push('Overall score below passing threshold — more preparation needed');
  if (weaknesses.length === 0)
    weaknesses.push('Minor improvements possible in technical depth and examples');

  return weaknesses;
}

function generateSuggestions(jobRole, evaluated) {
  const suggestions = [
    `Review core ${jobRole.replace(/_/g, ' ')} concepts and practice explaining them out loud`,
    'Use the STAR method (Situation, Task, Action, Result) for practical questions',
    'Include specific examples, numbers, or project references in your answers',
    'Aim for 2–4 sentences per answer — enough detail without rambling'
  ];
  if (evaluated.some(a => a.relevance < 40)) {
    suggestions.push('Read each question carefully before answering — focus on what is specifically asked');
  }
  return suggestions.slice(0, 4);
}

function getRoleSkills(role) {
  const skills = {
    'software_engineer': ['javascript', 'python', 'java', 'algorithms', 'data structures', 'git', 'linux', 'rest api', 'oop', 'design patterns', 'sql', 'agile'],
    'sql_developer': ['sql', 'mysql', 'postgresql', 'joins', 'indexes', 'stored procedures', 'triggers', 'normalization', 'query optimization', 'database design', 'transactions', 'views'],
    'full_stack_developer': ['react', 'nodejs', 'javascript', 'html', 'css', 'mongodb', 'rest api', 'git', 'express', 'typescript', 'docker', 'authentication'],
    'data_analyst': ['python', 'sql', 'pandas', 'numpy', 'matplotlib', 'statistics', 'machine learning', 'excel', 'tableau', 'power bi', 'data cleaning', 'visualization']
  };
  return skills[role?.toLowerCase().replace(/ /g, '_')] || skills['software_engineer'];
}

function generateKeywordTips(missing, role) {
  return missing.slice(0, 5).map(
    skill => `Add "${skill}" with context: briefly describe a project or experience using ${skill}`
  );
}

function generateRoleSuggestions(score, role, missing) {
  const suggestions = [`Tailor your resume specifically for ${role.replace(/_/g, ' ')} positions`];
  if (missing.length > 0)
    suggestions.push(`Consider learning or adding: ${missing.slice(0, 3).join(', ')}`);
  if (score < 65)
    suggestions.push('Add quantifiable achievements, e.g. "Reduced load time by 30%"');
  suggestions.push('Include a concise professional summary at the top of your resume');
  return suggestions;
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
    improvements.push('Structure resume clearly: separate Contact, Education, Experience, and Skills sections');
  if (wordCount < 200)
    improvements.push('Resume is too short — add more detail about projects and responsibilities');
  improvements.push('Quantify your achievements with numbers and impact metrics');
  return improvements;
}

module.exports = { evaluateAnswer, evaluateInterview, analyzeResume };