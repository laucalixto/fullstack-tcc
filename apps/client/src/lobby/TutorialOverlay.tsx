interface TutorialOverlayProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    number: 1,
    icon: '🎲',
    title: 'LANCE O DADO',
    description: 'Determine seu avanço no canteiro de obras industrial.',
  },
  {
    number: 2,
    icon: '⛑️',
    title: 'CUMPRA MISSÕES',
    description: 'Resolva desafios de NRs e garanta a segurança operacional.',
  },
  {
    number: 3,
    icon: '🏆',
    title: 'LIDERE O RANKING',
    description: 'Acumule pontos respondendo rápido e com precisão.',
  },
];

export function TutorialOverlay({ open, onClose }: TutorialOverlayProps) {
  if (!open) return null;

  return (
    <div data-testid="tutorial-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        data-testid="tutorial-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm"
      />

      {/* Content */}
      <div
        data-testid="tutorial-content"
        className="relative z-10 max-w-4xl w-full bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        {/* Main section */}
        <div className="w-full p-8 md:p-12">
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter mb-2 uppercase">
              Como Jogar
            </h1>
            <p className="text-secondary font-bold uppercase tracking-widest text-xs">
              Safety Board • Guia de Treinamento
            </p>
          </div>

          {/* Steps grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-surface-container-low hover:bg-surface-bright transition-all"
              >
                <div className="w-24 h-24 mb-6 relative flex items-center justify-center text-5xl">
                  {step.icon}
                  <span className="absolute -top-2 -right-2 bg-primary text-on-primary w-8 h-8 rounded-full flex items-center justify-center font-black text-sm">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-black text-on-surface mb-2 tracking-tight">{step.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center">
            <button
              data-testid="tutorial-close"
              onClick={onClose}
              className="w-full md:w-auto px-12 py-5 bg-primary-container text-on-primary-container font-black text-lg uppercase tracking-tighter rounded-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary-container/20"
            >
              Iniciar Partida
            </button>
            <p className="mt-4 text-xs text-on-surface-variant uppercase tracking-widest font-bold opacity-50">
              Tempo estimado: 15 minutos
            </p>
          </div>
        </div>

        {/* Side panel */}
        <div className="hidden lg:flex w-72 bg-surface-container-high p-8 flex-col justify-between items-start border-l border-outline-variant/10">
          <div>
            <span className="text-5xl mb-4 block">🏭</span>
            <h4 className="font-black text-xl tracking-tight leading-tight mb-4">STATUS DO TERMINAL</h4>
            <div className="space-y-4 w-full">
              <div className="p-3 bg-surface-container-low rounded-lg">
                <p className="text-[0.6rem] font-black opacity-50 uppercase mb-1">CONEXÃO</p>
                <p className="text-xs font-bold text-secondary">ESTÁVEL - OPS-04</p>
              </div>
              <div className="p-3 bg-surface-container-low rounded-lg">
                <p className="text-[0.6rem] font-black opacity-50 uppercase mb-1">PROTOCOLO</p>
                <p className="text-xs font-bold text-secondary">SST v2.4 ATIVO</p>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <div className="w-16 h-1 bg-primary mb-4" />
            <p className="text-[0.65rem] leading-tight font-medium opacity-70">
              SST INDUSTRIAL v4.2<br />
              SISTEMA DE TREINAMENTO<br />
              PROTOCOLO SEGURO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
