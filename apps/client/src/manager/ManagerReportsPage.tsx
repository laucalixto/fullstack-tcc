interface ManagerReportsPageProps {
  onExportCSV: () => void;
  isExporting?: boolean;
}

export function ManagerReportsPage({ onExportCSV, isExporting }: ManagerReportsPageProps) {
  return (
    <div className="px-6 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Relatórios</h1>
        <p className="text-on-surface/60 text-sm mt-1">Exporte dados históricos de todas as sessões</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 max-w-lg">
        <h2 className="text-base font-bold text-on-surface mb-2">Exportação Completa</h2>
        <p className="text-sm text-on-surface/60 mb-6">
          Gera um arquivo CSV com todas as sessões finalizadas, incluindo pontuações individuais,
          respostas corretas, cards ativados e status de participação de cada jogador.
        </p>
        <button
          data-testid="reports-export-btn"
          onClick={onExportCSV}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-md shadow hover:brightness-110 active:scale-95 transition-all uppercase text-[11px] tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Exportando...
            </>
          ) : (
            '↓ Baixar CSV Completo'
          )}
        </button>
      </div>
    </div>
  );
}
