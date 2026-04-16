interface TutorialOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function TutorialOverlay({ open, onClose }: TutorialOverlayProps) {
  if (!open) return null;

  return (
    <div data-testid="tutorial-overlay">
      <div
        data-testid="tutorial-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0 }}
      />
      <div data-testid="tutorial-content" style={{ position: 'relative', zIndex: 1 }}>
        <h2>Como jogar</h2>
        <p>
          O Safety Board é um jogo de tabuleiro sobre segurança no trabalho. Avance pelas casas,
          responda perguntas e aprenda sobre SST.
        </p>
        <button data-testid="tutorial-close" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}
