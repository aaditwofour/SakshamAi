// components/ui/WavyBackground.js
// Wavy animated canvas background — pure JS version (no TypeScript/shadcn needed)
// Uses simplex-noise for organic wave movement
import React, { useEffect, useRef, useState } from 'react';
import { createNoise3D } from 'simplex-noise';

export const WavyBackground = ({
  children,
  className = '',
  containerClassName = '',
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = 'fast',
  waveOpacity = 0.5,
  style = {},
  ...props
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

    let w = (ctx.canvas.width  = window.innerWidth);
    let h = (ctx.canvas.height = window.innerHeight);
    ctx.filter = `blur(${blur}px)`;
    let nt = 0;

    const getSpeed = () => (speed === 'slow' ? 0.001 : 0.002);

    const waveColors = colors ?? [
      '#38bdf8',  // sky blue
      '#818cf8',  // indigo
      '#c084fc',  // purple
      '#06b6d4',  // cyan
      '#6366f1',  // violet
    ];

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
      ctx.fillStyle   = backgroundFill || '#0a0e1a';
      ctx.globalAlpha = waveOpacity ?? 0.5;
      ctx.fillRect(0, 0, w, h);
      drawWave(5);
      animationIdRef.current = requestAnimationFrame(render);
    };

    const handleResize = () => {
      w = ctx.canvas.width  = window.innerWidth;
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
    <div
      className={containerClassName}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      {...props}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
        }}
      />
      <div
        className={className}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {children}
      </div>
    </div>
  );
};

export default WavyBackground;
