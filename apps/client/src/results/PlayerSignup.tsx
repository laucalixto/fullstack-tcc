import { useState } from 'react';
import type { PlayerSignupData } from '@safety-board/shared';

const INDUSTRIAL_UNITS = [
  { value: 'unidade-sp', label: 'Unidade Central - SP' },
  { value: 'planta-a', label: 'Planta Industrial A - MG' },
  { value: 'logistica', label: 'Centro Logístico - PR' },
  { value: 'refinaria', label: 'Refinaria Norte - AM' },
];

interface PlayerSignupProps {
  onSignup: (data: PlayerSignupData) => void;
  error?: string;
  isLoading?: boolean;
}

export function PlayerSignup({ onSignup, error, isLoading = false }: PlayerSignupProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [industrialUnit, setIndustrialUnit] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit =
    !isLoading &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    industrialUnit.length > 0 &&
    password.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSignup({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), industrialUnit, password });
  }

  const inputClass =
    'w-full border-0 border-b-2 border-outline-variant bg-surface-container-high px-4 py-3 text-on-surface placeholder-on-surface-variant/40 focus:border-primary focus:outline-none transition-colors duration-300';

  const labelClass =
    'block text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-1.5';

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-surface">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden bg-surface-container-lowest shadow-2xl md:flex-row rounded-xl">

        {/* Left — visual authority */}
        <div className="relative hidden w-full flex-col justify-between p-12 md:flex md:w-5/12 bg-on-surface">
          <div className="z-10">
            <div className="mb-8 flex items-center gap-2">
              <span className="text-4xl">🔐</span>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-surface-bright">Safety Board</h1>
            </div>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-surface-bright">
              Operação <br />
              <span className="text-primary-container">Conformidade</span>
            </h2>
            <p className="mt-6 text-lg text-surface-variant/70 font-light leading-relaxed">
              Sua porta de entrada para a excelência em segurança do trabalho. Gerencie treinamentos,
              riscos e conformidade industrial em um só lugar.
            </p>
          </div>
          <div className="z-10 mt-auto">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-surface-variant/5 border border-surface-variant/10">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1rem] text-surface-variant/50">
                  Estado do Sistema
                </p>
                <p className="text-sm font-semibold text-surface-bright uppercase">
                  Acesso Restrito a Operadores
                </p>
              </div>
            </div>
          </div>
          {/* Decorative grid overlay */}
          <div
            className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          />
        </div>

        {/* Right — form */}
        <div className="flex w-full flex-col justify-center bg-surface-bright p-8 md:w-7/12 md:p-16 lg:p-20">
          <div className="mb-10">
            <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2rem] text-primary">
              Cadastro de Participante
            </span>
            <h3 className="text-3xl font-bold tracking-tight text-on-surface">Criar Nova Credencial</h3>
            <p className="mt-2 text-on-surface-variant font-medium">
              Preencha os dados corporativos para salvar seu progresso.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name row */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="signup-fn">Nome</label>
                <input
                  data-testid="signup-firstname"
                  id="signup-fn"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: Carlos"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="signup-ln">Sobrenome</label>
                <input
                  data-testid="signup-lastname"
                  id="signup-ln"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex: Silva"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className={labelClass} htmlFor="signup-em">E-mail Corporativo</label>
              <input
                data-testid="signup-email"
                id="signup-em"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos.silva@empresa.com.br"
                className={inputClass}
              />
            </div>

            {/* Industrial unit */}
            <div>
              <label className={labelClass} htmlFor="signup-un">Unidade Industrial</label>
              <select
                data-testid="signup-unit"
                id="signup-un"
                value={industrialUnit}
                onChange={(e) => setIndustrialUnit(e.target.value)}
                className={`${inputClass} appearance-none`}
              >
                <option value="">Selecione a Unidade</option>
                {INDUSTRIAL_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className={labelClass} htmlFor="signup-pw">Senha de Acesso</label>
              <input
                data-testid="signup-password"
                id="signup-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
              <p className="mt-2 text-[10px] text-on-surface-variant/60">
                Mínimo de 8 caracteres, incluindo símbolos e números.
              </p>
            </div>

            {/* Error */}
            {error && (
              <p
                data-testid="signup-error"
                className="text-error text-sm font-medium text-center bg-error-container/30 rounded-md py-2 px-4"
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <div className="pt-4">
              <button
                data-testid="signup-submit"
                type="submit"
                disabled={!canSubmit}
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg bg-gradient-to-r from-primary to-primary-container px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    <span data-testid="signup-loading" className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Progresso e Criar Conta</span>
                )}
              </button>

              <div className="mt-8 flex items-center justify-center gap-2">
                <span className="h-[1px] w-8 bg-outline-variant" />
                <p className="text-sm font-medium text-on-surface-variant">
                  Já tenho uma conta?{' '}
                  <a href="#" className="font-bold text-secondary hover:text-on-secondary-container transition-colors">
                    Entrar no sistema
                  </a>
                </p>
                <span className="h-[1px] w-8 bg-outline-variant" />
              </div>
            </div>
          </form>

          <div className="mt-12 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">
              Certificado de Segurança SST-ISO 45001 &amp; NR-12 Compliant
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
