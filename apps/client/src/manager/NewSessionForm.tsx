import { useState, useCallback } from 'react';
import type { NewSessionConfig, SessionDifficulty } from '@safety-board/shared';

interface NewSessionFormProps {
  onCreateSession: (config: NewSessionConfig) => void;
  generatedPin?: string;
  shareLink?: string;
  isLoading?: boolean;
}

const DIFFICULTIES: { value: SessionDifficulty; label: string; description: string }[] = [
  { value: 'basic',        label: 'Básico',        description: 'Questões fundamentais de SST' },
  { value: 'intermediate', label: 'Intermediário', description: 'Questões de complexidade moderada' },
  { value: 'advanced',     label: 'Avançado',      description: 'Questões técnicas e desafiadoras' },
];

const TEST_ID: Record<SessionDifficulty, string> = {
  basic: 'session-difficulty-basic',
  intermediate: 'session-difficulty-intermediate',
  advanced: 'session-difficulty-advanced',
};

export function NewSessionForm({ onCreateSession, generatedPin, shareLink, isLoading = false }: NewSessionFormProps) {
  const [difficulty, setDifficulty] = useState<SessionDifficulty>('basic');
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(2);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    onCreateSession({ difficulty, maxPlayers });
  }

  const handleCopy = useCallback(async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para ambientes sem Clipboard API (HTTP não-seguro)
      const el = document.createElement('input');
      el.value = shareLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareLink]);

  return (
    <div className="px-6 md:px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">
          Configuração de Sessão
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Nova Sessão</h1>
        <p className="text-on-surface/60 text-sm mt-1">
          Configure os parâmetros e gere o PIN para que os participantes entrem.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 space-y-8">
          {/* Difficulty */}
          <div>
            <label className="block text-[0.75rem] font-bold uppercase tracking-[0.05rem] text-on-surface/60 mb-4">
              Dificuldade das Perguntas
            </label>
            <div className="grid grid-cols-1 gap-3">
              {DIFFICULTIES.map(({ value, label, description }) => (
                <label
                  key={value}
                  className="flex items-center p-4 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-bright transition-all border-2 border-transparent has-[:checked]:border-primary"
                >
                  <input
                    data-testid={TEST_ID[value]}
                    type="radio"
                    name="difficulty"
                    value={value}
                    checked={difficulty === value}
                    onChange={() => setDifficulty(value)}
                    className="text-primary focus:ring-primary h-5 w-5 border-outline-variant"
                  />
                  <div className="ml-4">
                    <div className="font-bold text-on-surface">{label}</div>
                    <div className="text-xs text-on-surface/50 uppercase tracking-wider">{description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Players + Generate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[0.75rem] font-bold uppercase tracking-[0.05rem] text-on-surface/60 mb-2">
                Participantes
              </label>
              <select
                data-testid="session-max-players"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value) as 2 | 3 | 4)}
                className="w-full bg-surface-container-high border-0 border-b-2 border-outline-variant focus:border-primary focus:ring-0 text-on-surface font-semibold py-3 px-4 rounded-t-md"
              >
                <option value={2}>2 jogadores</option>
                <option value={3}>3 jogadores</option>
                <option value={4}>4 jogadores</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                data-testid="session-generate-pin"
                type="button"
                disabled={isLoading}
                onClick={handleGenerate}
                className="w-full h-[50px] bg-primary text-white font-black uppercase tracking-widest text-sm rounded-md shadow active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  'Gerar PIN'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* PIN display card */}
        <div className="space-y-4">
          {generatedPin && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 ring-1 ring-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-tighter rounded-bl-lg">
                Ativa
              </div>
              <h3 className="text-[0.75rem] font-bold uppercase tracking-widest text-primary mb-4">
                PIN de Acesso
              </h3>
              <div className="bg-surface-container-high rounded-lg p-5 mb-4 flex items-center justify-center">
                <span
                  data-testid="session-pin-display"
                  className="text-5xl font-black text-on-surface tracking-widest"
                >
                  {generatedPin}
                </span>
              </div>
              {shareLink && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface/50 mb-1">
                    Link de Convite
                  </label>
                  <div className="flex gap-2">
                    <div
                      data-testid="session-share-link"
                      className="flex-1 bg-surface-container-high px-3 py-2 text-xs font-mono text-on-surface/70 truncate rounded-l-md border border-outline-variant/20"
                    >
                      {shareLink}
                    </div>
                    <button
                      data-testid="session-copy-link"
                      onClick={handleCopy}
                      title="Copiar link"
                      className="bg-primary text-white px-3 py-2 rounded-r-md hover:brightness-110 active:scale-95 transition-all min-w-[42px]"
                    >
                      {copied ? '✓' : '↗'}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-[10px] text-primary font-bold mt-1 uppercase tracking-widest">
                      Link copiado!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {!generatedPin && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 flex flex-col items-center justify-center gap-3 min-h-[200px] border-2 border-dashed border-outline-variant/30">
              <p className="text-on-surface/30 text-sm font-bold uppercase tracking-widest text-center">
                O PIN aparece aqui após gerar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
