// pages/ResumePage.js
import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { Upload, FileText, CheckCircle, XCircle, Lightbulb, BarChart2, Target } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/shared/Sidebar';
import api from '../utils/api';

const ROLES = [
  { id: 'software_engineer', label: 'Software Engineer' },
  { id: 'sql_developer', label: 'SQL Developer' },
  { id: 'full_stack_developer', label: 'Full Stack Developer' },
  { id: 'data_analyst', label: 'Data Analyst' },
];

export default function ResumePage() {
  const [file, setFile] = useState(null);
  const [role, setRole] = useState('software_engineer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) return toast.error('Please upload PDF or DOCX file');
    if (f.size > 10 * 1024 * 1024) return toast.error('File size must be under 10MB');
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const analyze = async () => {
    if (!file) return toast.error('Please upload a resume');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      fd.append('targetRole', role);
      const { data } = await api.post('/resume/analyze', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(data.resume);
      toast.success('Resume analyzed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = s => s >= 80 ? '#10b981' : s >= 60 ? '#06b6d4' : s >= 40 ? '#f59e0b' : '#ef4444';

  const radarData = result ? [
    { subject: 'Skills', value: result.analysis.sections?.skills || 0 },
    { subject: 'Experience', value: result.analysis.sections?.experience || 0 },
    { subject: 'Education', value: result.analysis.sections?.education || 0 },
    { subject: 'Format', value: result.analysis.sections?.formatting || 0 },
  ] : [];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>AI Resume Analyzer</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Upload your resume for intelligent analysis and optimization tips</p>

        <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 2fr' : '1fr', gap: '24px' }}>
          {/* Upload Panel */}
          <div>
            <div className="card" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Target Role</h2>
              <select className="select" value={role} onChange={e => setRole(e.target.value)}>
                {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Upload Resume</h2>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragging ? '#6366f1' : file ? '#10b981' : 'var(--border)'}`,
                  borderRadius: '12px', padding: '32px 20px', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: dragging ? 'rgba(99,102,241,0.05)' : file ? 'rgba(16,185,129,0.05)' : 'transparent'
                }}>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={e => handleFile(e.target.files[0])} />
                {file ? (
                  <>
                    <CheckCircle size={32} color="#10b981" style={{ marginBottom: '8px' }} />
                    <p style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem' }}>{file.name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{(file.size / 1024).toFixed(0)} KB</p>
                  </>
                ) : (
                  <>
                    <Upload size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                    <p style={{ fontWeight: 500, marginBottom: '4px', fontSize: '0.9rem' }}>Drop your resume here</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>PDF, DOC, DOCX • Max 10MB</p>
                  </>
                )}
              </div>
            </div>

            <button className="btn btn-primary" onClick={analyze} disabled={!file || loading} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
              {loading ? (
                <><span className="spinner" style={{ width: '16px', height: '16px' }} /> Analyzing with AI...</>
              ) : (
                <><BarChart2 size={16} /> Analyze Resume</>
              )}
            </button>

            {file && (
              <button className="btn btn-secondary" onClick={() => { setFile(null); setResult(null); }} style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}>
                Clear & Upload New
              </button>
            )}
          </div>

          {/* Results */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Score Header */}
              <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(6,182,212,0.05))', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: getScoreColor(result.analysis.score), lineHeight: 1 }}>
                      {result.analysis.score}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resume Score</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: getScoreColor(result.analysis.score) }}>{result.analysis.grade}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>{result.originalName}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '8px' }}>{result.analysis.summary}</p>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>ATS Score: <span style={{ color: getScoreColor(result.analysis.atsScore) }}>{result.analysis.atsScore}%</span></span>
                      <span style={{ color: 'var(--text-muted)' }}>Target: <span style={{ color: 'var(--accent-indigo)' }}>{ROLES.find(r => r.id === role)?.label}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid-2">
                {/* Radar Chart */}
                <div className="card">
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Section Breakdown</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <Radar name="Score" dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Section Scores */}
                <div className="card">
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Section Scores</h3>
                  {Object.entries(result.analysis.sections || {}).map(([key, val]) => (
                    <div key={key} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{key}</span>
                        <span style={{ color: getScoreColor(val), fontWeight: 600 }}>{val}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${val}%`, background: getScoreColor(val) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div className="grid-2">
                <div className="card">
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} color="#10b981" /> Present Skills ({(result.analysis.presentSkills || []).length})
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(result.analysis.presentSkills || []).slice(0, 8).map(s => (
                      <span key={s} className="tag" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <XCircle size={14} color="#ef4444" /> Missing Skills
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(result.analysis.missingSkills || []).map(s => (
                      <span key={s} className="tag" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Keyword Tips & Suggestions */}
              <div className="grid-2">
                <div className="card">
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lightbulb size={14} color="#f59e0b" /> Keyword Optimization
                  </h3>
                  {(result.analysis.keywordOptimization || []).map((t, i) => (
                    <p key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #f59e0b' }}>{t}</p>
                  ))}
                </div>
                <div className="card">
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target size={14} color="#6366f1" /> Role Suggestions
                  </h3>
                  {(result.analysis.roleSuggestions || []).map((s, i) => (
                    <p key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '12px', borderLeft: '2px solid #6366f1' }}>{s}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
