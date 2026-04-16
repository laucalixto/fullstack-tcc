import { useState } from 'react';
import { AVATARS } from '@safety-board/shared';
import type { AvatarOption } from '@safety-board/shared';

interface CharacterSelectProps {
  onConfirm: (firstName: string, lastName: string, avatarId: string) => void;
  avatars?: AvatarOption[];
  takenAvatarIds?: string[];
}

export function CharacterSelect({
  onConfirm,
  avatars = AVATARS,
  takenAvatarIds = [],
}: CharacterSelectProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);

  const canConfirm =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    selectedAvatarId !== null;

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (canConfirm) onConfirm(firstName.trim(), lastName.trim(), selectedAvatarId!);
  }

  return (
    <form onSubmit={handleConfirm}>
      <input
        data-testid="first-name-input"
        type="text"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="Nome"
      />
      <input
        data-testid="last-name-input"
        type="text"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Sobrenome"
      />

      <div>
        {avatars.map((avatar, i) => {
          const isTaken = takenAvatarIds.includes(avatar.id);
          return (
            <button
              key={avatar.id}
              type="button"
              data-testid={`avatar-option-${i}`}
              disabled={isTaken}
              aria-pressed={selectedAvatarId === avatar.id ? 'true' : 'false'}
              onClick={() => !isTaken && setSelectedAvatarId(avatar.id)}
              style={{ backgroundColor: avatar.color }}
            />
          );
        })}
      </div>

      <button
        data-testid="confirm-button"
        type="submit"
        disabled={!canConfirm}
      >
        Confirmar
      </button>
    </form>
  );
}
