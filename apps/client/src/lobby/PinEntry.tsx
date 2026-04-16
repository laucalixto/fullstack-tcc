import { useState } from 'react';

interface PinEntryProps {
  onJoin: (pin: string) => void;
  error?: string;
}

export function PinEntry({ onJoin, error }: PinEntryProps) {
  const [pin, setPin] = useState('');

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length === 6) onJoin(pin);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        data-testid="pin-input"
        type="text"
        inputMode="numeric"
        value={pin}
        onChange={handlePinChange}
        maxLength={6}
        placeholder="000000"
      />
      {error && (
        <p data-testid="pin-error">{error}</p>
      )}
      <button
        data-testid="join-button"
        type="submit"
        disabled={pin.length < 6}
      >
        Entrar
      </button>
    </form>
  );
}
