export function ManagerSupportPage() {
  return (
    <div className="px-6 md:px-8 py-8">
      <div className="mb-8">
        <h1 data-testid="support-title" className="text-2xl font-extrabold tracking-tight text-on-surface">Suporte</h1>
        <p className="text-on-surface/60 text-sm mt-1">Dúvidas e informações de contato</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-bold text-on-surface mb-3 uppercase tracking-widest">Contato Técnico</h2>
          <p className="text-sm text-on-surface/70">suporte@safetyboard.com.br</p>
          <p className="text-sm text-on-surface/60 mt-1">Seg–Sex, 08h–18h</p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-bold text-on-surface mb-3 uppercase tracking-widest">Versão do Sistema</h2>
          <p className="text-sm text-on-surface/70">Safety Board v1.0.0</p>
          <p className="text-sm text-on-surface/60 mt-1">Conforme NR-01 · ISO 45001</p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 md:col-span-2">
          <h2 className="text-sm font-bold text-on-surface mb-3 uppercase tracking-widest">Perguntas Frequentes</h2>
          <ul className="space-y-2 text-sm text-on-surface/70">
            <li>• Como criar uma nova sessão? Acesse Dashboard → Nova Sessão.</li>
            <li>• Como editar dados de um jogador? Acesse Jogadores no menu lateral.</li>
            <li>• Como exportar relatórios? Acesse Relatórios no menu superior.</li>
            <li>• Como adicionar questões? Acesse Conteúdos no menu superior.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
