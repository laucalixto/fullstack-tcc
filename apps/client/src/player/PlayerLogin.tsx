import { useState } from 'react';

interface PlayerLoginProps {
  onLogin: (data: { email: string; password: string }) => void;
  error?: string;
  isLoading?: boolean;
}

export function PlayerLogin({ onLogin, error, isLoading = false }: PlayerLoginProps) {
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
    'w-full border-0 border-b-2 border-outline-variant bg-surface-container-high px-4 py-3 text-on-surface placeholder-on-surface-variant/40 focus:border-primary focus:outline-none transition-colors duration-300';
  const labelClass =
    'block text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-1.5';

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-surface">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden bg-surface-container-lowest shadow-2xl md:flex-row rounded-xl">

        <div className="relative hidden w-full flex-col justify-between p-12 md:flex md:w-5/12 bg-on-surface">
          <div className="z-10">
            <div className="mb-8 flex items-center gap-2">
              <span className="text-4xl">🔐</span>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-surface-bright">Safety Board</h1>
            </div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-surface-bright">
              Bem-vindo <br />
              <span className="text-primary-container">de volta</span>
            </h2>
            <p className="mt-6 text-lg text-surface-variant/70 font-light leading-relaxed">
              Acesse seu histórico de treinamentos e acompanhe sua evolução em segurança do trabalho.
            </p>
          </div>
          <div
            className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          />
        </div>

        <div className="flex w-full flex-col justify-center bg-surface-bright p-8 md:w-7/12 md:p-16 lg:p-20">
          <div className="mb-10">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2rem] text-primary">
              Área do Participante
            </span>
            <h3 className="text-3xl font-bold tracking-tight text-on-surface">Entrar no Sistema</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className={labelClass} htmlFor="login-em">E-mail Corporativo</label>
              <input
                data-testid="login-email"
                id="login-em"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos.silva@empresa.com.br"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="login-pw">Senha</label>
              <div className="relative">
                <input
                  data-testid="login-password"
                  id="login-pw"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  data-testid="toggle-password-visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-primary transition-colors focus:outline-none"
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
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-gradient-to-r from-primary to-primary-container px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    <span data-testid="login-loading" className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <span>Entrar</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
