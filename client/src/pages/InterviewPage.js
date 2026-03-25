// pages/InterviewPage.js — AssemblyAI v2 via server proxy token
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Mic, MicOff, Camera, AlertTriangle, Clock,
  ChevronRight, Send, Play, CheckCircle, Globe, X, Volume2, VolumeX
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

function speakText(text, langCode, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langCode;
  utter.rate = 0.92;
  utter.pitch = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find(v => v.lang.startsWith(langCode.slice(0, 2)));
  if (match) utter.voice = match;
  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
}

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
  const [cameraOn, setCameraOn] = useState(false);
  const [proctoring, setProctoring] = useState({ tabSwitches: 0, faceAbsences: 0, violations: [] });
  const [alerts, setAlerts] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [faceCount, setFaceCount] = useState(0);
  const [proctoringMsg, setProctoringMsg] = useState('');
  const [micStatus, setMicStatus] = useState('idle');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const micStreamRef = useRef(null);
  const wsRef = useRef(null);
  const processorRef = useRef(null);
  const audioCtxRef = useRef(null);
  const timerRef = useRef(null);
  const alertTimeoutRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const interimRef = useRef('');
  const faceDetectIntervalRef = useRef(null);
  const autoSubmitCalledRef = useRef(false);
  const isListeningRef = useRef(false);
  const currentQRef = useRef(0);
  const answersRef = useRef([]);
  const currentAnswerRef = useRef('');
  const interviewIdRef = useRef(null);
  const proctoringRef = useRef({ tabSwitches: 0, faceAbsences: 0, violations: [] });
  const timerValueRef = useRef(0);
  const selectedLangRef = useRef('en-US');

  useEffect(() => { currentQRef.current = currentQ; }, [currentQ]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { currentAnswerRef.current = currentAnswer; }, [currentAnswer]);
  useEffect(() => { interviewIdRef.current = interviewId; }, [interviewId]);
  useEffect(() => { proctoringRef.current = proctoring; }, [proctoring]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { timerValueRef.current = timer; }, [timer]);
  useEffect(() => { selectedLangRef.current = selectedLang; }, [selectedLang]);

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  useEffect(() => {
    if (phase === 'interview') timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // Auto-submit after 30 minutes (1800 seconds)
  useEffect(() => {
    if (phase === 'interview' && timer >= 1800) {
      addAlert('Time limit of 30 minutes reached. Auto-submitting.', 'error');
      autoSubmit('30-minute time limit exceeded');
    }
  }, [timer, phase, autoSubmit]);

  const formatTime = s =>
    String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { });
        }
      }, 100);
    } catch { toast.warning('Camera not available.'); }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraOn(false);
  }, []);

  const cleanupAudio = useCallback(() => {
    try { processorRef.current?.disconnect(); } catch (_) { }
    try { audioCtxRef.current?.close(); } catch (_) { }
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ terminate_session: true }));
        wsRef.current.close(1000, 'done');
      }
    } catch (_) { }
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current = null;
    audioCtxRef.current = null;
    wsRef.current = null;
    micStreamRef.current = null;
  }, []);

  const autoSubmit = useCallback(async (reason) => {
    if (autoSubmitCalledRef.current) return;
    autoSubmitCalledRef.current = true;
    window.speechSynthesis?.cancel();
    isListeningRef.current = false;
    cleanupAudio();
    setIsListening(false);
    clearInterval(faceDetectIntervalRef.current);
    clearInterval(timerRef.current);
    toast.error('Auto-submitted: ' + reason, { autoClose: 8000 });
    const saved = [...answersRef.current];
    saved[currentQRef.current] = currentAnswerRef.current || saved[currentQRef.current] || '';
    const qs = window.__ivQuestions || [];
    const payload = saved.map((ans, i) => ({
      questionId: qs[i] ? qs[i].id : ('q' + (i + 1)),
      question: qs[i] ? qs[i].question : ('Question ' + (i + 1)),
      answer: ans || '', language: selectedLangRef.current,
    }));
    const fp = {
      ...proctoringRef.current,
      violations: [...proctoringRef.current.violations, { message: reason, timestamp: new Date() }],
    };
    setPhase('submitting');
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setCameraOn(false);
    try {
      const { data } = await api.post('/interview/submit', {
        interviewId: interviewIdRef.current, answers: payload,
        duration: timerValueRef.current, proctoring: fp,
      });
      navigate('/interview/result/' + data.interview._id);
    } catch (err) {
      toast.error('Auto-submit failed — please submit manually.');
      setPhase('interview');
      autoSubmitCalledRef.current = false;
    }
  }, [navigate, cleanupAudio]);

  const addAlert = (msg, type = 'warning') => {
    const id = Date.now();
    setAlerts(a => [...a.slice(-2), { id, msg, type }]);
    clearTimeout(alertTimeoutRef.current);
    alertTimeoutRef.current = setTimeout(() => setAlerts(a => a.filter(x => x.id !== id)), 6000);
  };

  useEffect(() => {
    if (phase !== 'interview') return;
    const h = () => {
      if (!document.hidden) return;
      setProctoring(p => {
        const n = {
          ...p, tabSwitches: p.tabSwitches + 1,
          violations: [...p.violations, { message: 'Tab switch', timestamp: new Date() }],
        };
        proctoringRef.current = n;
        if (n.tabSwitches >= 3) {
          autoSubmit('3 or more tab switches');
        } else {
          api.post('/interview/proctoring', {
            interviewId: interviewIdRef.current, eventType: 'tab_switch', message: 'Tab switch'
          }).catch(() => { });
        }
        return n;
      });
      addAlert('Tab switch detected!', 'warning');
    };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, [phase, autoSubmit]);

  useEffect(() => {
    if (phase !== 'interview') return;
    const orig = navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices);
    if (orig) {
      navigator.mediaDevices.getDisplayMedia = async (...args) => {
        addAlert('Screen sharing detected. Auto-submitting.', 'error');
        autoSubmit('Screen sharing detected');
        return orig(...args);
      };
    }
    return () => { if (orig && navigator.mediaDevices) navigator.mediaDevices.getDisplayMedia = orig; };
  }, [phase, autoSubmit]);

  useEffect(() => {
    if (phase !== 'interview' || !cameraOn) return;
    let mounted = true;

    const loadAndDetect = async () => {
      try {
        const faceapi = await import('face-api.js');
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');

        const detect = async () => {
          if (!mounted || !videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const detections = await faceapi.detectAllFaces(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
            );
            const faces = detections.length;
            setFaceCount(faces);

            if (faces === 0) {
              setProctoringMsg('No face detected');
              addAlert('Face not visible. Please stay in frame.', 'warning');
            } else if (faces > 1) {
              const msg = 'Multiple faces detected (' + faces + ')';
              setProctoringMsg(msg);
              addAlert('Multiple faces detected. Auto-submitting.', 'error');
              clearInterval(faceDetectIntervalRef.current);
              autoSubmit(msg);
            } else {
              setProctoringMsg('Monitoring active');
            }
          } catch { }
        };

        faceDetectIntervalRef.current = setInterval(detect, 2500);
      } catch (err) {
        console.error('face-api load error:', err);
      }
    };

    loadAndDetect();
    return () => {
      mounted = false;
      clearInterval(faceDetectIntervalRef.current);
    };
  }, [phase, cameraOn, autoSubmit]);

  const speakQuestion = useCallback((text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    setIsSpeaking(true);
    speakText(text, selectedLang, () => setIsSpeaking(false));
  }, [ttsEnabled, selectedLang]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (phase !== 'interview' || !questions[currentQ] || !ttsEnabled) return;
    const t = setTimeout(() => speakQuestion(questions[currentQ].question), 400);
    return () => clearTimeout(t);
  }, [currentQ, phase, questions, speakQuestion, ttsEnabled]);

  useEffect(() => { stopSpeaking(); }, [selectedLang, stopSpeaking]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setMicStatus('idle');
    setInterimText('');
    interimRef.current = '';
    cleanupAudio();
    if (finalTranscriptRef.current.trim()) {
      setCurrentAnswer(finalTranscriptRef.current.trim());
    }
    finalTranscriptRef.current = '';
  }, [cleanupAudio]);

  const startListening = useCallback(async () => {
    setMicError('');
    setMicStatus('connecting');
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      const tokenRes = await api.post('/interview/stt-token');
      const { token } = tokenRes.data;
      if (!token) throw new Error('Could not get transcription token from server');
      const lang = selectedLangRef.current.slice(0, 2);
      const wsUrl = 'wss://api.deepgram.com/v1/listen' +
        '?encoding=linear16' +
        '&sample_rate=16000' +
        '&language=' + lang +
        '&interim_results=true';
      const ws = new WebSocket(wsUrl, ['token', token]);
      wsRef.current = ws;
      ws.onopen = () => {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx({ sampleRate: 16000 });
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(micStream);
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const float32 = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(float32.length);
          for (let i = 0; i < float32.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32768)));
          }
         wsRef.current.send(int16.buffer);
        };
        source.connect(processor);
        processor.connect(ctx.destination);
        isListeningRef.current = true;
        setIsListening(true);
        setMicStatus('ready');
        setMicError('');
        finalTranscriptRef.current = (currentAnswerRef.current || '').trim();
      };
      ws.onmessage = (e) => {
    try {
    const msg = JSON.parse(e.data);
    const transcript = msg?.channel?.alternatives?.[0]?.transcript;
    if (!transcript) return;
    const isFinal = msg.is_final;
    if (isFinal) {
      finalTranscriptRef.current = (finalTranscriptRef.current + ' ' + transcript).trim();
      interimRef.current = '';
      setCurrentAnswer(finalTranscriptRef.current);
      setInterimText('');
    } else {
      interimRef.current = transcript;
      const base = finalTranscriptRef.current;
      setCurrentAnswer(base ? base + ' ' + transcript : transcript);
      setInterimText(transcript);
    }
  } catch {}
};
      ws.onerror = () => {
        setMicError('Connection error. Check microphone permissions or Deepgram API key.');
        setMicStatus('error');
        stopListening();
      };
      ws.onclose = (e) => {
        if (isListeningRef.current) {
          if (e.code !== 1000) {
            setMicError('Connection closed (' + e.code + '): ' + (e.reason || 'unexpected'));
            setMicStatus('error');
          }
          stopListening();
        }
      };
    } catch (err) {
      cleanupAudio();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicError('Mic permission denied. Click the lock icon in your address bar and allow microphone.');
      } else if (err.name === 'NotFoundError') {
        setMicError('No microphone found. Connect a mic and refresh.');
      } else {
        setMicError('Error: ' + err.message);
      }
      setMicStatus('error');
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [selectedLang, stopListening, cleanupAudio]);

  const startInterview = async () => {
    if (!selectedRole) return toast.error('Please select a job role');
    try {
      const [qData, sData] = await Promise.all([
        api.get('/interview/questions/' + selectedRole),
        api.post('/interview/start', { jobRole: selectedRole })
      ]);
      const qs = qData.data.questions;
      window.__ivQuestions = qs;
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(''));
      answersRef.current = new Array(qs.length).fill('');
      setInterviewId(sData.data.interviewId);
      await startCamera();
      setPhase('interview');
      toast.success('Interview started! Good luck!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to start interview'); }
  };

  const saveCurrentAnswer = () => {
    const updated = [...answers];
    updated[currentQ] = currentAnswer;
    setAnswers(updated);
    answersRef.current = updated;
    return updated;
  };

  const goToQuestion = (index, updatedAnswers) => {
    const arr = updatedAnswers || saveCurrentAnswer();
    stopSpeaking();
    setCurrentQ(index);
    setCurrentAnswer(arr[index] || '');
    finalTranscriptRef.current = arr[index] || '';
    interimRef.current = '';
    setInterimText('');
  };

  const goNext = () => { if (currentQ < questions.length - 1) goToQuestion(currentQ + 1); };
  const goPrev = () => { if (currentQ > 0) goToQuestion(currentQ - 1); };

  const submitInterview = async () => {
    stopListening();
    stopSpeaking();
    const updated = saveCurrentAnswer();
    const payload = questions.map((q, i) => ({
      questionId: q.id, question: q.question,
      answer: updated[i] || '', language: selectedLang
    }));
    setPhase('submitting');
    stopCamera();
    clearInterval(faceDetectIntervalRef.current);
    try {
      const { data } = await api.post('/interview/submit', {
        interviewId, answers: payload, duration: timer, proctoring
      });
      toast.success('Submitted! Analyzing answers...');
      navigate('/interview/result/' + data.interview._id);
    } catch {
      toast.error('Failed to submit. Please try again.');
      setPhase('interview');
    }
  };

  useEffect(() => () => {
    stopCamera(); stopListening(); stopSpeaking();
    clearInterval(faceDetectIntervalRef.current);
    window.speechSynthesis?.cancel();
  }, [stopCamera, stopListening, stopSpeaking]);

  const answered = answers.filter(a => a?.trim()).length;
  const langLabel = LANGUAGES.find(l => l.code === selectedLang)?.native || 'EN';

  if (phase === 'setup') return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '8px' }}>AI Interview Simulator</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Configure your interview session</p>
        <div style={{ maxWidth: '700px' }}>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Select Job Role</h2>
            <div className="grid-2">
              {JOB_ROLES.map(role => (
                <button key={role.id} onClick={() => setSelectedRole(role.id)} style={{
                  padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                  background: selectedRole === role.id ? 'rgba(255,255,255,.08)' : 'var(--bg-secondary)',
                  border: selectedRole === role.id ? '2px solid rgba(255,255,255,.3)' : '2px solid var(--border)',
                  color: 'var(--text-primary)', transition: 'all 0.2s'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{role.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{role.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} /> Answer Language
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Questions will be read aloud and your voice recognized in this language
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => setSelectedLang(l.code)} style={{
                  padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                  background: selectedLang === l.code ? 'rgba(255,255,255,.08)' : 'var(--bg-secondary)',
                  border: selectedLang === l.code ? '2px solid rgba(255,255,255,.3)' : '2px solid var(--border)',
                  color: selectedLang === l.code ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all 0.2s', fontFamily: 'var(--font-body)'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{l.native}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{l.label}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="alert alert-info" style={{ marginBottom: '20px' }}>
            <p style={{ fontWeight: 600, marginBottom: '6px' }}>Interview Rules</p>
            <ul style={{ paddingLeft: '16px', lineHeight: 1.8, fontSize: '0.8rem' }}>
              <li>Each question will be read aloud — ensure your speakers are on</li>
              <li>Camera must remain on — only your face should be visible</li>
              <li>Multiple faces trigger immediate auto-submission</li>
              <li>3 or more tab switches trigger auto-submission</li>
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

  if (phase === 'submitting') return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', gap: '20px' }}>
      <div style={{ width: '60px', height: '60px', border: '4px solid var(--border)', borderTopColor: 'rgba(255,255,255,.6)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem' }}>Evaluating Your Answers</h2>
      <p style={{ color: 'var(--text-secondary)' }}>AI is analyzing your responses — this may take up to 30 seconds.</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <header style={{ padding: '12px 24px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '14px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem' }}>SakshamAI</div>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {selectedRole.replace(/_/g, ' ')} Interview
        </div>
        <button onClick={() => { setTtsEnabled(e => !e); stopSpeaking(); }}
          className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '5px' }}>
          {ttsEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          {ttsEnabled ? 'Audio On' : 'Audio Off'}
        </button>
        <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)', padding: '6px 10px', fontSize: '0.8rem', cursor: 'pointer' }}>
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native} ({l.label})</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '20px', padding: '6px 14px' }}>
          <Clock size={13} color="var(--text-secondary)" />
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem' }}>{formatTime(timer)}</span>
        </div>
        {proctoring.tabSwitches > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'rgba(255,255,255,.45)' }}>
            <AlertTriangle size={13} /> {proctoring.tabSwitches}/3
          </div>
        )}
      </header>
      <div style={{ position: 'fixed', top: '64px', left: '16px', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {alerts.map(a => (
          <div key={a.id} className={'alert alert-' + (a.type === 'error' ? 'error' : 'warning')} style={{ minWidth: '300px' }}>{a.msg}</div>
        ))}
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px' }}>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Question {currentQ + 1} of {questions.length}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{answered}/{questions.length} answered</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: ((currentQ + 1) / questions.length * 100) + '%' }} />
            </div>
          </div>
          {questions[currentQ] && (
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {questions[currentQ].topic}
                </span>
                <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', background: 'rgba(255,255,255,.04)', color: 'var(--text-muted)' }}>
                  {questions[currentQ].difficulty}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSpeaking && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'rgba(255,255,255,.45)' }}>
                      <span style={{ display: 'flex', gap: '2px', alignItems: 'flex-end' }}>
                        {[8, 12, 6, 10, 4].map((h, i) => (
                          <span key={i} style={{ width: '3px', height: h + 'px', background: 'rgba(255,255,255,.45)', borderRadius: '1px', animation: 'blink ' + (0.4 + i * 0.1) + 's ease infinite', display: 'inline-block' }} />
                        ))}
                      </span>
                      Reading...
                    </div>
                  )}
                  <button onClick={() => isSpeaking ? stopSpeaking() : speakQuestion(questions[currentQ].question)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', fontSize: '0.72rem', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', cursor: 'pointer' }}>
                    {isSpeaking ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    {isSpeaking ? 'Stop' : 'Read aloud'}
                  </button>
                </div>
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.55 }}>{questions[currentQ].question}</h2>
            </div>
          )}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Answer</label>
                <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Language: <strong style={{ color: 'var(--text-secondary)' }}>{langLabel}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {currentAnswer && (
                  <button onClick={() => { setCurrentAnswer(''); finalTranscriptRef.current = ''; }}
                    className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                    <X size={12} /> Clear
                  </button>
                )}
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={micStatus === 'connecting'}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '6px', background: isListening ? 'rgba(255,255,255,.1)' : undefined, borderColor: isListening ? 'rgba(255,255,255,.3)' : undefined }}>
                  {micStatus === 'connecting'
                    ? <><span style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,.2)', borderTopColor: 'rgba(255,255,255,.7)', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> Connecting...</>
                    : isListening ? <><MicOff size={14} /> Stop mic</>
                      : <><Mic size={14} /> Voice Input</>
                  }
                </button>
              </div>
            </div>
            {micError && (
              <div className="alert alert-error" style={{ marginBottom: '10px', fontSize: '0.8rem' }}>{micError}</div>
            )}
            {isListening && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)' }}>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', flexShrink: 0 }}>
                  {[10, 14, 8, 12, 6, 14, 10].map((h, i) => (
                    <span key={i} style={{ width: '3px', height: h + 'px', background: 'rgba(255,255,255,.7)', borderRadius: '2px', animation: 'blink ' + (0.4 + i * 0.07) + 's ease infinite', display: 'inline-block' }} />
                  ))}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,.75)', marginBottom: interimText ? '3px' : 0 }}>
                    Listening in {langLabel}...
                  </div>
                  {interimText && (
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,.4)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {interimText}
                    </div>
                  )}
                </div>
              </div>
            )}
            <textarea className="input" value={currentAnswer}
              onChange={e => { setCurrentAnswer(e.target.value); finalTranscriptRef.current = e.target.value; }}
              placeholder={'Type your answer, or click "Voice Input" to speak in ' + langLabel + '...'}
              style={{ minHeight: '140px', fontFamily: 'var(--font-body)', lineHeight: 1.6 }} />
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={goPrev} disabled={currentQ === 0}>← Previous</button>
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentQ < questions.length - 1
                ? <button className="btn btn-primary" onClick={goNext}>Next <ChevronRight size={16} /></button>
                : <button className="btn btn-primary" onClick={submitInterview}><Send size={16} /> Submit</button>
              }
            </div>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Jump to question</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {questions.map((_, i) => (
                <button key={i} onClick={() => goToQuestion(i)} style={{
                  width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                  border: i === currentQ ? '2px solid rgba(255,255,255,.5)' : '1px solid var(--border)',
                  background: answers[i]?.trim() ? 'rgba(255,255,255,.12)' : i === currentQ ? 'rgba(255,255,255,.08)' : 'var(--bg-secondary)',
                  color: answers[i]?.trim() ? 'rgba(255,255,255,.85)' : i === currentQ ? 'rgba(255,255,255,.7)' : 'var(--text-muted)',
                }}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={11} /> Camera
              <span style={{ marginLeft: 'auto', width: '7px', height: '7px', borderRadius: '50%', background: cameraOn ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.2)', animation: cameraOn ? 'blink 2s ease infinite' : 'none' }} />
            </div>
            <div className={'camera-box' + (faceCount > 1 ? ' danger' : '')} style={{ aspectRatio: '4/3', position: 'relative' }}>
              <video ref={el => { videoRef.current = el; if (el && streamRef.current) el.srcObject = streamRef.current; }}
                autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {!cameraOn && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Camera size={22} color="var(--text-muted)" />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Camera offline</p>
                </div>
              )}
              {cameraOn && (
                <div style={{ position: 'absolute', bottom: '6px', left: '6px', padding: '2px 8px', borderRadius: '6px', fontSize: '0.62rem', background: faceCount > 1 ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.12)', color: '#fff', fontWeight: 600 }}>
                  {faceCount > 1 ? 'Multiple faces' : faceCount === 1 ? '1 face' : 'No face'}
                </div>
              )}
            </div>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Proctoring</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {[
                { label: 'Camera active', ok: cameraOn },
                { label: 'Single face', ok: faceCount === 1 },
                { label: 'No tab switches', ok: proctoring.tabSwitches === 0 },
                { label: 'Session secure', ok: proctoring.violations.length < 2 },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ok ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.2)', flexShrink: 0 }} />
                  <span style={{ color: ok ? 'var(--text-secondary)' : 'var(--text-muted)', flex: 1 }}>{label}</span>
                  {ok ? <CheckCircle size={11} color="rgba(255,255,255,.4)" /> : <AlertTriangle size={11} color="rgba(255,255,255,.25)" />}
                </div>
              ))}
            </div>
            {proctoringMsg && <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '7px', fontStyle: 'italic' }}>{proctoringMsg}</p>}
          </div>
          {proctoring.tabSwitches > 0 && (
            <div className="alert alert-warning" style={{ fontSize: '0.72rem', padding: '10px 12px' }}>
              Tab switches: {proctoring.tabSwitches}/3 — {3 - proctoring.tabSwitches} left.
            </div>
          )}
          <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', fontSize: '0.68rem', color: 'rgba(255,255,255,.25)', lineHeight: 1.6 }}>
            <strong style={{ color: 'rgba(255,255,255,.35)' }}>Strict mode on</strong><br />
            Multiple faces · Screen capture · 3+ tabs → auto-submit
          </div>
          <button className="btn btn-primary" onClick={submitInterview} style={{ justifyContent: 'center', marginTop: 'auto' }}>
            <Send size={14} /> Submit Interview
          </button>
        </div>
      </div>
    </div>
  );
}