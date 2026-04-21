import { useState } from 'react';

interface PinEntryProps {
  onJoin: (pin: string) => void;
  error?: string;
  onPinChange?: () => void;
  onPlayerLogin?: () => void;
}

export function PinEntry({ onJoin, error, onPinChange, onPlayerLogin }: PinEntryProps) {
  const [pin, setPin] = useState('');

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(digits);
    onPinChange?.();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length === 6) onJoin(pin);
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center px-6">
      {/* TopNav */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-sm h-16 flex items-center px-6">
        <span className="text-xl font-black uppercase tracking-tighter text-on-surface">Safety Board</span>
      </nav>

      <main className="w-full max-w-md py-12 flex flex-col items-center">
        {/* Brand */}
        <div className="mb-12 text-center">
          <p className="text-[0.7rem] uppercase tracking-[0.2em] font-semibold text-secondary mb-4">
            Industrial Authority
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="w-full bg-surface/80 backdrop-blur-xl rounded-xl p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)] border border-outline-variant/15"
        >
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-on-surface mb-2">Portal de Entrada</h1>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
              Insira o PIN fornecido pelo seu gestor para iniciar o treinamento
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-on-surface-variant px-1">
                PIN de Acesso
              </label>
              <input
                data-testid="pin-input"
                type="text"
                inputMode="numeric"
                value={pin}
                onChange={handlePinChange}
                maxLength={6}
                placeholder="000000"
                className="w-full bg-surface-container-high border-b-2 border-outline-variant focus:border-primary focus:outline-none text-center text-2xl font-bold text-primary py-4 rounded-t-md tracking-[0.5em] transition-all"
              />
            </div>

            {error && (
              <p
                data-testid="pin-error"
                className="text-error text-sm font-medium text-center"
              >
                {error}
              </p>
            )}

            <button
              data-testid="join-button"
              type="submit"
              disabled={pin.length < 6}
              className="w-full bg-primary-container text-on-primary py-4 rounded-md font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Entrar na Sala
            </button>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-on-surface-variant">
          <span>Já tem conta?</span>
          <button
            data-testid="player-login-link"
            type="button"
            onClick={onPlayerLogin}
            className="font-bold text-secondary hover:text-on-secondary-container transition-colors"
          >
            Entrar na minha área
          </button>
        </div>

        {/* Footer badges */}
        <div className="mt-12 grid grid-cols-2 gap-8 w-full max-w-sm">
          <div className="flex flex-col items-center opacity-60">
            <span className="text-secondary mb-2 text-2xl">🔒</span>
            <span className="text-[0.6rem] font-bold uppercase tracking-tighter">Secure Connection</span>
          </div>
          <div className="flex flex-col items-center opacity-60">
            <span className="text-secondary mb-2 text-2xl">⚙️</span>
            <span className="text-[0.6rem] font-bold uppercase tracking-tighter">v4.2 Industrial</span>
          </div>
        </div>
      </main>
    </div>
  );
}
