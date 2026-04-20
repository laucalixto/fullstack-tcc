import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock do HTMLMediaElement (usado pelo Howler/JSDOM)
Object.defineProperty(global.window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(global.window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(global.window.HTMLMediaElement.prototype, 'load', {
  configurable: true,
  value: vi.fn(),
});

// Mock global do howler para evitar erros de áudio em testes de componentes.
// Isso fornece uma implementação funcional que não dispara áudio real.
vi.mock('howler', () => {
  return {
    Howl: vi.fn().mockImplementation(() => ({
      play: vi.fn(),
      stop: vi.fn(),
      fade: vi.fn(),
      volume: vi.fn().mockReturnValue(1.0),
      on: vi.fn(),
      off: vi.fn(),
      unload: vi.fn(),
    })),
    Howler: { 
      mute: vi.fn(),
      volume: vi.fn(),
    },
  };
});
