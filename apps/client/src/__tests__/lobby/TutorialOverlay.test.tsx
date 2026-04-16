import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorialOverlay } from '../../lobby/TutorialOverlay';

// ─── RED: falha até TutorialOverlay.tsx ser implementado ─────────────────────

describe('TutorialOverlay', () => {
  it('não renderiza nada quando open é false', () => {
    render(<TutorialOverlay open={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('tutorial-overlay')).not.toBeInTheDocument();
  });

  it('renderiza o overlay quando open é true', () => {
    render(<TutorialOverlay open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('tutorial-overlay')).toBeInTheDocument();
  });

  it('renderiza botão de fechar', () => {
    render(<TutorialOverlay open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('tutorial-close')).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão fechar', () => {
    const onClose = vi.fn();
    render(<TutorialOverlay open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('tutorial-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exibe conteúdo de tutorial', () => {
    render(<TutorialOverlay open={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('tutorial-content')).toBeInTheDocument();
  });

  it('chama onClose ao clicar no backdrop', () => {
    const onClose = vi.fn();
    render(<TutorialOverlay open={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('tutorial-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
