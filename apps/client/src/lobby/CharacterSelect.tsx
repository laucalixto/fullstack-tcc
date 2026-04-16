import { useState } from 'react';

const AVATAR_COLORS = ['#e63946', '#457b9d', '#2a9d8f', '#f4a261'] as const;

interface CharacterSelectProps {
  onConfirm: (firstName: string, lastName: string, colorIndex: number) => void;
  takenColors?: number[];
}

export function CharacterSelect({ onConfirm, takenColors = [] }: CharacterSelectProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedColor, setSelectedColor] = useState<number | null>(null);

  const canConfirm =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    selectedColor !== null;

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (canConfirm) onConfirm(firstName.trim(), lastName.trim(), selectedColor!);
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
        {AVATAR_COLORS.map((color, i) => {
          const isTaken = takenColors.includes(i);
          return (
            <button
              key={i}
              type="button"
              data-testid={`avatar-option-${i}`}
              disabled={isTaken}
              aria-pressed={selectedColor === i ? 'true' : 'false'}
              onClick={() => !isTaken && setSelectedColor(i)}
              style={{ backgroundColor: color }}
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
