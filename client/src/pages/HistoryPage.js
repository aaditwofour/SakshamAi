// pages/HistoryPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mic, FileText, Clock, ChevronRight, Award } from 'lucide-react';
import Sidebar from '../components/shared/Sidebar';
import api from '../utils/api';

export default function HistoryPage() {
  const [tab, setTab] = useState('interviews');
  const [interviews, setInterviews] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/interview/history'), api.get('/resume/history')])
      .then(([iv, rv]) => {
        setInterviews(iv.data.interviews || []);
        setResumes(rv.data.resumes || []);
      }).finally(() => setLoading(false));
  }, []);

  const getScoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#06b6d4' : s >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>Activity History</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Your past interviews and resume analyses</p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {[{ id: 'interviews', label: `Interviews (${interviews.length})`, icon: Mic },
            { id: 'resumes', label: `Resumes (${resumes.length})`, icon: FileText }].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              style={{
                padding: '8px 20px', borderRadius: '8px', cursor: 'pointer',
                background: tab === id ? 'var(--bg-card)' : 'transparent',
                border: tab === id ? '1px solid var(--border)' : '1px solid transparent',
                color: tab === id ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s'
              }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
            Loading history...
          </div>
        ) : tab === 'interviews' ? (
          <div>
            {interviews.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <Mic size={48} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>No interviews yet</p>
                <Link to="/interview" className="btn btn-primary">Start First Interview</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {interviews.map(iv => (
                  <div key={iv._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                      background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Mic size={20} color="#6366f1" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                        {iv.jobRole?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {new Date(iv.createdAt).toLocaleDateString()}
                        </span>
                        <span>{iv.attemptedQuestions || 0}/{iv.totalQuestions || 10} answered</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 600,
                          background: iv.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          color: iv.status === 'completed' ? '#10b981' : '#f59e0b'
                        }}>{iv.status}</span>
                      </div>
                    </div>
                    {iv.overallScore > 0 && (
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: '1.5rem', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: getScoreColor(iv.overallScore) }}>{iv.overallScore}%</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{iv.evaluation?.grade || ''}</div>
                      </div>
                    )}
                    {iv.status === 'completed' && (
                      <Link to={`/interview/result/${iv._id}`} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.8rem', flexShrink: 0 }}>
                        View Report <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {resumes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>No resumes analyzed yet</p>
                <Link to="/resume" className="btn btn-primary">Analyze Resume</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {resumes.map(r => (
                  <div key={r._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={20} color="#06b6d4" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{r.originalName || 'Resume'}</p>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={11} /> {new Date(r.analyzedAt || r.createdAt).toLocaleDateString()}
                        </span>
                        <span>Target: {r.targetRole?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    {r.analysis?.score > 0 && (
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: '1.5rem', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: getScoreColor(r.analysis.score) }}>{r.analysis.score}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ATS: {r.analysis.atsScore}%</div>
                      </div>
                    )}
                    <div style={{ flexShrink: 0, display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '140px' }}>
                      {(r.analysis?.presentSkills || []).slice(0, 2).map(s => (
                        <span key={s} className="tag" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.65rem', border: '1px solid rgba(16,185,129,0.2)' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
