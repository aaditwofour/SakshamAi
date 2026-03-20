// components/shared/Sidebar.js
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Mic, FileText, History,
  Users, BarChart3, LogOut, Brain, ChevronRight
} from 'lucide-react';

const studentNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/interview', icon: Mic, label: 'AI Interview' },
  { to: '/resume', icon: FileText, label: 'Resume Analyzer' },
  { to: '/history', icon: History, label: 'My History' },
];

const adminNav = [
  { to: '/admin', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/students', icon: Users, label: 'Students' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user?.role === 'admin' ? adminNav : studentNav;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ marginBottom: '32px', paddingLeft: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Brain size={20} color="white" />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem' }}>
            Saksham<span style={{ color: '#6366f1' }}>AI</span>
          </span>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', paddingLeft: '46px' }}>
          {user?.role === 'admin' ? 'Admin Panel' : 'AI Interview Platform'}
        </p>
      </div>

      {/* User info */}
      <div style={{
        padding: '12px', marginBottom: '24px', borderRadius: '12px',
        background: 'var(--bg-card)', border: '1px solid var(--border)'
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', marginBottom: '8px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.875rem', fontWeight: 600
        }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '2px' }}>{user?.name}</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.email}</p>
        <span style={{
          display: 'inline-block', marginTop: '6px', padding: '2px 8px',
          borderRadius: '20px', fontSize: '0.65rem', fontWeight: 600,
          background: user?.role === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
          color: user?.role === 'admin' ? '#f59e0b' : '#6366f1',
          textTransform: 'uppercase', letterSpacing: '0.05em'
        }}>
          {user?.role}
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', paddingLeft: '8px' }}>
          Menu
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin' || to === '/dashboard'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '10px', marginBottom: '4px',
              textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
              transition: 'all 0.2s ease',
              background: isActive ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.1))' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
            })}
          >
            <Icon size={16} />
            {label}
            <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}>
        <LogOut size={16} />
        Logout
      </button>
    </aside>
  );
}
