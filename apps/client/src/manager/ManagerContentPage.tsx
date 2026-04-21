import { useState } from 'react';
import type { QuizQuestionFull, QuizQuestionInput } from '@safety-board/shared';

interface ManagerContentPageProps {
  norms: Array<{ normId: string; title: string }>;
  questions: QuizQuestionFull[];
  onSaveQuestion: (id: string, patch: QuizQuestionInput) => void;
  onAddQuestion: (payload: QuizQuestionInput) => void;
  onDeleteQuestion: (id: string) => void;
  onAddNorm: (normId: string, title: string) => void;
  onDeleteNorm: (normId: string) => void;
}

interface EditDraft {
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

const EMPTY_NEW: EditDraft = { text: '', options: ['', ''], correctIndex: 0, difficulty: 'basic' };

const DIFF_BADGE: Record<string, string> = {
  basic:        'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced:     'bg-rose-100 text-rose-700',
};
const DIFF_LABEL: Record<string, string> = {
  basic: 'Básico', intermediate: 'Interm.', advanced: 'Avançado',
};

export function ManagerContentPage({ norms, questions, onSaveQuestion, onAddQuestion, onDeleteQuestion, onAddNorm, onDeleteNorm }: ManagerContentPageProps) {
  const [activeNorm, setActiveNorm] = useState(norms[0]?.normId ?? '');
  const [editing, setEditing] = useState<Record<string, EditDraft>>({});
  const [newQ, setNewQ] = useState<EditDraft>({ ...EMPTY_NEW });
  const [showNewNorm, setShowNewNorm] = useState(false);
  const [newNormId, setNewNormId] = useState('');
  const [newNormTitle, setNewNormTitle] = useState('');

  const filtered = questions.filter((q) => q.normId === activeNorm);

  function startEdit(q: QuizQuestionFull) {
    setEditing((prev) => ({
      ...prev,
      [q.id]: { text: q.text, options: [...q.options], correctIndex: q.correctIndex, difficulty: q.difficulty },
    }));
  }

  function cancelEdit(id: string) {
    setEditing((prev) => { const next = { ...prev }; delete next[id]; return next; });
  }

  function saveEdit(q: QuizQuestionFull) {
    const draft = editing[q.id];
    if (!draft) return;
    onSaveQuestion(q.id, { normId: q.normId, ...draft });
    cancelEdit(q.id);
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newQ.text || newQ.options.some((o) => !o)) return;
    onAddQuestion({ normId: activeNorm, ...newQ });
    setNewQ({ ...EMPTY_NEW });
  }

  function handleAddNorm(e: React.FormEvent) {
    e.preventDefault();
    if (!newNormId.trim() || !newNormTitle.trim()) return;
    onAddNorm(newNormId.trim().toUpperCase(), newNormTitle.trim());
    setNewNormId('');
    setNewNormTitle('');
    setShowNewNorm(false);
  }

