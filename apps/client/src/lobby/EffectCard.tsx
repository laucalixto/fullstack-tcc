import { useEffect, useRef } from 'react';
import type { TileEffectDefinition, TileEffectType } from '@safety-board/shared';

interface EffectCardProps {
  open: boolean;
  card: TileEffectDefinition;
  onClose: () => void;
  autoCloseSeconds?: number;
}

const BADGE: Record<TileEffectType, string> = {
  'accident':     'ACIDENTE',
  'prevention':   'PREVENÇÃO',
  'back-to-start':'VOLTA AO INÍCIO',
  'skip-turn':    'PERDE A VEZ',
};

const BADGE_COLOR: Record<TileEffectType, string> = {
  'accident':     'bg-red-600',
  'prevention':   'bg-green-600',
  'back-to-start':'bg-purple-700',
  'skip-turn':    'bg-amber-600',
};

function formatEffect(card: TileEffectDefinition): string {
  const parts: string[] = [];
  if (!card.backToStart && card.deltaPosition !== 0) {
    const sign = card.deltaPosition > 0 ? '+' : '';
    parts.push(`${sign}${card.deltaPosition} casas`);
  }
  if (card.skipTurns > 0) {
    parts.push('Perde próxima rodada');
  }
  if (card.deltaScore !== 0) {
    const sign = card.deltaScore > 0 ? '+' : '';
    parts.push(`${sign}${card.deltaScore} pts`);
  }
  return parts.join(' · ');
}

export function EffectCard({ open, card, onClose, autoCloseSeconds = 8 }: EffectCardProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    timerRef.current = setTimeout(onClose, autoCloseSeconds * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, autoCloseSeconds, onClose]);

  if (!open) return null;

  const badge = BADGE[card.type];
  const badgeColor = BADGE_COLOR[card.type];
  const effectText = formatEffect(card);

  return (
    <div
      data-testid="effect-card"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={{
          width: 320,
          height: 448,
          animation: 'effect-card-flip 600ms ease-out both',
        }}
      >
        {/* Imagem full-bleed */}
        <img
          src={card.imagePath}
          alt={card.title}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Box inferior semitransparente */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-5 pb-5 pt-4 flex flex-col gap-2">
          <span className={`self-start rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-white ${badgeColor}`}>
            {badge}
          </span>

          <p className="text-base font-black text-white leading-tight">{card.title}</p>
          <p className="text-xs text-white/70 leading-snug">{card.description}</p>

          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-white/50 font-mono">{card.normRef}</span>
            {effectText && (
              <span className="text-xs font-bold text-white/90">{effectText}</span>
            )}
          </div>

          <button
            onClick={() => {
              if (timerRef.current) clearTimeout(timerRef.current);
              onClose();
            }}
            className="mt-2 w-full rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 py-2.5 text-sm font-black uppercase tracking-widest text-white transition-colors active:scale-95"
          >
            Continuar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes effect-card-flip {
          0%   { transform: rotateY(90deg) scale(0.85); opacity: 0; }
          60%  { transform: rotateY(-8deg) scale(1.02); opacity: 1; }
          100% { transform: rotateY(0deg)  scale(1);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
