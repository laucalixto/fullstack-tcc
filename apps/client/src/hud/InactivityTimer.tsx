import { useState, useEffect, useRef } from 'react';

interface InactivityTimerProps {
  seconds: number;
  active: boolean;
  onTimeout?: () => void;
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
}

export function InactivityTimer({ seconds, active, onTimeout }: InactivityTimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const totalRef = useRef(seconds);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    totalRef.current = seconds;
    setTimeLeft(seconds);
  }, [seconds, active]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(t - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [active, seconds]);

  useEffect(() => {
    if (active && timeLeft === 0) {
      onTimeoutRef.current?.();
    }
  }, [timeLeft, active]);

  const pct = totalRef.current > 0 ? (timeLeft / totalRef.current) * 100 : 0;
  const urgent = pct < 30;

  return (
    <div
      data-testid="inactivity-timer"
      data-urgent={urgent ? 'true' : 'false'}
      className={[
        'absolute top-6 left-1/2 -translate-x-1/2 z-40',
        'flex flex-col items-center gap-1.5',
      ].join(' ')}
    >
      {/* Pill principal */}
      <div className={[
        'flex items-center gap-2.5 px-4 py-2 rounded-xl shadow-xl backdrop-blur-xl border transition-colors',
        urgent
          ? 'bg-red-600/90 border-red-400/40 text-white animate-pulse'
          : 'bg-black/70 border-white/15 text-white',
      ].join(' ')}>
        <ClockIcon />
        <span
          data-testid="timer-value"
          className={[
            'font-black tabular-nums leading-none',
            urgent ? 'text-2xl' : 'text-xl',
          ].join(' ')}
        >
          {timeLeft}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">seg</span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
        <div
          data-testid="timer-bar"
          style={{ width: `${pct}%` }}
          className={[
            'h-full rounded-full transition-all duration-1000',
            urgent ? 'bg-red-400' : 'bg-primary',
          ].join(' ')}
        />
      </div>
    </div>
  );
}
