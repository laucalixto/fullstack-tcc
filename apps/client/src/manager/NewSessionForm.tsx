import { useState, useCallback } from 'react';
import type { NewSessionConfig, SessionDifficulty } from '@safety-board/shared';

interface NewSessionFormProps {
  onCreateSession: (config: NewSessionConfig) => void;
  generatedPin?: string;
  shareLink?: string;
  isLoading?: boolean;
}

const DIFFICULTIES: { value: SessionDifficulty; label: string; description: string }[] = [
  { value: 'basic', label: 'Básico (NR-01, NR-06)', description: 'Integração e EPIs' },
  { value: 'intermediate', label: 'Intermediário (NR-11, NR-12)', description: 'Maquinário e Transporte' },
  { value: 'advanced', label: 'Avançado (NR-10, NR-33, NR-35)', description: 'Eletricidade e Altura' },
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
    <div className="bg-surface text-on-surface antialiased">
      {/* Top nav */}
      <nav className="fixed top-0 w-full z-50 bg-surface-bright/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black uppercase tracking-tighter text-on-surface">Safety Board</span>
          <div className="h-4 w-[1px] bg-outline-variant mx-2" />
          <span className="text-primary font-bold border-b-2 border-primary tracking-tight">OPERAÇÃO CONFORMIDADE 3D</span>
        </div>
      </nav>

      {/* Side nav (desktop) */}
      <aside className="h-full w-64 fixed left-0 top-0 z-40 bg-surface-container-low pt-20 hidden md:flex flex-col p-4 gap-2">
        <div className="mb-8 px-4">
          <p className="text-xs font-bold tracking-widest text-on-surface/50 uppercase">Missão Ativa</p>
          <p className="text-sm font-bold text-on-surface mt-1">SST Nível 4</p>
        </div>
        <nav className="space-y-1">
          {['Mapa 3D', 'Jogadores', 'Missões', 'Conquistas', 'Suporte'].map((item, i) => (
            <div
              key={item}
              className={`flex items-center gap-3 p-3 rounded-lg text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-all ${
                i === 0
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface/60 hover:bg-surface-bright hover:translate-x-1 duration-300'
              }`}
            >
              {item}
            </div>
          ))}
        </nav>
        <div className="mt-auto p-4">
          <button className="w-full py-3 bg-primary text-white font-bold rounded-md hover:bg-primary-container transition-colors uppercase text-[11px] tracking-widest active:scale-95">
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="md:pl-64 pt-16 min-h-screen bg-surface">
        <div className="p-8 max-w-6xl mx-auto">
          {/* Hero header */}
          <div className="mb-12 flex justify-between items-end">
            <div className="max-w-xl">
              <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">
                Configuração de Módulo
              </span>
              <h2 className="text-4xl font-black text-on-surface tracking-tighter leading-none mb-4 uppercase">
                Nova Sessão 3D
              </h2>
              <p className="text-on-surface/60 leading-relaxed">
                Defina os parâmetros técnicos para a simulação imersiva de segurança do trabalho.
                O PIN gerado permitirá que os operadores entrem no ambiente virtual simultaneamente.
              </p>
            </div>
            <div className="text-on-surface/10 font-black text-6xl tracking-tighter uppercase hidden lg:block">
              CONF-3D
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Main form card */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="bg-surface-container-lowest p-8 shadow-sm space-y-8">
                {/* Difficulty */}
                <div>
                  <label className="block text-[0.75rem] font-bold uppercase tracking-[0.05rem] text-on-surface/60 mb-4">
                    Dificuldade da Simulação
                  </label>
                  <div className="grid grid-cols-1 gap-4">
                    {DIFFICULTIES.map(({ value, label, description }) => (
                      <label
                        key={value}
                        className="flex items-center p-4 bg-surface-container-low cursor-pointer hover:bg-surface-bright transition-all border-b-2 border-transparent has-[:checked]:border-primary"
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
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[0.75rem] font-bold uppercase tracking-[0.05rem] text-on-surface/60 mb-3">
                      Participantes
                    </label>
                    <select
                      data-testid="session-max-players"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value) as 2 | 3 | 4)}
                      className="w-full bg-surface-container-high border-none border-b-2 border-outline-variant focus:border-primary focus:ring-0 text-on-surface font-semibold py-3 px-4"
                    >
                      <option value={2}>2 players</option>
                      <option value={3}>3 players</option>
                      <option value={4}>4 players</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      data-testid="session-generate-pin"
                      type="button"
                      disabled={isLoading}
                      onClick={handleGenerate}
                      className="w-full h-[50px] bg-gradient-to-r from-primary to-primary-container text-white font-black uppercase tracking-widest text-sm rounded-md shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                    >
                      {isLoading ? (
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        '⚡ Gerar PIN'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* PIN display card */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              {generatedPin && (
                <div className="bg-surface-container-high p-8 shadow-md ring-1 ring-primary/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 bg-primary text-white text-[10px] font-black uppercase tracking-tighter">
                    Sessão Ativa
                  </div>
                  <h3 className="text-[0.75rem] font-bold uppercase tracking-[0.1rem] text-primary mb-6">
                    PIN de Acesso Gerado
                  </h3>
                  <div className="flex justify-between items-center bg-surface-container-lowest p-6 mb-6">
                    <span
                      data-testid="session-pin-display"
                      className="text-5xl font-black text-on-surface tracking-tighter"
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
                          className="flex-1 bg-surface-container-high px-4 py-2 text-xs font-mono text-on-surface/70 truncate border-b border-outline-variant"
                        >
                          {shareLink}
                        </div>
                        <button
                          data-testid="session-copy-link"
                          onClick={handleCopy}
                          title="Copiar link"
                          className="bg-secondary text-on-secondary px-3 py-2 flex items-center justify-center hover:opacity-90 active:scale-95 transition-all min-w-[42px]"
                        >
                          {copied ? '✓' : '📋'}
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

              {/* Network status card */}
              <div className="bg-secondary text-on-secondary p-8 flex flex-col justify-between h-48 relative overflow-hidden">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Status da Rede</h4>
                  <div className="text-2xl font-bold tracking-tight">Servidor Local: ON</div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold opacity-60">Latência</div>
                    <div className="text-lg font-bold">14ms</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
