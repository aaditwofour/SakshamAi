// pages/LandingPage.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createNoise3D } from 'simplex-noise';
import { Link } from 'react-router-dom';
import {
  Brain, Mic, FileText, Shield, Globe, BarChart3,
  ArrowRight, CheckCircle, Menu, X, Play, RotateCcw,
  ChevronDown, ChevronRight
} from 'lucide-react';

// ── Wavy Background ──────────────────────────────────────────────────────────
const WavyBackground = ({
  children, colors, waveWidth, backgroundFill,
  blur = 10, speed = 'fast', waveOpacity = 0.5, style = {}, ...props
}) => {
  const canvasRef      = useRef(null);
  const animIdRef      = useRef(null);
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
    let w = (ctx.canvas.width  = window.innerWidth);
    let h = (ctx.canvas.height = window.innerHeight);
    ctx.filter = `blur(${blur}px)`;
    let nt = 0;
    const getSpeed   = () => (speed === 'slow' ? 0.001 : 0.002);
    const waveColors = colors ?? ['#38bdf8', '#818cf8', '#c084fc', '#06b6d4', '#6366f1'];
    const drawWave   = (n) => {
      nt += getSpeed();
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.lineWidth   = waveWidth || 50;
        ctx.strokeStyle = waveColors[i % waveColors.length];
        for (let x = 0; x < w; x += 5) {
          ctx.lineTo(x, noise(x / 800, 0.3 * i, nt) * 100 + h * 0.5);
        }
        ctx.stroke();
        ctx.closePath();
      }
    };
    const render = () => {
      ctx.fillStyle   = backgroundFill || '#0a0e1a';
      ctx.globalAlpha = waveOpacity ?? 0.5;
      ctx.fillRect(0, 0, w, h);
      drawWave(5);
      animIdRef.current = requestAnimationFrame(render);
    };
    const handleResize = () => {
      w = ctx.canvas.width  = window.innerWidth;
      h = ctx.canvas.height = window.innerHeight;
      ctx.filter = `blur(${blur}px)`;
    };
    window.addEventListener('resize', handleResize);
    render();
    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [blur, speed, waveOpacity, backgroundFill, waveWidth, colors]);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }} {...props}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, ...(isSafari ? { filter: `blur(${blur}px)` } : {}) }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};

