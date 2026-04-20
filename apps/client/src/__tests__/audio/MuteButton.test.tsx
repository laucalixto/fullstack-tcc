import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../audio/AudioManager', () => ({
  audioManager: { setMuted: vi.fn() },
}));

import { MuteButton } from '../../audio/MuteButton';
import { useAudioStore } from '../../stores/audioStore';

describe('MuteButton', () => {
  beforeEach(() => {
    useAudioStore.setState({ muted: false });
  });

  it('renderiza o botão de mute', () => {
    render(<MuteButton />);
    expect(screen.getByTestId('mute-button')).toBeInTheDocument();
  });

  it('exibe ícone de som ativo quando não mutado', () => {
    render(<MuteButton />);
    expect(screen.getByLabelText('Silenciar')).toBeInTheDocument();
  });

  it('exibe ícone de mudo quando mutado', () => {
    useAudioStore.setState({ muted: true });
    render(<MuteButton />);
    expect(screen.getByLabelText('Ativar som')).toBeInTheDocument();
  });

  it('clicar alterna o estado de mute', () => {
    render(<MuteButton />);
    fireEvent.click(screen.getByTestId('mute-button'));
    expect(useAudioStore.getState().muted).toBe(true);
  });
});
