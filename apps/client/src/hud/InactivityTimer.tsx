import { useState, useEffect, useRef } from 'react';

interface InactivityTimerProps {
  seconds: number;
  active: boolean;
  onTimeout?: () => void;
}

export function InactivityTimer({ seconds, active, onTimeout }: InactivityTimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const totalRef = useRef(seconds);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Reinicia quando seconds ou active muda
  useEffect(() => {
    totalRef.current = seconds;
    setTimeLeft(seconds);
  }, [seconds, active]);

  // Countdown via setInterval
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(t - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [active, seconds]);

  // Dispara onTimeout quando chega a zero
  useEffect(() => {
    if (active && timeLeft === 0) {
      onTimeoutRef.current?.();
    }
  }, [timeLeft, active]);

  const pct = totalRef.current > 0 ? (timeLeft / totalRef.current) * 100 : 0;
  const urgent = pct < 30;

  return (
    <div data-testid="inactivity-timer" data-urgent={urgent ? 'true' : 'false'}>
      <span data-testid="timer-value">{timeLeft}</span>
      <div
        data-testid="timer-bar"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