// ── Interactive Code Compiler Component ──────────────────────────────────────
// Simulates an AI interview answer evaluator with syntax-highlighted code editor
const InteractiveCompiler = () => {
  const SNIPPETS = [
    {
      lang: 'JavaScript',
      color: '#f7df1e',
      question: 'Explain closures in JavaScript',
      code: `// Q: What is a closure in JavaScript?

function makeCounter() {
  let count = 0; // private variable

  return {
    increment: () => ++count,
    decrement: () => --count,
    value:     () => count,
  };
}

const counter = makeCounter();
counter.increment(); // 1
counter.increment(); // 2
console.log(counter.value()); // 2

// 'count' is enclosed — not accessible outside`,
      output: `✓ Evaluation Complete

  Relevance:    92%  ████████████░░
  Completeness: 88%  ███████████░░░
  Keywords:     85%  ██████████░░░░
  Overall:      88%  ██████████░░░░
  Grade:        A

  Strengths:
  • Correctly demonstrates closure concept
  • Good use of practical example
  • Shows private variable encapsulation

  Suggestion: Mention lexical scoping.`,
    },
    {
      lang: 'Python',
      color: '#3572A5',
      question: 'Write a function to check if a string is a palindrome',
      code: `# Q: Check if a string is a palindrome

def is_palindrome(s: str) -> bool:
    """
    Returns True if s is a palindrome,
    ignoring case and non-alphanumeric chars.
    """
    cleaned = ''.join(
        c.lower() for c in s if c.isalnum()
    )
    return cleaned == cleaned[::-1]

# Test cases
print(is_palindrome("racecar"))   # True
print(is_palindrome("A man a plan a canal Panama"))  # True
print(is_palindrome("hello"))     # False`,
      output: `✓ Evaluation Complete

  Relevance:    95%  ████████████░░
  Completeness: 91%  ████████████░░
  Keywords:     89%  ███████████░░░
  Overall:      92%  ████████████░░
  Grade:        A+

  Strengths:
  • Clean, Pythonic solution
  • Handles edge cases (spaces, case)
  • Type hints & docstring included

  Suggestion: Add time complexity O(n).`,
    },
    {
      lang: 'SQL',
      color: '#e38c00',
      question: 'Find the second highest salary from employees',
      code: `-- Q: Find the 2nd highest salary

-- Method 1: Using DENSE_RANK
SELECT salary
FROM (
  SELECT salary,
         DENSE_RANK() OVER (
           ORDER BY salary DESC
         ) AS rnk
  FROM employees
) ranked
WHERE rnk = 2
LIMIT 1;

-- Method 2: Subquery approach
SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (
  SELECT MAX(salary) FROM employees
);`,
      output: `✓ Evaluation Complete

  Relevance:    94%  ████████████░░
  Completeness: 96%  █████████████░
  Keywords:     90%  ████████████░░
  Overall:      93%  ████████████░░
  Grade:        A+

  Strengths:
  • Two approaches shown — excellent
  • DENSE_RANK handles duplicates
  • Subquery is concise alternative

  Suggestion: Mention NULL handling.`,
    },
    {
      lang: 'Java',
      color: '#b07219',
      question: 'Implement a stack using an array',
      code: `// Q: Implement a Stack using array

public class Stack<T> {
    private Object[] data;
    private int top = -1;
    private int capacity;

    public Stack(int capacity) {
        this.capacity = capacity;
        data = new Object[capacity];
    }

    public void push(T item) {
        if (top == capacity - 1)
            throw new RuntimeException("Stack overflow");
        data[++top] = item;
    }

    @SuppressWarnings("unchecked")
    public T pop() {
        if (top == -1)
            throw new RuntimeException("Stack underflow");
        return (T) data[top--];
    }

    public boolean isEmpty() { return top == -1; }
    public int size()        { return top + 1;   }
}`,
      output: `✓ Evaluation Complete

  Relevance:    90%  ████████████░░
  Completeness: 93%  ████████████░░
  Keywords:     88%  ███████████░░░
  Overall:      90%  ████████████░░
  Grade:        A

  Strengths:
  • Generic implementation — great
  • Proper overflow/underflow checks
  • Clean API with size and isEmpty

  Suggestion: Add a peek() method.`,
    },
  ];

  const [activeSnippet, setActiveSnippet] = useState(0);
  const [typed, setTyped]         = useState('');
  const [output, setOutput]       = useState('');
  const [running, setRunning]     = useState(false);
  const [ran, setRan]             = useState(false);
  const [cursor, setCursor]       = useState(true);
  const [lineCount, setLineCount] = useState(1);
  const typeRef    = useRef(null);
  const outputRef  = useRef(null);
  const snippet    = SNIPPETS[activeSnippet];

  // Cursor blink
  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(t);
  }, []);

  // Typewriter effect
  const startTyping = useCallback((code) => {
    setTyped('');
    setOutput('');
    setRan(false);
    setRunning(false);
    let i = 0;
    clearInterval(typeRef.current);
    typeRef.current = setInterval(() => {
      if (i < code.length) {
        setTyped(code.slice(0, i + 1));
        setLineCount(code.slice(0, i + 1).split('\n').length);
        i++;
      } else {
        clearInterval(typeRef.current);
      }
    }, 18);
  }, []);

  // Auto-start typing on mount and snippet change
  useEffect(() => {
    startTyping(snippet.code);
    return () => clearInterval(typeRef.current);
  }, [activeSnippet, startTyping, snippet.code]);

  // Run / evaluate
  const runCode = () => {
    if (running || ran) return;
    setRunning(true);
    let i = 0;
    const out = snippet.output;
    outputRef.current && (outputRef.current.textContent = '');
    const t = setInterval(() => {
      if (i < out.length) {
        setOutput(out.slice(0, i + 1));
        i++;
      } else {
        clearInterval(t);
        setRunning(false);
        setRan(true);
      }
    }, 12);
  };

  const reset = () => {
    clearInterval(typeRef.current);
    startTyping(snippet.code);
  };

  // Syntax highlight — very lightweight tokenizer
  const highlight = (code) => {
    if (!code) return null;
    const lines = code.split('\n');
    return lines.map((line, li) => (
      <div key={li} style={{ display: 'flex' }}>
        <span style={{ minWidth: '28px', color: 'rgba(255,255,255,.15)', textAlign: 'right', paddingRight: '12px', userSelect: 'none', fontSize: '0.7rem' }}>
          {li + 1}
        </span>
        <span dangerouslySetInnerHTML={{ __html: colorize(line, snippet.lang) }} />
      </div>
    ));
  };

  return (
    <div style={{
      background: 'rgba(8,8,12,.95)',
      border: '1px solid rgba(255,255,255,.08)',
      borderRadius: '16px',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '520px',
      fontFamily: "'Fira Code', 'Courier New', monospace",
      fontSize: '0.72rem',
      boxShadow: '0 32px 80px rgba(0,0,0,.6)',
    }}>

      {/* Title bar */}
      <div style={{ background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
        </div>
        <span style={{ flex: 1, textAlign: 'center', fontSize: '0.68rem', color: 'rgba(255,255,255,.3)', letterSpacing: '0.02em' }}>
          sakshamai_evaluator.{snippet.lang.toLowerCase() === 'javascript' ? 'js' : snippet.lang.toLowerCase() === 'python' ? 'py' : snippet.lang.toLowerCase() === 'sql' ? 'sql' : 'java'}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={reset} title="Reset" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.25)', padding: '2px', display: 'flex', alignItems: 'center' }}>
            <RotateCcw size={11} />
          </button>
          <button onClick={runCode} disabled={running}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '5px', background: ran ? 'rgba(16,185,129,.15)' : 'rgba(99,102,241,.2)', border: `1px solid ${ran ? 'rgba(16,185,129,.3)' : 'rgba(99,102,241,.3)'}`, color: ran ? '#10b981' : '#a5b4fc', fontSize: '0.65rem', cursor: running ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {running ? (
              <span style={{ display: 'inline-flex', gap: '2px' }}>
                <span style={{ animation: 'blink .4s ease infinite' }}>●</span>
                <span style={{ animation: 'blink .4s ease infinite .13s' }}>●</span>
                <span style={{ animation: 'blink .4s ease infinite .26s' }}>●</span>
              </span>
            ) : (
              <><Play size={10} /> {ran ? 'Evaluated' : 'Evaluate'}</>
            )}
          </button>
        </div>
      </div>

      {/* Language tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'rgba(255,255,255,.02)' }}>
        {SNIPPETS.map((s, i) => (
          <button key={i} onClick={() => { setActiveSnippet(i); }}
            style={{
              padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.62rem', fontFamily: 'inherit', letterSpacing: '0.02em',
              color: activeSnippet === i ? s.color : 'rgba(255,255,255,.25)',
              borderBottom: activeSnippet === i ? `2px solid ${s.color}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}>
            {s.lang}
          </button>
        ))}
      </div>

      {/* Question banner */}
      <div style={{ padding: '8px 14px', background: 'rgba(99,102,241,.06)', borderBottom: '1px solid rgba(99,102,241,.1)', display: 'flex', alignItems: 'center', gap: '7px' }}>
        <span style={{ fontSize: '0.6rem', color: 'rgba(99,102,241,.7)', background: 'rgba(99,102,241,.12)', padding: '1px 7px', borderRadius: '4px', flexShrink: 0 }}>Q</span>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,.45)', lineHeight: 1.4 }}>{snippet.question}</span>
      </div>

      {/* Code area */}
      <div style={{ padding: '12px 0', minHeight: '200px', maxHeight: '230px', overflowY: 'auto', lineHeight: '1.6' }}>
        {highlight(typed)}
        {/* Blinking cursor at end */}
        {typed.length < snippet.code.length && (
          <span style={{ display: 'inline-block', width: '7px', height: '13px', background: cursor ? 'rgba(255,255,255,.7)' : 'transparent', verticalAlign: 'text-bottom', marginLeft: '1px', transition: 'background 0.05s' }} />
        )}
      </div>

      {/* Output panel */}
      {(output || running) && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(0,0,0,.4)', padding: '10px 14px', minHeight: '80px', maxHeight: '160px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,.2)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ran ? '#10b981' : '#f59e0b', display: 'inline-block', animation: running ? 'blink .5s ease infinite' : 'none' }} />
            AI Evaluation Output
          </div>
          <pre ref={outputRef} style={{ color: 'rgba(255,255,255,.6)', fontFamily: 'inherit', fontSize: '0.68rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{output}</pre>
        </div>
      )}

      {/* Footer hint */}
      {!ran && !running && typed.length >= snippet.code.length && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '8px 14px', display: 'flex', alignItems: 'center', justify: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,.2)' }}>Click <strong style={{ color: 'rgba(99,102,241,.7)' }}>Evaluate</strong> to see AI scoring ↑</span>
        </div>
      )}
    </div>
  );
};

