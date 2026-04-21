import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayerStore } from '../../players/PlayerStore.js';

vi.mock('mongoose', () => ({
  default: { connection: { readyState: 1 } },
}));

const mockDoc = {
  playerId: 'db-player-1',
  firstName: 'Ana',
  lastName: 'Silva',
  email: 'ana@test.com',
  industrialUnit: 'SP',
  passwordHash: 'hash',
  totalScore: 150,
};

vi.mock('../../db/models/Player.model.js', () => ({
  PlayerModel: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

import { PlayerModel } from '../../db/models/Player.model.js';

describe('PlayerStore — MongoDB paths', () => {
  let store: PlayerStore;

  beforeEach(() => {
    store = new PlayerStore();
    vi.mocked(PlayerModel.create).mockReset();
    vi.mocked(PlayerModel.find).mockReset();
  });

  describe('createAsync', () => {
    it('persiste no banco quando conectado', async () => {
      vi.mocked(PlayerModel.create).mockResolvedValue(mockDoc as never);
      const record = await store.createAsync({
        firstName: 'Ana', lastName: 'Silva', email: 'ana@test.com',
        industrialUnit: 'SP', passwordHash: 'hash', totalScore: 0,
      });
      expect(record.email).toBe('ana@test.com');
      expect(PlayerModel.create).toHaveBeenCalledOnce();
    });

    it('fallback para memória em caso de erro no banco', async () => {
      vi.mocked(PlayerModel.create).mockRejectedValue(new Error('DB error'));
      const record = await store.createAsync({
        firstName: 'Bob', lastName: 'Costa', email: 'bob@test.com',
        industrialUnit: 'MG', passwordHash: 'hash', totalScore: 0,
      });
      expect(record.email).toBe('bob@test.com');
    });
  });

  describe('leaderboard', () => {
    it('retorna dados do banco quando conectado e há documentos', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 'id1', firstName: 'Ana', lastName: 'Silva', industrialUnit: 'SP', totalScore: 200 },
          { id: 'id2', firstName: 'Bob', lastName: 'Costa', industrialUnit: 'MG', totalScore: 100 },
        ]),
      };
      vi.mocked(PlayerModel.find).mockReturnValue(mockFind as never);

      const result = await store.leaderboard();
      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
      expect(result[0].name).toBe('Ana Silva');
      expect(result[1].rank).toBe(2);
    });

    it('fallback para cache em memória quando banco retorna vazio', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(PlayerModel.find).mockReturnValue(mockFind as never);

      store.create({ firstName: 'X', lastName: 'Y', email: 'x@test.com', industrialUnit: 'U', passwordHash: 'h', totalScore: 50 });
      const result = await store.leaderboard();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].name).toBe('X Y');
    });

    it('fallback para cache em caso de erro no banco', async () => {
      const mockFind = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error('DB error')),
      };
      vi.mocked(PlayerModel.find).mockReturnValue(mockFind as never);

      store.create({ firstName: 'Z', lastName: 'W', email: 'z@test.com', industrialUnit: 'U', passwordHash: 'h', totalScore: 30 });
      const result = await store.leaderboard();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
