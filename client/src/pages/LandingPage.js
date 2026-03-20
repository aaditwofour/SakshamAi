// pages/LandingPage.js
import React, { useEffect, useRef, useState } from 'react';
import { createNoise3D } from 'simplex-noise';
import { Link } from 'react-router-dom';
import { Brain, Mic, FileText, Shield, Globe, BarChart3, ArrowRight, CheckCircle } from 'lucide-react';

// ── Wavy Background Component (inline — no separate file needed) ───────────
const WavyBackground = ({
  children, colors, waveWidth, backgroundFill,
  blur = 10, speed = 'fast', waveOpacity = 0.5, style = {}, ...props
}) => {
  const canvasRef = useRef(null);
  const animationIdRef = useRef(null);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    setIsSafari(
      typeof window !== 'undefined' &&
      navigator.userAgent.includes('Safari') &&
      !navigator.userAgent.includes('Chrome')
    );
  }, []);

  useEffect(() => {
    const noise = createNoise3D();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = (ctx.canvas.width = window.innerWidth);
    let h = (ctx.canvas.height = window.innerHeight);
    ctx.filter = `blur(${blur}px)`;
    let nt = 0;

    const getSpeed = () => (speed === 'slow' ? 0.001 : 0.002);
    const waveColors = colors ?? ['#38bdf8', '#818cf8', '#c084fc', '#06b6d4', '#6366f1'];

    const drawWave = (n) => {
      nt += getSpeed();
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.lineWidth = waveWidth || 50;
        ctx.strokeStyle = waveColors[i % waveColors.length];
        for (let x = 0; x < w; x += 5) {
          const y = noise(x / 800, 0.3 * i, nt) * 100;
          ctx.lineTo(x, y + h * 0.5);
        }
        ctx.stroke();
        ctx.closePath();
      }
    };

    const render = () => {
      ctx.fillStyle = backgroundFill || '#0a0e1a';
      ctx.globalAlpha = waveOpacity ?? 0.5;
      ctx.fillRect(0, 0, w, h);
      drawWave(5);
      animationIdRef.current = requestAnimationFrame(render);
    };

    const handleResize = () => {
      w = ctx.canvas.width = window.innerWidth;
      h = ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(${blur}px)`;
    };

    window.addEventListener('resize', handleResize);
    render();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [blur, speed, waveOpacity, backgroundFill, waveWidth, colors]);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }} {...props}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const featuresRef = useRef(null);

  const features = [
    { icon: Mic, title: 'AI Interview Simulation', desc: 'Role-based interviews with voice input, real-time evaluation, and smart feedback.' },
    { icon: Shield, title: 'Proctoring System', desc: 'Face detection, tab-switch monitoring, and real-time alerts for integrity.' },
    { icon: FileText, title: 'Resume Analyzer', desc: 'Upload your CV and get ATS score, missing skills, and keyword optimization.' },
    { icon: Globe, title: 'Multilingual Support', desc: 'Interview and get analyzed in any language — Hindi, English, and more.' },
    { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Admin-level insights with charts, role breakdowns, and student performance.' },
    { icon: Brain, title: 'Hugging Face AI', desc: 'Powered by state-of-the-art NLP models for intelligent evaluation.' },
  ];

  const roles = ['Software Engineer', 'SQL Developer', 'Full Stack Developer', 'Data Analyst'];

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflowX: 'hidden' }}>

      {/* ── Sticky Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 60px', borderBottom: '1px solid rgba(99,102,241,0.15)',
        background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(12px)',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={20} color="white" />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.3rem', color: '#f0f4ff' }}>
            Saksham<span style={{ color: '#6366f1' }}>AI</span>
          </span>
        </div>
        <button onClick={scrollToFeatures} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(240,244,255,0.5)', fontSize: '0.8rem',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          Explore features ↓
        </button>
      </nav>

      {/* ── Hero — sticky wavy background ── */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', zIndex: 0 }}>
        <WavyBackground
          backgroundFill="#0a0e1a"
          colors={['#6366f1', '#38bdf8', '#818cf8', '#06b6d4', '#c084fc']}
          waveOpacity={0.4}
          blur={8}
          speed="slow"
          style={{ height: '100vh', width: '100%' }}
        >
          <div style={{
            height: '100vh',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: '0 24px', paddingTop: '80px',
          }}>

            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 16px', borderRadius: '20px', marginBottom: '28px',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)',
              fontSize: '0.8rem', color: '#a5b4fc',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', animation: 'blink 1.5s ease infinite' }} />
              AI-Powered Interview Platform
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 800,
              marginBottom: '20px', lineHeight: 1.1,
              color: '#ffffff',
              textShadow: '0 2px 40px rgba(0,0,0,0.5)',
            }}>
              Ace Your Interview with<br />
              <span style={{
                background: 'linear-gradient(135deg, #06b6d4, #6366f1, #c084fc)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Multilingual AI
              </span>
            </h1>

            {/* Subheading — white */}
            <p style={{
              fontSize: '1.1rem', color: '#ffffff',
              maxWidth: '580px', margin: '0 auto 24px', lineHeight: 1.7,
              textShadow: '0 1px 20px rgba(0,0,0,0.6)',
            }}>
              SakshamAI simulates real job interviews, evaluates your answers intelligently,
              analyzes your resume, and provides personalized feedback — in any language.
            </p>

            {/* Role chips */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
              {roles.map(r => (
                <span key={r} style={{
                  padding: '8px 18px', borderRadius: '20px', fontSize: '0.8rem',
                  background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff',
                }}>{r}</span>
              ))}
            </div>

            {/* Scroll down indicator */}
            <div
              onClick={scrollToFeatures}
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)' }}
            >
              <span style={{ fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll to explore</span>
              <div style={{ animation: 'bounceDown 1.5s ease infinite' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

          </div>
        </WavyBackground>
      </div>

      {/* ── Scrollable content over the fixed hero ── */}
      <div style={{ position: 'relative', zIndex: 10, background: 'var(--bg-primary)' }}>

        {/* ── Features ── */}
        <section ref={featuresRef} style={{ padding: '80px 60px', background: 'var(--bg-secondary)' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 700, marginBottom: '8px' }}>
            Everything You Need to{' '}
            <span style={{
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Succeed</span>
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '48px' }}>
            A complete AI-powered interview preparation ecosystem
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px', maxWidth: '1100px', margin: '0 auto',
          }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.1))',
                  border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} color="#6366f1" />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA with Login + Register buttons at bottom ── */}
        <section style={{ padding: '80px 60px', textAlign: 'center', background: 'var(--bg-primary)' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.05))',
            border: '1px solid rgba(99,102,241,0.2)', borderRadius: '24px',
            padding: '60px 40px', maxWidth: '700px', margin: '0 auto',
          }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '16px' }}>
              Ready to Land Your Dream Job?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
              Join thousands of candidates who improved their interview skills with SakshamAI.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
              {['Free to use', 'AI-powered evaluation', 'Multilingual support'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={14} color="#10b981" /> {t}
                </div>
              ))}
            </div>

            {/* Login + Create Account buttons */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary" style={{ padding: '14px 36px', fontSize: '1rem', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}>
                Create Account <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '14px 36px', fontSize: '1rem' }}>
                Login
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: '1px solid var(--border)', padding: '24px 60px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          color: 'var(--text-muted)', fontSize: '0.8rem',
        }}>
          <span>© 2024 SakshamAI. Multilingual AI Interview Platform.</span>
          <span>Powered by Hugging Face & MongoDB</span>
        </footer>
      </div>

      <style>{`
        @keyframes bounceDown {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(8px); }
        }
      `}</style>
    </div>
  );
}