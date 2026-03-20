// pages/StudentDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mic, FileText, History, TrendingUp, Award, Clock, ChevronRight, Star } from 'lucide-react';
import Sidebar from '../components/shared/Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ interviews: 0, avgScore: 0, resumes: 0, bestScore: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [intRes, resRes] = await Promise.all([
          api.get('/interview/history'),
          api.get('/resume/history')
        ]);
        const interviews = intRes.data.interviews || [];
        const resumes = resRes.data.resumes || [];
        const completed = interviews.filter(i => i.status === 'completed');
        const avg = completed.length ? Math.round(completed.reduce((s, i) => s + (i.overallScore || 0), 0) / completed.length) : 0;
        const best = completed.length ? Math.max(...completed.map(i => i.overallScore || 0)) : 0;

        setStats({ interviews: interviews.length, avgScore: avg, resumes: resumes.length, bestScore: best });
        setRecent(interviews.slice(0, 3));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getScoreColor = (s) => s >= 80 ? '#10b981' : s >= 60 ? '#06b6d4' : s >= 40 ? '#f59e0b' : '#ef4444';

  const quickActions = [
    { to: '/interview', icon: Mic, label: 'Start Interview', desc: 'Begin an AI-proctored session', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { to: '/resume', icon: FileText, label: 'Analyze Resume', desc: 'Upload CV for AI analysis', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    { to: '/history', icon: History, label: 'View History', desc: 'Past interviews & scores', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px' }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Here's your interview preparation overview</p>
        </div>

        {/* Stats */}
        <div className="grid-4" style={{ marginBottom: '32px' }}>
          {[
            { label: 'Total Interviews', value: stats.interviews, icon: Mic, color: '#6366f1' },
            { label: 'Average Score', value: `${stats.avgScore}%`, icon: TrendingUp, color: '#06b6d4' },
            { label: 'Best Score', value: `${stats.bestScore}%`, icon: Award, color: '#10b981' },
            { label: 'Resumes Analyzed', value: stats.resumes, icon: FileText, color: '#f59e0b' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stat-label">{label}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={color} />
                </div>
              </div>
              <span className="stat-value" style={{ color }}>{loading ? '—' : value}</span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Quick Actions</h2>
        <div className="grid-3" style={{ marginBottom: '32px' }}>
          {quickActions.map(({ to, icon: Icon, label, desc, color, bg }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', alignItems: 'center', gap: '16px' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} color={color} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '2px' }}>{label}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{desc}</p>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Interviews */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Interviews</h2>
          <Link to="/history" style={{ fontSize: '0.8rem', color: 'var(--accent-indigo)', textDecoration: 'none' }}>View all →</Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : recent.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <Mic size={40} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>No interviews yet</p>
            <Link to="/interview" className="btn btn-primary">Start Your First Interview</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recent.map(iv => (
              <div key={iv._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mic size={18} color="var(--accent-indigo)" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>{iv.jobRole}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={12} />
                    {new Date(iv.createdAt).toLocaleDateString()}
                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', background: iv.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: iv.status === 'completed' ? '#10b981' : '#f59e0b' }}>
                      {iv.status}
                    </span>
                  </p>
                </div>
                {iv.overallScore > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '1.3rem', fontWeight: 700, color: getScoreColor(iv.overallScore), fontFamily: 'Syne, sans-serif' }}>
                      {iv.overallScore}%
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>score</p>
                  </div>
                )}
                {iv.status === 'completed' && (
                  <Link to={`/interview/result/${iv._id}`} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                    View <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
