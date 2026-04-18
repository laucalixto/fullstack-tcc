export function GameLoading() {
  return (
    <div
      data-testid="game-loading"
      className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center gap-8"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Spinner */}
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-on-surface">
            Preparando o tabuleiro
          </h2>
          <p className="text-secondary text-sm font-medium">
            Aguardando todos os jogadores estarem prontos...
          </p>
        </div>
      </div>
    </div>
  );
}
