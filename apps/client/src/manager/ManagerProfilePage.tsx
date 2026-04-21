import { useState } from 'react';

interface ManagerProfilePageProps {
  name: string;
  email: string;
  onSave: (patch: { name?: string }) => void;
  isLoading?: boolean;
  error?: string;
  success?: string;
}

export function ManagerProfilePage({ name, email, onSave, isLoading, error, success }: ManagerProfilePageProps) {
  const [draft, setDraft] = useState(name);

  return (
    <div className="px-6 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Meu Perfil</h1>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 max-w-md space-y-6">
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface/50 block mb-1">Nome</label>
          <input
            data-testid="profile-name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full border-0 border-b-2 border-outline-variant bg-surface-container-high px-4 py-3 text-sm font-medium focus:border-primary focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface/50 block mb-1">E-mail</label>
          <input
            data-testid="profile-email"
            value={email}
            disabled
            className="w-full border-0 border-b-2 border-outline-variant bg-surface-container-high px-4 py-3 text-sm font-medium text-on-surface/50 cursor-not-allowed"
          />
        </div>

        {error && <p data-testid="profile-error" className="text-error text-sm">{error}</p>}
        {success && <p data-testid="profile-success" className="text-emerald-600 text-sm">{success}</p>}

        <button
          data-testid="profile-save"
          onClick={() => onSave({ name: draft })}
          disabled={isLoading || !draft.trim()}
          className="w-full py-3 bg-primary text-white font-bold rounded-md hover:brightness-110 transition uppercase text-[11px] tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}
