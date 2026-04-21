import type { SessionDetail } from '@safety-board/shared';

interface ManagerSessionDetailPageProps {
  detail: SessionDetail;
  onBack: () => void;
}

export function ManagerSessionDetailPage({ detail, onBack }: ManagerSessionDetailPageProps) {
  const duration = detail.durationSeconds
    ? `${Math.floor(detail.durationSeconds / 60)}min ${detail.durationSeconds % 60}s`
    : '--';

  return (
    <div className="px-6 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          data-testid="detail-back-btn"
          onClick={onBack}
          className="px-4 py-2 bg-surface-container-high text-on-surface/70 text-[11px] font-bold rounded uppercase tracking-widest hover:bg-surface-bright transition"
        >
          ← Voltar
        </button>
        <div>
          <h1 data-testid="detail-session-name" className="text-2xl font-extrabold tracking-tight text-on-surface">
            {detail.sessionName}
          </h1>
          <p className="text-sm text-on-surface/60 mt-1">
            PIN: <span data-testid="detail-session-pin" className="font-mono font-bold">{detail.pin}</span>
            {' · '}Duração: {duration}
            {' · '}Status: <span className="font-bold capitalize">{detail.status === 'completed' ? 'Concluída' : 'Ativa'}</span>
          </p>
        </div>
      </div>

      {/* Players */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-container">
          <h2 className="text-base font-bold text-on-surface">Jogadores</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {['Nome', 'Score', 'Rank', 'Posição', 'Corretas/Total', 'Status'].map((h) => (
                  <th key={h} className="p-3 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {detail.players.map((p) => (
                <tr key={p.playerId} data-testid={`detail-player-row-${p.playerId}`} className="hover:bg-surface-bright">
                  <td className="p-3 text-sm font-bold text-on-surface">{p.name}</td>
                  <td className="p-3 text-sm font-black text-primary">{p.score}</td>
                  <td className="p-3 text-sm text-on-surface/70">{p.rank ?? '--'}</td>
                  <td className="p-3 text-sm text-on-surface/70">{p.finalPosition}</td>
                  <td className="p-3 text-sm text-on-surface/70">{p.correctAnswers}/{p.totalAnswers}</td>
                  <td className="p-3">
                    {p.dropped
                      ? <span className="text-[10px] font-bold text-error uppercase bg-error/10 px-2 py-0.5 rounded">Saiu</span>
                      : <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded">Finalizou</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quiz Log */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-container">
          <h2 className="text-base font-bold text-on-surface">Log de Quiz ({detail.quizLog.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {['Jogador', 'Pergunta', 'Resposta do jogador', 'Correta?', 'Latência'].map((h) => (
                  <th key={h} className="p-3 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {detail.quizLog.map((entry, i) => (
                <tr key={i} data-testid={`detail-quiz-row-${i}`} className="hover:bg-surface-bright">
                  <td className="p-3 text-sm font-bold text-on-surface">{entry.playerName}</td>
                  <td className="p-3 text-sm text-on-surface/70 max-w-xs truncate">{entry.questionText}</td>
                  <td className="p-3 text-sm text-on-surface/70">{entry.selectedText}</td>
                  <td className="p-3">
                    {entry.correct
                      ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">✓ Correto</span>
                      : <span className="text-[10px] font-bold text-error bg-error/10 px-2 py-0.5 rounded">✗ Errado</span>
                    }
                  </td>
                  <td className="p-3 text-sm text-on-surface/60">{entry.latencyMs}ms</td>
                </tr>
              ))}
              {detail.quizLog.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-on-surface/30 text-sm">Sem respostas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tile Log */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-container">
          <h2 className="text-base font-bold text-on-surface">Log de Cards ({detail.tileLog.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {['Jogador', 'Tile', 'Efeito', 'Tipo', 'ΔScore', 'ΔPosição'].map((h) => (
                  <th key={h} className="p-3 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {detail.tileLog.map((entry, i) => (
                <tr key={i} data-testid={`detail-tile-row-${i}`} className="hover:bg-surface-bright">
                  <td className="p-3 text-sm font-bold text-on-surface">{entry.playerName}</td>
                  <td className="p-3 text-sm font-mono text-on-surface/70">{entry.tileIndex}</td>
                  <td className="p-3 text-sm text-on-surface/70">{entry.effectTitle}</td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      entry.effectType === 'prevention' ? 'bg-emerald-50 text-emerald-700' : 'bg-error/10 text-error'
                    }`}>
                      {entry.effectType}
                    </span>
                  </td>
                  <td className={`p-3 text-sm font-bold ${entry.deltaScore >= 0 ? 'text-emerald-600' : 'text-error'}`}>
                    {entry.deltaScore >= 0 ? '+' : ''}{entry.deltaScore}
                  </td>
                  <td className={`p-3 text-sm font-bold ${entry.deltaPosition >= 0 ? 'text-emerald-600' : 'text-error'}`}>
                    {entry.deltaPosition >= 0 ? '+' : ''}{entry.deltaPosition}
                  </td>
                </tr>
              ))}
              {detail.tileLog.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-on-surface/30 text-sm">Sem cards ativados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
