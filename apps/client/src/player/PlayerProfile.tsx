import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from '../components/Icon';

interface PlayerProfileProps {
  firstName: string;
  lastName: string;
  email?: string;
  onSave: (data: {
    firstName: string;
    lastName: string;
    currentPassword?: string;
    newPassword?: string;
  }) => void;
  onBack: () => void;
  error?: string;
  success?: string;
  isLoading?: boolean;
}

export function PlayerProfile({
  firstName: initialFirstName,
  lastName: initialLastName,
  email,
  onSave,
  onBack,
  error,
  success,
  isLoading = false,
}: PlayerProfileProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Parameters<typeof onSave>[0] = { firstName, lastName };
    if (currentPassword) data.currentPassword = currentPassword;
    if (newPassword) data.newPassword = newPassword;
    onSave(data);
  }

  const inputClass =
    'w-full border-0 border-b-2 border-outline-variant bg-surface-container-high px-4 py-3 text-on-surface placeholder-on-surface-variant/40 focus:border-primary focus:outline-none transition-colors duration-300';
  const labelClass =
    'block text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-1.5';

  return (
    <div className="min-h-screen bg-surface font-body">
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm flex items-center gap-4 px-6 h-16">
        <button
          data-testid="profile-back-btn"
          onClick={onBack}
          className="text-on-surface-variant hover:text-on-surface transition-colors font-bold"
        >
          ← Voltar
        </button>
        <span className="text-xl font-black uppercase tracking-tighter text-on-surface">Editar Perfil</span>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {email && (
            <div>
              <label className={labelClass} htmlFor="profile-email-field">E-mail</label>
              <input
                data-testid="profile-email"
                id="profile-email-field"
                type="email"
                value={email}
                disabled
                className={`${inputClass} opacity-50 cursor-not-allowed`}
              />
              <p className="mt-1 text-[10px] text-on-surface-variant/60">O e-mail não pode ser alterado.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="profile-fn">Nome</label>
              <input
                data-testid="profile-firstname"
                id="profile-fn"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="profile-ln">Sobrenome</label>
              <input
                data-testid="profile-lastname"
                id="profile-ln"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="border-t border-outline-variant/20 pt-6">
            <p className={labelClass}>Alterar Senha (opcional)</p>
            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="profile-cpw">Senha Atual</label>
                <div className="relative">
                  <input
                    data-testid="profile-current-password"
                    id="profile-cpw"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    data-testid="toggle-current-password-visibility"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-primary transition-colors focus:outline-none"
                    aria-label={showCurrent ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="profile-npw">Nova Senha</label>
                <div className="relative">
                  <input
                    data-testid="profile-new-password"
                    id="profile-npw"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    data-testid="toggle-new-password-visibility"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-primary transition-colors focus:outline-none"
                    aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showNew ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p
              data-testid="profile-error"
              className="text-error text-sm font-medium text-center bg-error-container/30 rounded-md py-2 px-4"
            >
              {error}
            </p>
          )}

          {success && (
            <p
              data-testid="profile-success"
              className="text-sm font-medium text-center bg-secondary-container/30 rounded-md py-2 px-4 text-on-secondary-container"
            >
              {success}
            </p>
          )}

          <button
            data-testid="profile-save-btn"
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-primary px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </main>
    </div>
  );
}
