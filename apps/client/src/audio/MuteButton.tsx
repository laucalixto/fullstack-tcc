import { useAudioStore } from '../stores/audioStore';

export function MuteButton() {
  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  return (
    <button
      data-testid="mute-button"
      onClick={toggleMute}
      aria-label={muted ? 'Ativar som' : 'Silenciar'}
      className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-lg hover:scale-105 transition-transform backdrop-blur-sm"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
