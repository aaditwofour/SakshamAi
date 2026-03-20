// pages/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, Mic, FileText, TrendingUp, Award, Activity } from 'lucide-react';
import Sidebar from '../components/shared/Sidebar';
import api from '../utils/api';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="app-layout"><Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </main>
    </div>
  );

  const stats = data?.stats || {};
  const byRole = data?.byRole || [];
  const daily = data?.daily || [];
  const scoreDist = data?.scoreDistribution || [];

  // Format score distribution for pie chart
  const pieData = scoreDist.map((b, i) => ({
    name: b._id === 0 ? '0-20' : b._id === 20 ? '20-40' : b._id === 40 ? '40-60' : b._id === 60 ? '60-80' : '80-100',
    value: b.count
  })).filter(d => d.value > 0);

  // Format daily data
  const dailyFormatted = daily.map(d => ({
    date: new Date(d._id).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    count: d.count
  }));

  // Role data for bar chart
  const roleData = byRole.map(r => ({
    role: r._id?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).substring(0, 12),
    count: r.count,
    avg: Math.round(r.avgScore || 0)
  }));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '6px' }}>Admin Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Platform-wide performance overview</p>
        </div>

        {/* Stats Row */}
        <div className="grid-4" style={{ marginBottom: '32px' }}>
          {[
            { label: 'Total Students', value: stats.totalStudents || 0, icon: Users, color: '#6366f1' },
            { label: 'Total Interviews', value: stats.totalInterviews || 0, icon: Mic, color: '#06b6d4' },
            { label: 'Avg Score', value: `${stats.avgScore || 0}%`, icon: TrendingUp, color: '#10b981' },
            { label: 'Resumes Analyzed', value: stats.totalResumes || 0, icon: FileText, color: '#f59e0b' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="stat-label">{label}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={color} />
                </div>
              </div>
              <span className="stat-value" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          {/* Daily Activity */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#6366f1" /> Daily Interview Activity (7 days)
            </h3>
            {dailyFormatted.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dailyFormatted}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} name="Interviews" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No activity data yet
              </div>
            )}
          </div>

          {/* Score Distribution Pie */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} color="#10b981" /> Score Distribution
            </h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={10} formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{v}</span>} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} formatter={(v, n) => [v, `Score ${n}`]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No score data yet
              </div>
            )}
          </div>
        </div>

        {/* Role Performance Chart */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mic size={16} color="#06b6d4" /> Interviews by Role
          </h3>
          {roleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={roleData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="role" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                <Legend formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{v}</span>} />
                <Bar yAxisId="left" dataKey="count" fill="#6366f1" name="Interviews" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="avg" fill="#06b6d4" name="Avg Score %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No role data yet
            </div>
          )}
        </div>

        {/* Quick Summary Cards */}
        <div className="grid-3">
          {[
            { label: 'Completion Rate', value: stats.totalInterviews > 0 ? `${Math.round((stats.completedInterviews / stats.totalInterviews) * 100)}%` : '0%', desc: `${stats.completedInterviews || 0} of ${stats.totalInterviews || 0} completed` },
            { label: 'Top Role', value: byRole[0]?._id?.replace(/_/g, ' ') || 'N/A', desc: `${byRole[0]?.count || 0} interviews taken` },
            { label: 'Platform Status', value: 'Active', desc: 'All systems operational' },
          ].map(({ label, value, desc }) => (
            <div key={label} className="card">
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{label}</p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.3rem', marginBottom: '4px', color: 'var(--accent-indigo)' }}>{value}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
