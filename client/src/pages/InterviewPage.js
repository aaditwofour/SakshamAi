// pages/InterviewPage.js - Full AI Proctored Interview with Multilingual Speech
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Mic, MicOff, Camera, AlertTriangle, Clock,
  ChevronRight, Send, Play, CheckCircle, Globe, X
} from 'lucide-react';
import Sidebar from '../components/shared/Sidebar';
import api from '../utils/api';

const JOB_ROLES = [
  { id: 'software_engineer', label: 'Software Engineer', icon: '💻' },
  { id: 'sql_developer', label: 'SQL Developer', icon: '🗄️' },
  { id: 'full_stack_developer', label: 'Full Stack Developer', icon: '🌐' },
  { id: 'data_analyst', label: 'Data Analyst', icon: '📊' },
];

const LANGUAGES = [
  { code: 'en-US', label: 'English', native: 'English' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr-IN', label: 'Marathi', native: 'मराठी' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
  { code: 'gu-IN', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa-IN', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ur-PK', label: 'Urdu', native: 'اردو' },
  { code: 'fr-FR', label: 'French', native: 'Français' },
  { code: 'de-DE', label: 'German', native: 'Deutsch' },
  { code: 'es-ES', label: 'Spanish', native: 'Español' },
  { code: 'zh-CN', label: 'Chinese', native: '中文' },
  { code: 'ar-SA', label: 'Arabic', native: 'العربية' },
];

const getSpeechRecognition = () =>
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

export default function InterviewPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('setup');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [timer, setTimer] = useState(0);
  const [interviewId, setInterviewId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [proctoring, setProctoring] = useState({ tabSwitches: 0, faceAbsences: 0, violations: [] });
  const [alerts, setAlerts] = useState([]);
  const [interimText, setInterimText] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const alertTimeoutRef = useRef(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    if (!getSpeechRecognition()) setSpeechSupported(false);
  }, []);

  // Timer
  useEffect(() => {
    if (phase === 'interview') {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      // Wait for next render so videoRef is mounted, then assign stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      toast.warning('Camera not available — continuing without camera.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraOn(false);
  }, []);

  // Tab switch detection
  useEffect(() => {
    if (phase !== 'interview') return;
    const handleVisibility = () => {
      if (document.hidden) {
        setProctoring(p => ({
          ...p,
          tabSwitches: p.tabSwitches + 1,
          violations: [...p.violations, { message: 'Tab switch detected', timestamp: new Date() }]
        }));
        addAlert('⚠️ Tab switch detected! This has been recorded.', 'warning');
        api.post('/interview/proctoring', { interviewId, eventType: 'tab_switch', message: 'Tab switch' }).catch(() => { });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [phase, interviewId]);

  const addAlert = (msg, type = 'warning') => {
    const id = Date.now();
    setAlerts(a => [...a.slice(-2), { id, msg, type }]);
    clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => setAlerts(a => a.filter(x => x.id !== id)), 5000);
  };

  // Speech Recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
    if (finalTranscriptRef.current) {
      setCurrentAnswer(prev => (prev + ' ' + finalTranscriptRef.current).trim());
      finalTranscriptRef.current = '';
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setMicError('Speech recognition is not supported. Please use Google Chrome.');
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }
    setMicError('');
    finalTranscriptRef.current = '';

    const rec = new SpeechRecognition();
    rec.lang = selectedLang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setIsListening(true); setMicError(''); };

    rec.onresult = (e) => {
      let interim = '';
      let finalChunk = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalChunk += text + ' ';
        else interim += text;
      }
      if (finalChunk) {
        finalTranscriptRef.current += finalChunk;
        setCurrentAnswer(prev => (prev + ' ' + finalChunk).trim());
      }
      setInterimText(interim);
    };

   rec.onerror = (e) => {
      setInterimText('');

      // 'network' on Chrome is almost always a false alarm — silently restart
      if (e.error === 'network') {
        setTimeout(() => {
          if (recognitionRef.current === rec) {
            try { rec.start(); } catch { setIsListening(false); }
          }
        }, 1000);
        return; // don't show any error to the user
      }

      // 'aborted' and 'no-speech' are non-fatal — don't stop listening
      if (e.error === 'aborted' || e.error === 'no-speech') {
        return;
      }

      // Fatal errors — stop and show message
      setIsListening(false);
      const errorMap = {
        'not-allowed':         '🎤 Microphone permission denied. Allow microphone in browser settings.',
        'audio-capture':       '🎤 No microphone found. Please connect a microphone.',
        'service-not-allowed': '🎤 Speech service blocked. Try refreshing the page.',
      };
      const msg = errorMap[e.error] ?? `Speech error: ${e.error}`;
      if (msg) { setMicError(msg); toast.error(msg); }
    };

    rec.onend = () => {
      setInterimText('');
      if (recognitionRef.current === rec) {
        // Small delay prevents Chrome from throwing rapid network errors
        setTimeout(() => {
          if (recognitionRef.current === rec) {
            try { rec.start(); } catch { setIsListening(false); }
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setMicError('Could not start microphone. Please refresh and try again.');
      setIsListening(false);
    }
  }, [selectedLang]);

  // Restart recognition when language changes mid-interview
  useEffect(() => {
    if (isListening) {
      stopListening();
      setTimeout(() => startListening(), 300);
    }
    // eslint-disable-next-line
  }, [selectedLang]);

  // Start interview
  const startInterview = async () => {
    if (!selectedRole) return toast.error('Please select a job role');
    try {
      const [qData, sData] = await Promise.all([
        api.get(`/interview/questions/${selectedRole}`),
        api.post('/interview/start', { jobRole: selectedRole })
      ]);
      setQuestions(qData.data.questions);
      setAnswers(new Array(qData.data.questions.length).fill(''));
      setInterviewId(sData.data.interviewId);
      await startCamera();
      setPhase('interview');
      toast.success('Interview started! Good luck! 🎯');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start interview');
    }
  };

  // Navigation
  const saveCurrentAnswer = () => {
    const updated = [...answers];
    updated[currentQ] = currentAnswer;
    setAnswers(updated);
    return updated;
  };

  const goToQuestion = (index, updatedAnswers) => {
    const arr = updatedAnswers || saveCurrentAnswer();
    setCurrentQ(index);
    setCurrentAnswer(arr[index] || '');
    finalTranscriptRef.current = '';
    setInterimText('');
  };

  const goNext = () => { if (currentQ < questions.length - 1) goToQuestion(currentQ + 1); };
  const goPrev = () => { if (currentQ > 0) goToQuestion(currentQ - 1); };

  // Submit
  const submitInterview = async () => {
    stopListening();
    const updated = saveCurrentAnswer();
    const payload = questions.map((q, i) => ({
      questionId: q.id, question: q.question,
      answer: updated[i] || '', language: selectedLang
    }));
    setPhase('submitting');
    stopCamera();
    try {
      const { data } = await api.post('/interview/submit', {
        interviewId, answers: payload, duration: timer, proctoring
      });
      toast.success('Interview submitted! Analyzing answers...');
      navigate(`/interview/result/${data.interview._id}`);
    } catch {
      toast.error('Failed to submit. Please try again.');
      setPhase('interview');
    }
  };

  // Cleanup
  useEffect(() => () => { stopCamera(); stopListening(); }, [stopCamera, stopListening]);

  const answered = answers.filter(a => a?.trim()).length;
  const langLabel = LANGUAGES.find(l => l.code === selectedLang)?.native || 'EN';

  // ── SETUP PHASE ──────────────────────────────────────────────────────────
  if (phase === 'setup') return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>AI Interview Simulator</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Configure your interview session</p>

        <div style={{ maxWidth: '700px' }}>
          {/* Role */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Select Job Role</h2>
            <div className="grid-2">
              {JOB_ROLES.map(role => (
                <button key={role.id} onClick={() => setSelectedRole(role.id)} style={{
                  padding: '16px', borderRadius: '12px', cursor: 'pointer',
                  background: selectedRole === role.id ? 'rgba(99,102,241,0.15)' : 'var(--bg-secondary)',
                  border: selectedRole === role.id ? '2px solid #6366f1' : '2px solid var(--border)',
                  color: 'var(--text-primary)', textAlign: 'left', transition: 'all 0.2s'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{role.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{role.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="var(--accent-cyan)" /> Answer Language
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Choose the language you will speak your answers in
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => setSelectedLang(l.code)} style={{
                  padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                  background: selectedLang === l.code ? 'rgba(6,182,212,0.15)' : 'var(--bg-secondary)',
                  border: selectedLang === l.code ? '2px solid #06b6d4' : '2px solid var(--border)',
                  color: selectedLang === l.code ? '#06b6d4' : 'var(--text-secondary)',
                  textAlign: 'left', transition: 'all 0.2s', fontFamily: 'var(--font-body)'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.native}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{l.label}</div>
                </button>
              ))}
            </div>
            {!speechSupported && (
              <div className="alert alert-warning" style={{ marginTop: '12px', fontSize: '0.8rem' }}>
                ⚠️ Your browser does not support voice input. Use <strong>Google Chrome</strong>. You can still type answers.
              </div>
            )}
          </div>

          {/* Rules */}
          <div className="alert alert-info" style={{ marginBottom: '20px' }}>
            <p style={{ fontWeight: 600, marginBottom: '6px' }}>📋 Interview Rules</p>
            <ul style={{ paddingLeft: '16px', lineHeight: 1.8, fontSize: '0.8rem' }}>
              <li>Camera must remain on throughout the interview</li>
              <li>Tab switching will be detected and logged</li>
              <li>You have 10 questions to answer</li>
              <li>Answer by typing or using the voice input button</li>
              <li>You can answer in any of the 16 supported languages</li>
            </ul>
          </div>

          <button className="btn btn-primary" onClick={startInterview} disabled={!selectedRole}
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem' }}>
            <Play size={18} /> Start Interview
          </button>
        </div>
      </main>
    </div>
  );

  // ── SUBMITTING PHASE ─────────────────────────────────────────────────────
  if (phase === 'submitting') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', gap: '20px' }}>
      <div style={{ width: '60px', height: '60px', border: '4px solid var(--border)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem' }}>Evaluating Your Answers</h2>
      <p style={{ color: 'var(--text-secondary)' }}>AI is analyzing your responses... This may take up to 30 seconds.</p>
    </div>
  );

  // ── INTERVIEW PHASE ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* Top Bar */}
      <header style={{ padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#6366f1' }}>SakshamAI</div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {selectedRole.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Interview
          </span>
        </div>

        {/* Language switcher during interview */}
        <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          {LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.native} ({l.label})</option>
          ))}
        </select>

        {/* Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '20px', padding: '6px 14px' }}>
          <Clock size={14} color="#ef4444" />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#ef4444', fontSize: '1rem' }}>{formatTime(timer)}</span>
        </div>

        {proctoring.tabSwitches > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#f59e0b' }}>
            <AlertTriangle size={14} /> {proctoring.tabSwitches} violations
          </div>
        )}
      </header>

      {/* Alerts */}
      <div style={{ position: 'fixed', top: '64px', right: '16px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.map(a => (
          <div key={a.id} className="alert alert-warning" style={{ minWidth: '280px', animation: 'fadeInUp 0.3s ease' }}>{a.msg}</div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 300px' }}>

        {/* Left: Question + Answer */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>

          {/* Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Question {currentQ + 1} of {questions.length}</span>
              <span style={{ color: 'var(--accent-indigo)' }}>{answered}/{questions.length} answered</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
            </div>
          </div>

          {/* Question */}
          {questions[currentQ] && (
            <div className="card card-glow" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(99,102,241,0.15)', color: '#6366f1', textTransform: 'uppercase' }}>
                  {questions[currentQ].topic}
                </span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {questions[currentQ].difficulty}
                </span>
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.5 }}>{questions[currentQ].question}</h2>
            </div>
          )}

          {/* Answer */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Answer</label>
                <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Speaking in: <strong style={{ color: '#06b6d4' }}>{langLabel}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {currentAnswer && (
                  <button onClick={() => { setCurrentAnswer(''); finalTranscriptRef.current = ''; }}
                    className="btn btn-secondary" style={{ padding: '7px 12px', fontSize: '0.75rem' }}>
                    <X size={12} /> Clear
                  </button>
                )}
                {speechSupported ? (
                  <button onClick={isListening ? stopListening : startListening}
                    className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    {isListening ? 'Stop' : 'Voice Input'}
                    {isListening && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'blink 0.8s ease infinite' }} />}
                  </button>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Voice: Chrome only</span>
                )}
              </div>
            </div>

            {micError && (
              <div className="alert alert-error" style={{ marginBottom: '10px', fontSize: '0.8rem' }}>{micError}</div>
            )}

            {isListening && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'blink 0.8s ease infinite', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 500 }}>Listening — speak now in {langLabel}</span>
                {interimText && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '4px' }}>"{interimText}"</span>
                )}
              </div>
            )}

            <textarea className="input" value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)}
              placeholder={`Type your answer here, or click "Voice Input" to speak in ${langLabel}...`}
              style={{ minHeight: '140px', fontFamily: 'var(--font-body)', lineHeight: 1.6 }} />
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={goPrev} disabled={currentQ === 0}>← Previous</button>
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQ < questions.length - 1 ? (
                <button className="btn btn-primary" onClick={goNext}>Next <ChevronRight size={16} /></button>
              ) : (
                <button className="btn btn-success" onClick={submitInterview}><Send size={16} /> Submit Interview</button>
              )}
            </div>
          </div>

          {/* Question navigator */}
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Jump to question</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {questions.map((_, i) => (
                <button key={i} onClick={() => goToQuestion(i)} style={{
                  width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                  fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.75rem',
                  border: i === currentQ ? '2px solid #6366f1' : '2px solid var(--border)',
                  background: answers[i]?.trim() ? 'rgba(16,185,129,0.15)' : i === currentQ ? 'rgba(99,102,241,0.15)' : 'var(--bg-secondary)',
                  color: answers[i]?.trim() ? '#10b981' : i === currentQ ? '#6366f1' : 'var(--text-muted)',
                }}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Camera + Proctoring */}
        <div style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={12} /> Camera Feed
              <span style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: cameraOn ? '#10b981' : '#ef4444', animation: cameraOn ? 'blink 2s ease infinite' : 'none' }} />
            </div>
            <div className={`camera-box ${!cameraOn ? 'danger' : ''}`} style={{ aspectRatio: '4/3', position: 'relative' }}>
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current) {
                    el.srcObject = streamRef.current;
                  }
                }}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {!cameraOn && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Camera size={24} color="var(--text-muted)" />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Camera offline</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Proctoring Status
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Camera Active', active: cameraOn },
                { label: 'No Tab Switches', active: proctoring.tabSwitches === 0 },
                { label: 'Session Secure', active: proctoring.violations.length < 3 },
              ].map(({ label, active }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: active ? '#10b981' : '#ef4444' }} />
                  <span style={{ color: active ? 'var(--text-primary)' : 'var(--accent-red)', flex: 1 }}>{label}</span>
                  {active ? <CheckCircle size={12} color="#10b981" /> : <AlertTriangle size={12} color="#ef4444" />}
                </div>
              ))}
            </div>
          </div>

          {proctoring.tabSwitches > 0 && (
            <div className="alert alert-warning" style={{ fontSize: '0.75rem' }}>
              <AlertTriangle size={14} style={{ marginBottom: '4px' }} />
              <p><strong>Tab Switches:</strong> {proctoring.tabSwitches}</p>
              <p style={{ marginTop: '4px', opacity: 0.8 }}>Violations are logged and reported.</p>
            </div>
          )}

          <button className="btn btn-success" onClick={submitInterview} style={{ justifyContent: 'center', marginTop: 'auto' }}>
            <Send size={14} /> Submit Interview
          </button>
        </div>
      </div>
    </div>
  );
}