// Very lightweight syntax colorizer
function colorize(line, lang) {
  let h = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const kw = {
    JavaScript: /\b(function|return|const|let|var|if|else|for|while|class|new|this|typeof|async|await|import|export|default|null|undefined|true|false|throw|try|catch|=>)\b/g,
    Python:     /\b(def|return|class|import|from|if|elif|else|for|while|in|not|and|or|True|False|None|with|as|lambda|yield|pass|raise|except|try|print)\b/g,
    SQL:        /\b(SELECT|FROM|WHERE|JOIN|ON|GROUP BY|ORDER BY|HAVING|INSERT|UPDATE|DELETE|CREATE|TABLE|INDEX|AS|DISTINCT|LIMIT|OFFSET|AND|OR|NOT|IN|IS|NULL|OVER|RANK|DENSE_RANK|PARTITION BY|MAX|MIN|COUNT|SUM|AVG)\b/gi,
    Java:       /\b(public|private|protected|class|interface|extends|implements|new|return|void|int|long|boolean|String|if|else|for|while|try|catch|throw|static|final|null|true|false|this|super|import|package)\b/g,
  };

  // Strings
  h = h.replace(/(&quot;|&#39;|`)(.*?)(\1)/g, '<span style="color:#98d982">$&</span>');
  // Comments
  h = h.replace(/(\/\/.*|#.*|--.*)/g, '<span style="color:rgba(255,255,255,.25);font-style:italic">$1</span>');
  // Keywords
  const re = kw[lang];
  if (re) h = h.replace(re, '<span style="color:#c792ea">$&</span>');
  // Numbers
  h = h.replace(/\b(\d+)\b/g, '<span style="color:#f78c6c">$1</span>');
  // Function calls
  h = h.replace(/([a-zA-Z_]\w*)\s*\(/g, '<span style="color:#82aaff">$1</span>(');

  return `<span style="color:rgba(255,255,255,.7)">${h}</span>`;
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const featuresRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const features = [
    { icon: Mic,       title: 'AI Interview Simulation', desc: 'Role-based interviews with voice input, real-time evaluation, and smart feedback.' },
    { icon: Shield,    title: 'Proctoring System',       desc: 'Face detection, tab-switch monitoring, and real-time alerts for integrity.' },
    { icon: FileText,  title: 'Resume Analyzer',         desc: 'Upload your CV and get ATS score, missing skills, and keyword optimization.' },
    { icon: Globe,     title: 'Multilingual Support',    desc: 'Interview and get analyzed in any language — Hindi, English, and more.' },
    { icon: BarChart3, title: 'Analytics Dashboard',     desc: 'Admin-level insights with charts, role breakdowns, and student performance.' },
    { icon: Brain,     title: 'Hugging Face AI',         desc: 'Powered by state-of-the-art NLP models for intelligent evaluation.' },
  ];

  const navLinks = [
    { label: 'Features',     onClick: () => featuresRef.current?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'How it works', onClick: () => featuresRef.current?.scrollIntoView({ behavior: 'smooth' }) },
    { label: 'Pricing',      onClick: () => {} },
  ];

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050508', overflowX: 'hidden' }}>

      {/* ── Navbar ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 60px', borderBottom: '1px solid rgba(255,255,255,.05)',
        background: 'rgba(5,5,8,.94)', backdropFilter: 'blur(20px)',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={16} color="rgba(255,255,255,.8)" />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>
            Saksham<span style={{ color: 'rgba(255,255,255,.25)' }}>AI</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '28px' }} className="desktop-nav">
          {navLinks.map(n => (
            <button key={n.label} onClick={n.onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.28)', fontSize: '0.82rem', transition: 'color 0.15s' }}
              onMouseEnter={e => e.target.style.color = 'rgba(255,255,255,.7)'}
              onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.28)'}>
              {n.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }} className="desktop-auth">
          <Link to="/login" style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.4)', textDecoration: 'none', fontSize: '0.8rem' }}>Login</Link>
          <Link to="/register" style={{ padding: '7px 16px', borderRadius: '8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: 'rgba(255,255,255,.85)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>Sign Up</Link>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} className="mobile-menu-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', display: 'none' }}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: '65px', left: 0, right: 0, zIndex: 199, background: 'rgba(5,5,8,.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '20px 30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {navLinks.map(n => (
            <button key={n.label} onClick={() => { n.onClick(); setMenuOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)', fontSize: '1rem', textAlign: 'left', padding: '4px 0' }}>{n.label}</button>
          ))}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.55)', textDecoration: 'none', fontSize: '0.875rem', textAlign: 'center' }}>Login</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#fff', textDecoration: 'none', fontSize: '0.875rem', textAlign: 'center', fontWeight: 600 }}>Sign Up</Link>
          </div>
        </div>
      )}

      {/* ── Hero (sticky) ── */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', zIndex: 0 }}>
        <WavyBackground
          backgroundFill="#050508"
          colors={['#1a1a2e', '#16162a', '#0d0d1a', '#111122', '#0a0a18']}
          waveOpacity={0.9}
          blur={14}
          speed="slow"
          style={{ height: '100vh', width: '100%' }}
        >
          {/* Grid texture */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.014) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 70% at 50% 50%,transparent 30%,#050508 100%)', pointerEvents: 'none' }} />

          {/* Split layout */}
          <div style={{
            height: '100vh', display: 'flex', alignItems: 'center',
            padding: '0 60px', paddingTop: '80px',
            gap: '48px', maxWidth: '1280px', margin: '0 auto',
            position: 'relative', zIndex: 1,
          }}>

            {/* LEFT: text */}
            <div style={{ flex: '0 0 45%', maxWidth: '480px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 14px', borderRadius: '100px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)', fontSize: '0.72rem', color: 'rgba(255,255,255,.38)', marginBottom: '22px', letterSpacing: '0.02em' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,.55)', animation: 'blink 2s ease infinite', display: 'inline-block' }} />
                AI-Powered Interview Platform
              </div>

              <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.08, marginBottom: '18px', letterSpacing: '-.03em' }}>
                <span style={{ color: '#fff' }}>Ace Your Interview<br />with </span>
                <span style={{ background: 'linear-gradient(135deg,#d0d0e8 0%,#fff 40%,#c8c8d8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Multilingual AI
                </span>
              </h1>

              <p style={{ fontSize: '1rem', color: '#ffffff', opacity: 0.82, lineHeight: 1.7, marginBottom: '28px', textShadow: '0 1px 20px rgba(0,0,0,.5)' }}>
                SakshamAI simulates real job interviews, evaluates your answers intelligently,
                analyzes your resume, and provides personalized feedback — in any language.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
                <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', background: '#fff', color: '#050508', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '-.01em' }}>
                  Start Free <ArrowRight size={15} />
                </Link>
                <button onClick={scrollToFeatures} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.45)', fontSize: '0.9rem', cursor: 'pointer' }}>
                  See Features <ChevronDown size={15} />
                </button>
              </div>

              {/* Chips */}
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {['Software Engineer', 'SQL Developer', 'Full Stack', 'Data Analyst'].map(r => (
                  <span key={r} style={{ padding: '5px 13px', borderRadius: '20px', fontSize: '0.72rem', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.32)' }}>{r}</span>
                ))}
              </div>

              {/* Trust badges */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', fontSize: '0.7rem', color: 'rgba(255,255,255,.3)' }}>
                  <CheckCircle size={12} color="rgba(255,255,255,.4)" /> Free to use
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', fontSize: '0.7rem', color: 'rgba(255,255,255,.3)' }}>
                  <CheckCircle size={12} color="rgba(255,255,255,.4)" /> No card required
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', fontSize: '0.7rem', color: 'rgba(255,255,255,.3)' }}>
                  ★★★★★ Highly rated
                </div>
              </div>
            </div>

            {/* RIGHT: Interactive Compiler */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <InteractiveCompiler />
            </div>
          </div>
        </WavyBackground>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ position: 'relative', zIndex: 10, background: '#050508' }}>

        {/* Ticker */}
        <div style={{ background: '#080809', borderTop: '1px solid rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.04)', padding: '13px 0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 32px', gap: '0' }}>
            <div style={{ flexShrink: 0, paddingRight: '18px', borderRight: '1px solid rgba(255,255,255,.06)' }}>
              <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,.15)', textAlign: 'right', lineHeight: 1.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top<br />roles</p>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative', marginLeft: '18px' }}>
              <div style={{ display: 'flex', gap: '44px', animation: 'infiniteScroll 26s linear infinite', width: 'max-content', alignItems: 'center' }}>
                {['Software Engineering','SQL Development','Full Stack Development','Data Analytics','AI & Machine Learning','Cloud Computing','Cybersecurity','Mobile Development',
                  'Software Engineering','SQL Development','Full Stack Development','Data Analytics','AI & Machine Learning','Cloud Computing','Cybersecurity','Mobile Development'].map((t, i) => (
                  i % 2 === 0
                    ? <span key={i} style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.16)', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>{t}</span>
                    : <span key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,.08)', display: 'inline-block' }} />
                ))}
              </div>
              <div style={{ position: 'absolute', inset: 0, left: 0, width: '44px', background: 'linear-gradient(to right,#080809,transparent)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: 0, left: 'auto', right: 0, width: '44px', background: 'linear-gradient(to left,#080809,transparent)', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* How it works */}
        <div style={{ background: '#060608', padding: '52px 60px' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '100px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', fontSize: '0.62rem', color: 'rgba(255,255,255,.25)', marginBottom: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>How it works</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-.03em' }}>From signup to offer letter</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0', maxWidth: '680px', margin: '0 auto', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '22px', left: '12.5%', right: '12.5%', height: '1px', background: 'linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.1),rgba(255,255,255,.05))' }} />
            {[
              { icon: '👤', label: 'Register',   sub: 'Free account' },
              { icon: '🎤', label: 'Interview',  sub: 'AI proctored' },
              { icon: '📊', label: 'Get scored', sub: 'AI evaluates' },
              { icon: '✓',  label: 'Improve',    sub: 'Act on feedback', active: true },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '0 12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: s.active ? '#fff' : '#060608', border: `1px solid ${s.active ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', position: 'relative', zIndex: 1, fontSize: s.active ? '1rem' : '1.1rem', color: s.active ? '#060608' : 'rgba(255,255,255,.5)' }}>{s.icon}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,.6)', marginBottom: '3px' }}>{s.label}</div>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,.2)' }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <section ref={featuresRef} style={{ padding: '52px 60px', background: '#080809' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '100px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', fontSize: '0.62rem', color: 'rgba(255,255,255,.25)', marginBottom: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Features</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-.03em', marginBottom: '8px' }}>Built for serious candidates</h2>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,.25)', maxWidth: '380px', margin: '0 auto', lineHeight: 1.6 }}>A complete AI-powered interview preparation ecosystem</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: 'rgba(255,255,255,.06)', borderRadius: '16px', overflow: 'hidden', maxWidth: '900px', margin: '0 auto' }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ background: '#080809', padding: '24px 22px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.02)'}
                onMouseLeave={e => e.currentTarget.style.background = '#080809'}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  <Icon size={16} color="rgba(255,255,255,.5)" />
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,.7)', marginBottom: '5px', letterSpacing: '-.01em' }}>{title}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,.25)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '52px 60px', background: '#050508', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.012) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 50% 50%,transparent 40%,#050508 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', padding: '1px', borderRadius: '20px', background: 'linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.03),rgba(255,255,255,.12))' }}>
              <div style={{ background: '#050508', borderRadius: '19px', padding: '36px 32px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '-.03em', marginBottom: '10px' }}>Ready to land your dream job?</h2>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,.28)', marginBottom: '20px', lineHeight: 1.6 }}>Prepare smarter with AI-powered mock interviews and resume analysis.</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.7rem', color: 'rgba(255,255,255,.22)', marginBottom: '22px' }}>
                  <span>✓ Free to use</span><span>✓ AI-powered</span><span>✓ Multilingual</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <Link to="/register" style={{ padding: '12px 26px', borderRadius: '10px', background: '#fff', border: 'none', color: '#050508', fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none', letterSpacing: '-.01em' }}>Create account →</Link>
                  <Link to="/login" style={{ padding: '12px 20px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.35)', fontSize: '0.88rem', textDecoration: 'none' }}>Login</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '18px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#050508' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={10} color="rgba(255,255,255,.4)" />
            </div>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.14)' }}>© 2024 SakshamAI</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,.1)' }}>Powered by Hugging Face & MongoDB</span>
        </footer>
      </div>

      <style>{`
        @keyframes infiniteScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes bounceDown { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.15} }
        @media (max-width:900px) {
          .desktop-nav { display:none !important }
          .desktop-auth { display:none !important }
          .mobile-menu-btn { display:block !important }
        }
        @media (min-width:901px) { .mobile-menu-btn { display:none !important } }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px }
      `}</style>
    </div>
  );
}
