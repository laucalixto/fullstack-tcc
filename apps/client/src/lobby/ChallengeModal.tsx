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

  // Reinicia estado ao abrir ou trocar de pergunta
  useEffect(() => {
    if (!open) return;
    setTimeLeft(timeoutSeconds);
    setAnswered(false);
  }, [open, question.id, timeoutSeconds]);

  // Countdown via setInterval — compatível com vi.advanceTimersByTime em testes
  useEffect(() => {
    if (!open || answered) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(t - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [open, answered]);

  // Dispara onTimeout quando timer chega a zero
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

  return (
    <div data-testid="challenge-modal">
      <p data-testid="challenge-norm">{question.normId}</p>
      <p data-testid="challenge-question">{question.text}</p>
      <p data-testid="challenge-timer">{timeLeft}</p>

      <div>
        {question.options.map((opt, i) => (
          <button
            key={i}
            data-testid={`challenge-option-${i}`}
            disabled={answered}
            onClick={() => handleAnswer(opt)}
          >
            {opt}
          </button>
        ))}
      </div>

      {result && (
        <p data-testid="challenge-result">
          {result === 'correct' ? 'Correto!' : 'Incorreto!'}
        </p>
      )}
    </div>
  );
}
