import { useState } from 'react';
import { AVATARS } from '@safety-board/shared';
import type { AvatarOption } from '@safety-board/shared';

interface CharacterSelectProps {
  onConfirm: (firstName: string, lastName: string, avatarId: string) => void;
  avatars?: AvatarOption[];
  takenAvatarIds?: string[];
  initialFirstName?: string;
  initialLastName?: string;
}

export function CharacterSelect({
  onConfirm,
  avatars = AVATARS,
  takenAvatarIds = [],
  initialFirstName = '',
  initialLastName = '',
}: CharacterSelectProps) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());

  const canConfirm =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    selectedAvatarId !== null;

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (canConfirm) onConfirm(firstName.trim(), lastName.trim(), selectedAvatarId!);
  }

  return (
    <div className="bg-background text-on-background min-h-screen font-body">
      {/* TopNav */}
      <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm flex items-center px-6 h-16">
        <span className="text-xl font-black uppercase tracking-tighter text-on-surface">Safety Board</span>
      </header>

      <main className="pt-24 pb-12 px-6 min-h-screen flex flex-col items-center max-w-7xl mx-auto">
        {/* Header */}
        <header className="w-full mb-12 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter uppercase mb-2">
            Escolha seu <span className="text-primary">Operador</span>
          </h1>
          <p className="text-on-surface-variant font-medium tracking-wide uppercase text-xs">
            Safety Board // Configuração de Perfil
          </p>
        </header>

        <form onSubmit={handleConfirm} className="w-full">
          {/* Identity fields */}
          <section className="w-full mb-16 grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-surface-container-low rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl pointer-events-none select-none">🪪</div>
            <div className="relative z-10">
              <label className="block text-[10px] font-black tracking-[0.2em] text-outline mb-2 uppercase">
                Nome
              </label>
              <input
                data-testid="first-name-input"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="INSIRA O NOME"
                className="w-full bg-surface-container-high border-b-2 border-outline focus:border-primary focus:outline-none text-on-surface font-bold tracking-tight placeholder:text-on-surface-variant/40 py-3 px-0 transition-all uppercase"
              />
            </div>
            <div className="relative z-10">
              <label className="block text-[10px] font-black tracking-[0.2em] text-outline mb-2 uppercase">
                Sobrenome
              </label>
              <input
                data-testid="last-name-input"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="INSIRA O SOBRENOME"
                className="w-full bg-surface-container-high border-b-2 border-outline focus:border-primary focus:outline-none text-on-surface font-bold tracking-tight placeholder:text-on-surface-variant/40 py-3 px-0 transition-all uppercase"
              />
            </div>
          </section>

          {/* Avatar gallery */}
          <section className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {avatars.map((avatar, i) => {
              const isTaken = takenAvatarIds.includes(avatar.id);
              const isSelected = selectedAvatarId === avatar.id;
              return (
                <article
                  key={avatar.id}
                  className={`group relative bg-surface-container-lowest rounded-lg overflow-hidden transition-all duration-300 border-2 ${
                    isSelected
                      ? 'border-primary ring-4 ring-primary/10'
                      : 'border-transparent hover:border-primary/40 hover:shadow-xl hover:shadow-black/10'
                  } ${isTaken ? 'opacity-40' : ''}`}
                >
                  {/* Avatar image area */}
                  <div className="aspect-[3/4] relative bg-surface-container-high overflow-hidden">
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: avatar.color + '22' }}
                    >
                      {failedImageIds.has(avatar.id) ? (
                        <div
                          data-testid={`avatar-fallback-${i}`}
                          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-lg"
                          style={{ backgroundColor: avatar.color }}
                        >
                          {avatar.name.charAt(0)}
                        </div>
                      ) : (
                        <img
                          data-testid={`avatar-image-${i}`}
                          src={avatar.imageUrl}
                          alt={avatar.name}
                          onError={() =>
                            setFailedImageIds((prev) => {
                              const next = new Set(prev);
                              next.add(avatar.id);
                              return next;
                            })
                          }
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-4 left-4 bg-primary text-on-primary text-[10px] font-black px-2 py-1 uppercase tracking-tighter rounded">
                        Selected
                      </div>
                    )}
                  </div>

                  {/* Avatar info */}
                  <div className="p-4 bg-surface-container-lowest">
                    <h3 className="font-black text-lg tracking-tighter uppercase text-on-surface">
                      {avatar.name}
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-bold tracking-wider uppercase mb-4">
                      {avatar.role}
                    </p>
                    <button
                      type="button"
                      data-testid={`avatar-option-${i}`}
                      disabled={isTaken}
                      aria-pressed={isSelected ? 'true' : 'false'}
                      onClick={() => !isTaken && setSelectedAvatarId(avatar.id)}
                      className="w-full py-2 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded hover:bg-primary-container transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSelected ? 'Selecionado' : 'Selecionar'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {/* Confirm */}
          <div className="flex justify-center">
            <button
              data-testid="confirm-button"
              type="submit"
              disabled={!canConfirm}
              className="px-16 py-4 bg-primary-container text-on-primary-container font-black text-sm uppercase tracking-widest rounded-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
            >
              Confirmar Operador
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
