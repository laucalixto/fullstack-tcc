import { useState } from 'react';
import type { ManagerLoginData } from '@safety-board/shared';

interface ManagerLoginProps {
  onLogin: (data: ManagerLoginData) => void;
  error?: string;
  isLoading?: boolean;
}

export function ManagerLogin({ onLogin, error, isLoading = false }: ManagerLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = !isLoading && email.trim().length > 0 && password.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onLogin({ email: email.trim(), password });
  }

  const inputClass =
    'w-full bg-surface-container-high border-0 border-b-2 border-outline-variant focus:border-primary focus:outline-none px-4 py-4 text-sm font-medium transition-all duration-200 text-on-surface placeholder-on-surface/40';

  const labelClass =
    'text-[10px] uppercase tracking-[0.05rem] font-bold text-on-surface/60';

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Top bar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 py-6">
        <span className="text-xl font-black text-on-surface tracking-tighter uppercase">
          Autenticação de Segurança
        </span>
      </header>

      <main className="relative z-10 w-full max-w-md px-6">
        <div className="bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden">
          {/* Branding header */}
          <div className="bg-surface-container-low px-8 py-10 text-center border-b border-outline-variant/10">
            <div className="flex justify-center mb-4">
              <span className="text-4xl text-primary">🔐</span>
            </div>
            <h1 className="text-lg font-black text-on-surface tracking-tight uppercase">Safety Board</h1>
            <p className="text-[10px] uppercase tracking-[0.1rem] font-bold text-on-surface/40 mt-2">
              Acesso Restrito ao Painel de Gestão SST
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-1">
              <label className={labelClass} htmlFor="login-em">Email ou ID do Gestor</label>
              <input
                data-testid="login-email"
                id="login-em"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu identificador"
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-end">
                <label className={labelClass} htmlFor="login-pw">Senha de Segurança</label>
              </div>
              <div className="relative">
                <input
                  data-testid="login-password"
                  id="login-pw"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  data-testid="toggle-password-visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/40 hover:text-primary transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <p
                data-testid="login-error"
                className="text-error text-sm font-medium text-center bg-error-container/30 rounded-md py-2 px-4"
              >
                {error}
              </p>
            )}

            <div className="pt-4">
              <button
                data-testid="login-submit"
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-primary-container text-on-primary-container font-black py-4 rounded-lg shadow-sm hover:brightness-110 active:scale-[0.98] transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    <span
                      data-testid="login-loading"
                      className="w-4 h-4 border-2 border-on-primary-container/40 border-t-on-primary-container rounded-full animate-spin"
                    />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <span>Acessar Painel de Controle</span>
                )}
              </button>
            </div>
          </form>

          <div className="px-8 pb-8 flex items-center justify-center gap-4">
            <div className="h-px flex-1 bg-outline-variant/10" />
            <span className="text-[10px] uppercase tracking-[0.05rem] font-bold text-on-surface/20">
              Encrypted Session
            </span>
            <div className="h-px flex-1 bg-outline-variant/10" />
          </div>
        </div>

        {/* System status */}
        <div className="mt-8 flex items-center gap-4 p-4 bg-surface-container-low rounded-lg border-l-4 border-secondary/30">
          <span className="material-symbols-outlined text-secondary text-lg">info</span>
          <p className="text-[10px] uppercase tracking-tight font-medium text-on-surface/60">
            Sistema monitorado conforme protocolos de segurança NR-01. Mantenha suas credenciais protegidas.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full flex justify-between items-center px-8 py-8 z-50">
        <span className="text-[10px] uppercase tracking-[0.05rem] font-bold text-on-surface/40">
          © 2026 Safety Board
        </span>
        <div className="flex gap-6">
          <a href="#" className="text-[10px] uppercase tracking-[0.05rem] font-bold text-on-surface/40 hover:text-primary transition-colors">
            Suporte Técnico
          </a>
          <a href="#" className="text-[10px] uppercase tracking-[0.05rem] font-bold text-on-surface/40 hover:text-primary transition-colors">
            Termos de Segurança
          </a>
        </div>
      </footer>

      {/* Background watermark */}
      <div className="fixed bottom-12 right-12 opacity-5 pointer-events-none select-none hidden lg:block">
        <p className="text-[8rem] font-black leading-none text-on-surface">SCP-3D</p>
      </div>
    </div>
  );
}
