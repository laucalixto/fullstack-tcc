import { useState } from 'react';
import type { ManagedPlayer } from '@safety-board/shared';

interface ManagerPlayersPageProps {
  players: ManagedPlayer[];
  onSave: (playerId: string, patch: Partial<ManagedPlayer>) => void;
  isLoading?: boolean;
}

interface EditState {
  firstName: string;
  lastName: string;
  industrialUnit: string;
  totalScore: number;
}

export function ManagerPlayersPage({ players, onSave, isLoading }: ManagerPlayersPageProps) {
  const [editing, setEditing] = useState<Record<string, EditState>>({});

  function startEdit(p: ManagedPlayer) {
    setEditing((prev) => ({
      ...prev,
      [p.playerId]: {
        firstName: p.firstName,
        lastName: p.lastName,
        industrialUnit: p.industrialUnit,
        totalScore: p.totalScore,
      },
    }));
  }

  function cancelEdit(playerId: string) {
    setEditing((prev) => { const next = { ...prev }; delete next[playerId]; return next; });
  }

  function saveEdit(playerId: string) {
    const patch = editing[playerId];
    if (!patch) return;
    onSave(playerId, patch);
    cancelEdit(playerId);
  }

  return (
    <div className="px-6 md:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Gestão de Jogadores</h1>
        <p className="text-on-surface/60 text-sm mt-1">Edite os dados cadastrais dos participantes</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {['Nome', 'E-mail', 'Unidade', 'Score', 'Partidas', 'Ações'].map((h) => (
                  <th key={h} className="p-4 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {players.map((p) => {
                const isEditing = p.playerId in editing;
                const draft = editing[p.playerId];
                return (
                  <tr
                    key={p.playerId}
                    data-testid={`player-row-${p.playerId}`}
                    className="hover:bg-surface-bright transition-colors"
                  >
                    <td className="p-4">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            data-testid={`player-input-firstName-${p.playerId}`}
                            value={draft.firstName}
                            onChange={(e) => setEditing((prev) => ({ ...prev, [p.playerId]: { ...prev[p.playerId], firstName: e.target.value } }))}
                            className="w-24 border-b border-primary bg-transparent text-sm font-bold focus:outline-none px-1"
                          />
                          <input
                            data-testid={`player-input-lastName-${p.playerId}`}
                            value={draft.lastName}
                            onChange={(e) => setEditing((prev) => ({ ...prev, [p.playerId]: { ...prev[p.playerId], lastName: e.target.value } }))}
                            className="w-28 border-b border-primary bg-transparent text-sm font-bold focus:outline-none px-1"
                          />
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-on-surface">{p.firstName} {p.lastName}</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-on-surface/60">{p.email}</td>
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          data-testid={`player-input-unit-${p.playerId}`}
                          value={draft.industrialUnit}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [p.playerId]: { ...prev[p.playerId], industrialUnit: e.target.value } }))}
                          className="w-32 border-b border-primary bg-transparent text-sm focus:outline-none px-1"
                        />
                      ) : (
                        <span className="text-xs font-bold px-2 py-1 bg-surface-container-high rounded text-on-surface/70">{p.industrialUnit}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {isEditing ? (
                        <input
                          data-testid={`player-input-score-${p.playerId}`}
                          type="number"
                          value={draft.totalScore}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [p.playerId]: { ...prev[p.playerId], totalScore: Number(e.target.value) } }))}
                          className="w-20 border-b border-primary bg-transparent text-sm font-bold focus:outline-none px-1"
                        />
                      ) : (
                        <span className="text-sm font-black text-primary">{p.totalScore}</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-on-surface/60">{p.gameCount}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button
                              data-testid={`player-save-${p.playerId}`}
                              onClick={() => saveEdit(p.playerId)}
                              disabled={isLoading}
                              className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded uppercase tracking-widest disabled:opacity-40 hover:brightness-110 transition"
                            >
                              Salvar
                            </button>
                            <button
                              data-testid={`player-cancel-${p.playerId}`}
                              onClick={() => cancelEdit(p.playerId)}
                              className="px-3 py-1 bg-surface-container-high text-on-surface/60 text-[10px] font-bold rounded uppercase tracking-widest hover:bg-surface-bright transition"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            data-testid={`player-edit-${p.playerId}`}
                            onClick={() => startEdit(p)}
                            className="px-3 py-1 bg-surface-container-high text-on-surface/70 text-[10px] font-bold rounded uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {players.length === 0 && (
            <div className="p-12 text-center text-on-surface/40 text-sm font-bold uppercase tracking-widest">
              Nenhum jogador cadastrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
