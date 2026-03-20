// pages/AdminStudentReport.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Mic, FileText, Clock, Award } from 'lucide-react';
import Sidebar from '../components/shared/Sidebar';
import api from '../utils/api';

export default function AdminStudentReport() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/admin/students/${id}/report`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
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
      <main className="main-content"><p>Student not found.</p></main>
    </div>
  );

  const { student, interviews = [], resumes = [] } = data;
  const completed = interviews.filter(i => i.status === 'completed');
  const avgScore = completed.length ? Math.round(completed.reduce((s, i) => s + (i.overallScore || 0), 0) / completed.length) : 0;
  const getScoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#06b6d4' : s >= 40 ? '#f59e0b' : '#ef4444';

  const chartData = completed.map((iv, i) => ({
    name: `#${i + 1}`,
    score: iv.overallScore || 0,
    role: iv.jobRole?.substring(0, 8)
  }));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Link to="/admin/students" className="btn btn-secondary" style={{ marginBottom: '24px', display: 'inline-flex' }}>
          <ArrowLeft size={16} /> Back to Students
        </Link>

        {/* Student Header */}
        <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
              {student.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>{student.name}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{student.email}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Joined {new Date(student.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="grid-3" style={{ gap: '12px' }}>
              {[
                { label: 'Interviews', value: interviews.length, color: '#6366f1' },
                { label: 'Avg Score', value: `${avgScore}%`, color: getScoreColor(avgScore) },
                { label: 'Resumes', value: resumes.length, color: '#06b6d4' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.5rem', color }}>{value}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Score Progress Chart */}
        {chartData.length > 0 && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Interview Score Progress</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={v => [`${v}%`, 'Score']} />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid-2">
          {/* Interviews */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mic size={16} color="#6366f1" /> Interview History
            </h3>
            {interviews.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No interviews yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {interviews.map(iv => (
                  <div key={iv._id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '2px' }}>
                        {iv.jobRole?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={10} /> {new Date(iv.createdAt).toLocaleDateString()}
                        <span style={{ padding: '1px 6px', borderRadius: '8px', background: iv.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: iv.status === 'completed' ? '#10b981' : '#f59e0b', fontSize: '0.65rem' }}>{iv.status}</span>
                      </p>
                    </div>
                    {iv.overallScore > 0 && (
                      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: getScoreColor(iv.overallScore) }}>{iv.overallScore}%</span>
                    )}
                    {iv.evaluation?.grade && (
                      <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{iv.evaluation.grade}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumes */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} color="#06b6d4" /> Resume Analyses
            </h3>
            {resumes.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No resumes analyzed</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {resumes.map(r => (
                  <div key={r._id} className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <FileText size={16} color="#06b6d4" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.originalName || 'Resume'}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {r.targetRole?.replace(/_/g, ' ')} • {new Date(r.analyzedAt || r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {r.analysis?.score > 0 && (
                        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: getScoreColor(r.analysis.score) }}>{r.analysis.score}</span>
                      )}
                    </div>
                    {r.analysis?.presentSkills?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {r.analysis.presentSkills.slice(0, 4).map(s => (
                          <span key={s} className="tag" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.65rem', border: '1px solid rgba(16,185,129,0.2)' }}>{s}</span>
                        ))}
                      </div>
                    )}
                    {r.analysis?.summary && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>{r.analysis.summary}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
