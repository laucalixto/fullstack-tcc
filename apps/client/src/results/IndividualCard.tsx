import type { GameResultPlayer } from '@safety-board/shared';

interface IndividualCardProps {
  player: GameResultPlayer;
  onRegister?: () => void;
  onViewDashboard?: () => void;
}

function calcAccuracy(correct: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((correct / total) * 100)}%`;
}

function calcAccuracyNum(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

const RANK_LABEL: Record<number, string> = {
  1: 'Operador Elite',
  2: 'Operador Nível Prata',
  3: 'Operador Nível Bronze',
  4: 'Operador',
};

export function IndividualCard({ player, onRegister, onViewDashboard }: IndividualCardProps) {
  const isWinner = player.rank === 1;
  const accuracyNum = calcAccuracyNum(player.correctAnswers, player.totalAnswers);

  return (
    <div
      data-testid="individual-card"
      data-winner={isWinner ? 'true' : 'false'}
      className="bg-surface text-on-surface min-h-screen font-body"
    >
      {/* TopNav */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-sm flex items-center px-6 h-16">
        <span className="text-xl font-black uppercase tracking-tighter text-on-surface">Safety Board</span>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-6xl mx-auto space-y-8">
        {/* Header: Profile + Score */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Profile card */}
          <div className="md:col-span-4 bg-surface-container-lowest p-8 rounded-lg shadow-sm border-l-4 border-primary flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full border-4 border-white flex items-center justify-center bg-primary/10 shadow-xl">
                <span className="text-5xl font-black text-primary">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              </div>
              {isWinner && (
                <div className="absolute -bottom-2 -right-2 bg-secondary text-on-secondary w-10 h-10 rounded-full flex items-center justify-center border-2 border-white text-xl">
                  🏆
                </div>
              )}
            </div>

            <h1
              data-testid="individual-card-name"
              className="text-2xl font-black text-on-surface uppercase tracking-tight"
            >
              {player.name}
            </h1>
            <p className="text-on-surface-variant font-bold text-[10px] tracking-[0.2em] uppercase mt-1">
              {RANK_LABEL[player.rank] ?? `${player.rank}º Lugar`}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 w-full border-t border-outline-variant/20 pt-6">
              <div className="text-center">
                <p className="text-on-surface-variant text-[10px] uppercase tracking-wider font-bold">Ranking</p>
                <p
                  data-testid="individual-card-rank"
                  className="text-xl font-black text-secondary"
                >
                  #{player.rank}º
                </p>
              </div>
              <div className="text-center border-l border-outline-variant/20">
                <p className="text-on-surface-variant text-[10px] uppercase tracking-wider font-bold">Posição</p>
                <p
                  data-testid="individual-card-position"
                  className="text-xl font-black text-on-surface"
                >
                  {player.finalPosition}
                </p>
              </div>
            </div>
          </div>

          {/* Score card — dark */}
          <div className="md:col-span-8 bg-on-surface text-surface p-10 rounded-lg relative overflow-hidden flex flex-col justify-center">
            <span className="absolute -right-8 -bottom-8 text-[200px] text-white/5 pointer-events-none select-none">
              🛡
            </span>
            <div className="relative z-10">
              <h3 className="text-primary-container text-xs font-black uppercase tracking-[0.3em] mb-2">
                Pontuação Total SST
              </h3>
              <div className="flex items-baseline gap-4">
                <span
                  data-testid="individual-card-score"
                  className="text-[5rem] leading-none font-black tracking-tighter text-surface"
                >
                  {player.score.toLocaleString()}
                </span>
                <span className="text-2xl font-bold text-primary-container">PTS</span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats bento grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-surface-container p-6 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <span className="text-secondary text-3xl">✅</span>
              <span className="bg-secondary-container text-on-secondary-container px-2 py-1 rounded text-[10px] font-bold">
                <span data-testid="individual-card-accuracy">{calcAccuracy(player.correctAnswers, player.totalAnswers)}</span>
              </span>
            </div>
            <p className="text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-1">
              Respostas Corretas
            </p>
            <p
              data-testid="individual-card-answers"
              className="text-3xl font-black"
            >
              {player.correctAnswers}/{player.totalAnswers}
            </p>
          </div>

          <div className="bg-surface-container p-6 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <span className="text-primary text-3xl">📍</span>
            </div>
            <p className="text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-1">
              Casa Final
            </p>
            <p className="text-3xl font-black">{player.finalPosition}</p>
          </div>

          <div className="bg-surface-container p-6 rounded-lg col-span-2">
            <p className="text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-3">
              Taxa de Acertos
            </p>
            <div className="w-full bg-surface-dim h-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${accuracyNum}%` }}
              />
            </div>
            <p className="text-right text-xs font-bold text-primary mt-1">{accuracyNum}%</p>
          </div>
        </section>

        {(onViewDashboard || onRegister) && (
          <section className="flex justify-center">
            {onViewDashboard ? (
              <button
                data-testid="individual-card-dashboard-btn"
                onClick={onViewDashboard}
                className="rounded-lg bg-gradient-to-r from-secondary to-secondary-container px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95"
              >
                Ver meu painel
              </button>
            ) : (
              <button
                data-testid="individual-card-register-btn"
                onClick={onRegister}
                className="rounded-lg bg-gradient-to-r from-primary to-primary-container px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95"
              >
                Salvar meu progresso — Criar conta
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
