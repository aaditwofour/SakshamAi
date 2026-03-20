// pages/InterviewResult.js - Detailed evaluation results
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Award, CheckCircle, XCircle, Lightbulb, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import Sidebar from '../components/shared/Sidebar';
import api from '../utils/api';

export default function InterviewResult() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get(`/interview/${id}`).then(r => setData(r.data.interview)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="app-layout"><Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </main>
    </div>
  );

  if (!data) return (
    <div className="app-layout"><Sidebar />
      <main className="main-content"><p>Result not found.</p></main>
    </div>
  );

  const ev = data.evaluation || {};
  const score = ev.totalScore || 0;
  const getScoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#06b6d4' : s >= 40 ? '#f59e0b' : '#ef4444';

  const radarData = [
    { subject: 'Relevance', value: ev.sectionScores?.relevance || 0 },
    { subject: 'Completeness', value: ev.sectionScores?.completeness || 0 },
    { subject: 'Keywords', value: ev.sectionScores?.keywords || 0 },
    { subject: 'Overall', value: score },
  ];

  const barData = (data.answers || []).map((a, i) => ({
    name: `Q${i + 1}`,
    score: a.score || 0,
    relevance: a.relevance || 0,
  }));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Link to="/dashboard" className="btn btn-secondary" style={{ marginBottom: '24px', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: getScoreColor(score), lineHeight: 1 }}>
                {score}%
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: getScoreColor(score) }}>{ev.grade}</div>
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>{data.jobRole} Interview</h1>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>{ev.summary}</p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>📅 {new Date(data.completedAt || data.createdAt).toLocaleDateString()}</span>
                <span>⏱️ {Math.floor((data.duration || 0) / 60)}m {(data.duration || 0) % 60}s</span>
                <span>✅ {data.attemptedQuestions}/{data.totalQuestions} answered</span>
                {data.proctoring?.tabSwitches > 0 && <span style={{ color: '#f59e0b' }}>⚠️ {data.proctoring.tabSwitches} tab switches</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Performance Radar</h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Question-by-Question Scores</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Section Scores */}
        <div className="grid-3" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Relevance', value: ev.sectionScores?.relevance || 0, color: '#6366f1' },
            { label: 'Completeness', value: ev.sectionScores?.completeness || 0, color: '#06b6d4' },
            { label: 'Keywords', value: ev.sectionScores?.keywords || 0, color: '#10b981' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <span className="stat-label">{label}</span>
              <span className="stat-value" style={{ color }}>{value}%</span>
              <div className="progress-bar" style={{ marginTop: '8px' }}>
                <div className="progress-fill" style={{ width: `${value}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Strengths & Weaknesses */}
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} color="#10b981" /> Strengths
            </h3>
            {(ev.strengths || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', marginTop: '6px', flexShrink: 0 }} />
                {s}
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <XCircle size={16} color="#ef4444" /> Areas to Improve
            </h3>
            {(ev.weaknesses || []).map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', marginTop: '6px', flexShrink: 0 }} />
                {w}
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        {(ev.suggestions || []).length > 0 && (
          <div className="card" style={{ marginBottom: '24px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={16} color="#06b6d4" /> Improvement Suggestions
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              {(ev.suggestions || []).map((s, i) => (
                <div key={i} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.1)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#06b6d4', fontWeight: 600, marginRight: '6px' }}>{i + 1}.</span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Q&A Review */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Question Review</h3>
          {(data.answers || []).map((a, i) => (
            <div key={i} style={{ borderBottom: i < (data.answers || []).length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: '16px', marginBottom: '16px' }}>
              <button onClick={() => setExpanded(expanded === i ? null : i)}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: `${getScoreColor(a.score || 0)}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: getScoreColor(a.score || 0) }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>{a.question}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: getScoreColor(a.score || 0) }}>{a.score || 0}%</span>
                </div>
                {expanded === i ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
              </button>

              {expanded === i && (
                <div style={{ marginTop: '12px', paddingLeft: '40px' }}>
                  <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-secondary)', marginBottom: '8px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Answer</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{a.answer || 'No answer provided'}</p>
                  </div>
                  {a.feedback && (
                    <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                      <p style={{ fontSize: '0.75rem', color: '#6366f1', marginBottom: '4px' }}>AI Feedback</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{a.feedback}</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.75rem' }}>
                    {[['Relevance', a.relevance], ['Completeness', a.completeness], ['Keywords', a.keywords]].map(([k, v]) => (
                      <span key={k} style={{ color: 'var(--text-muted)' }}>{k}: <span style={{ color: getScoreColor(v || 0) }}>{v || 0}%</span></span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <Link to="/interview" className="btn btn-primary">Retake Interview</Link>
          <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
        </div>
      </main>
    </div>
  );
}
