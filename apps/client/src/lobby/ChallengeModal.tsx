import { useState, useEffect, useRef } from 'react';

interface ServedQuestion {
  id: string;
  normId: string;
  text: string;
  options: string[];
}

interface ChallengeModalProps {
  open: boolean;
  question: ServedQuestion;
  onAnswer: (selectedText: string) => void;
  onTimeout: () => void;
  timeoutSeconds?: number;
  result?: 'correct' | 'incorrect';
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export function ChallengeModal({
  open,
  question,
  onAnswer,
  onTimeout,
  timeoutSeconds = 30,
  result,
}: ChallengeModalProps) {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
  const [answered, setAnswered] = useState(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    if (!open) return;
    setTimeLeft(timeoutSeconds);
    setAnswered(false);
  }, [open, question.id, timeoutSeconds]);

  useEffect(() => {
    if (!open || answered) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(t - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [open, answered]);

  useEffect(() => {
    if (open && !answered && timeLeft === 0) {
      onTimeoutRef.current();
    }
  }, [timeLeft, open, answered]);

  if (!open) return null;

  function handleAnswer(text: string) {
    if (answered) return;
    setAnswered(true);
    onAnswer(text);
  }

  const timerPct = (timeLeft / timeoutSeconds) * 100;
  const timerColor = timerPct > 50 ? 'bg-primary-container' : timerPct > 20 ? 'bg-primary-container' : 'bg-tertiary';

  return (
    <div data-testid="challenge-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-surface/85 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden border border-outline-variant/15">
        {/* Header */}
        <div className="bg-primary text-on-primary p-6 lg:p-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-4xl">⚡</span>
            <div>
              <p
                data-testid="challenge-norm"
                className="text-[10px] lg:text-[12px] uppercase tracking-[0.15em] font-bold opacity-80"
              >
                DESAFIO TÉCNICO — {question.normId}
              </p>
              <h2 className="text-xl lg:text-2xl font-bold leading-tight">
                Segurança no Trabalho
              </h2>
            </div>
          </div>

          {/* Timer */}
          <div className="bg-black/20 px-6 py-3 rounded-lg border border-white/10 flex items-center gap-3">
            <span className="text-primary-container text-2xl">⏱</span>
            <span
              data-testid="challenge-timer"
              className="text-3xl lg:text-4xl font-black tabular-nums tracking-tighter"
            >
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="h-1 w-full bg-surface-container-high">
          <div
            className={`h-full transition-all duration-1000 ${timerColor}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 lg:p-12 space-y-10">
          <div className="relative max-w-4xl">
            <h3
              data-testid="challenge-question"
              className="text-2xl md:text-3xl font-bold text-on-surface leading-tight"
            >
              {question.text}
            </h3>
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {question.options.map((opt, i) => (
              <button
                key={i}
                data-testid={`challenge-option-${i}`}
                disabled={answered}
                onClick={() => handleAnswer(opt)}
                className="flex items-center justify-between p-6 rounded-lg bg-surface-container-high hover:bg-surface-bright transition-all group border-b-2 border-transparent hover:border-primary text-left min-h-[100px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-6">
                  <span className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded bg-on-surface text-surface text-sm font-bold">
                    {OPTION_LABELS[i] ?? String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-medium text-lg text-on-surface-variant group-hover:text-on-surface group-disabled:text-on-surface-variant">
                    {opt}
                  </span>
                </div>
                <span className="text-primary opacity-0 group-hover:opacity-100 text-xl">›</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 lg:px-12 py-6 bg-surface-container-low border-t border-outline-variant/10 flex justify-between items-center">
          <div className="text-[11px] font-medium uppercase tracking-tight text-on-surface-variant">
            Selecione uma das opções acima
          </div>
          {result && (
            <p
              data-testid="challenge-result"
              className={`px-4 py-2 rounded-md text-sm font-black uppercase tracking-widest ${
                result === 'correct'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              {result === 'correct' ? '✓ Correto!' : '✗ Incorreto!'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