  return (
    <div className="px-6 md:px-8 py-8 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Gestão de Conteúdo</h1>
          <p className="text-on-surface/60 text-sm mt-1">Edite questões e temas por norma regulamentadora</p>
        </div>
        <button
          data-testid="add-norm-btn"
          onClick={() => setShowNewNorm((v) => !v)}
          className="px-4 py-2 bg-primary text-white text-[11px] font-bold rounded-lg uppercase tracking-widest hover:brightness-110 transition shrink-0"
        >
          {showNewNorm ? 'Cancelar' : '+ Novo Tema'}
        </button>
      </div>

      {/* Nova NR form */}
      {showNewNorm && (
        <form
          data-testid="new-norm-form"
          onSubmit={handleAddNorm}
          className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-wrap gap-4 items-end"
        >
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface/50 block mb-1">ID (ex: NR-33)</label>
            <input
              data-testid="new-norm-id"
              value={newNormId}
              onChange={(e) => setNewNormId(e.target.value)}
              placeholder="NR-33"
              className="border border-outline-variant rounded px-3 py-2 text-sm bg-surface w-32 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface/50 block mb-1">Título</label>
            <input
              data-testid="new-norm-title"
              value={newNormTitle}
              onChange={(e) => setNewNormTitle(e.target.value)}
              placeholder="Espaços Confinados"
              className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-surface focus:outline-none focus:border-primary"
            />
          </div>
          <button
            data-testid="new-norm-submit"
            type="submit"
            disabled={!newNormId.trim() || !newNormTitle.trim()}
            className="px-6 py-2 bg-primary text-white text-[11px] font-bold rounded-lg uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
          >
            Adicionar
          </button>
        </form>
      )}

      {/* NR tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {norms.map((n) => (
          <button
            key={n.normId}
            data-testid={`norm-tab-${n.normId}`}
            data-active={String(activeNorm === n.normId)}
            onClick={() => setActiveNorm(n.normId)}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
              activeNorm === n.normId
                ? 'bg-primary text-white shadow-sm'
                : 'bg-surface-container-high text-on-surface/60 hover:bg-surface-bright'
            }`}
          >
            {n.normId}
          </button>
        ))}
        {/* Delete active norm (only if > MIN_NORMS) */}
        {norms.length > 4 && (
          <button
            data-testid={`delete-norm-btn-${activeNorm}`}
            onClick={() => onDeleteNorm(activeNorm)}
            className="px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest bg-error/10 text-error hover:bg-error/20 transition-all ml-2"
            title={`Excluir ${activeNorm} e todas as suas questões`}
          >
            Excluir {activeNorm}
          </button>
        )}
        {norms.length <= 4 && (
          <span className="text-[10px] text-on-surface/40 ml-2" title="Mínimo de 4 temas exigido">
            Mín. 4 temas — não é possível excluir
          </span>
        )}
      </div>

      {/* Questions table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-container">
          <h2 className="text-base font-bold text-on-surface">
            {norms.find((n) => n.normId === activeNorm)?.title ?? activeNorm} — {filtered.length} questão(ões)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low">
                {['Pergunta', 'Opções', 'Correta', 'Dificuldade', 'Ações'].map((h) => (
                  <th key={h} className="p-3 text-[10px] font-black uppercase tracking-[0.1em] text-on-surface/50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filtered.map((q) => {
                const isEditing = q.id in editing;
                const draft = editing[q.id];
                return (
                  <tr key={q.id} data-testid={`question-row-${q.id}`} className="hover:bg-surface-bright">
                    <td className="p-3 max-w-xs">
                      {isEditing ? (
                        <textarea
                          data-testid={`question-input-text-${q.id}`}
                          value={draft.text}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [q.id]: { ...prev[q.id], text: e.target.value } }))}
                          className="w-full border border-outline-variant rounded px-2 py-1 text-sm bg-surface focus:outline-none focus:border-primary resize-none"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm text-on-surface line-clamp-2">{q.text}</p>
                      )}
                    </td>
                    <td className="p-3 text-xs text-on-surface/60">
                      {isEditing ? (
                        <div className="space-y-1">
                          {draft.options.map((opt, i) => (
                            <input
                              key={i}
                              data-testid={`question-option-${i}-${q.id}`}
                              value={opt}
                              onChange={(e) => {
                                const opts = [...draft.options];
                                opts[i] = e.target.value;
                                setEditing((prev) => ({ ...prev, [q.id]: { ...prev[q.id], options: opts } }));
                              }}
                              className="w-full border-b border-outline-variant bg-transparent text-xs focus:outline-none px-1"
                            />
                          ))}
                        </div>
                      ) : (
                        q.options.join(' / ')
                      )}
                    </td>
                    <td className="p-3 text-xs text-on-surface/60">
                      {isEditing ? (
                        <select
                          value={draft.correctIndex}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [q.id]: { ...prev[q.id], correctIndex: Number(e.target.value) } }))}
                          className="border border-outline-variant rounded px-1 py-0.5 text-xs bg-surface"
                        >
                          {draft.options.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}
                        </select>
                      ) : (
                        q.options[q.correctIndex]?.slice(0, 20) + '…'
                      )}
                    </td>
                    <td className="p-3">
                      {isEditing ? (
                        <select
                          value={draft.difficulty}
                          onChange={(e) => setEditing((prev) => ({ ...prev, [q.id]: { ...prev[q.id], difficulty: e.target.value as EditDraft['difficulty'] } }))}
                          className="border border-outline-variant rounded px-1 py-0.5 text-xs bg-surface"
                        >
                          <option value="basic">Básico</option>
                          <option value="intermediate">Intermediário</option>
                          <option value="advanced">Avançado</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${DIFF_BADGE[q.difficulty] ?? 'bg-surface-container-high text-on-surface/50'}`}>
                          {DIFF_LABEL[q.difficulty] ?? q.difficulty}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button data-testid={`question-save-${q.id}`} onClick={() => saveEdit(q)} className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded uppercase hover:brightness-110 transition">Salvar</button>
                            <button data-testid={`question-cancel-${q.id}`} onClick={() => cancelEdit(q.id)} className="px-2 py-1 bg-surface-container-high text-on-surface/60 text-[10px] font-bold rounded uppercase hover:bg-surface-bright transition">Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button data-testid={`question-edit-${q.id}`} onClick={() => startEdit(q)} className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase hover:bg-primary/20 transition">Editar</button>
                            <button data-testid={`question-delete-${q.id}`} onClick={() => onDeleteQuestion(q.id)} className="px-2 py-1 bg-error/10 text-error text-[10px] font-bold rounded uppercase hover:bg-error/20 transition">Excluir</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add new question */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-surface-container">
          <h2 className="text-base font-bold text-on-surface">+ Nova Questão em {activeNorm}</h2>
        </div>
        <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface/50 block mb-1">Pergunta</label>
            <textarea
              data-testid="new-question-text"
              value={newQ.text}
              onChange={(e) => setNewQ((prev) => ({ ...prev, text: e.target.value }))}
              className="w-full border border-outline-variant rounded px-3 py-2 text-sm bg-surface focus:outline-none focus:border-primary resize-none"
              rows={2}
              placeholder="Digite a pergunta..."
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface/50 block mb-1">Opções (2–4)</label>
            <div className="space-y-2">
              {newQ.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    data-testid={`new-question-option-${i}`}
                    value={opt}
                    onChange={(e) => {
                      const opts = [...newQ.options];
                      opts[i] = e.target.value;
                      setNewQ((prev) => ({ ...prev, options: opts }));
                    }}
                    className="flex-1 border-b border-outline-variant bg-transparent text-sm focus:outline-none px-1 py-1"
                    placeholder={`Opção ${i + 1}`}
                  />
                  {newQ.options.length > 2 && (
                    <button type="button" onClick={() => setNewQ((prev) => ({ ...prev, options: prev.options.filter((_, j) => j !== i), correctIndex: 0 }))} className="text-error text-xs">✕</button>
                  )}
                </div>
              ))}
              {newQ.options.length < 4 && (
                <button type="button" onClick={() => setNewQ((prev) => ({ ...prev, options: [...prev.options, ''] }))} className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">+ Adicionar opção</button>
              )}
            </div>
          </div>
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface/50 block mb-1">Resposta correta</label>
              <select
                data-testid="new-question-correct"
                value={newQ.correctIndex}
                onChange={(e) => setNewQ((prev) => ({ ...prev, correctIndex: Number(e.target.value) }))}
                className="border border-outline-variant rounded px-3 py-2 text-sm bg-surface"
              >
                {newQ.options.map((_, i) => <option key={i} value={i}>Opção {i + 1}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface/50 block mb-1">Dificuldade</label>
              <select
                data-testid="new-question-difficulty"
                value={newQ.difficulty}
                onChange={(e) => setNewQ((prev) => ({ ...prev, difficulty: e.target.value as EditDraft['difficulty'] }))}
                className="border border-outline-variant rounded px-3 py-2 text-sm bg-surface"
              >
                <option value="basic">Básico</option>
                <option value="intermediate">Intermediário</option>
                <option value="advanced">Avançado</option>
              </select>
            </div>
            <button
              data-testid="new-question-submit"
              type="submit"
              disabled={!newQ.text || newQ.options.some((o) => !o)}
              className="px-6 py-2 bg-primary text-white text-[11px] font-bold rounded-lg uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
            >
              Adicionar Questão
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
