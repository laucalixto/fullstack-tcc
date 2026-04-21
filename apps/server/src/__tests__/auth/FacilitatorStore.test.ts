import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FacilitatorStore } from '../../auth/FacilitatorStore.js';

const mockDoc = {
  id: 'db-id-1',
  email: 'gestor@empresa.com',
  name: 'Gestor',
  passwordHash: 'hash123',
};

vi.mock('../../db/models/Facilitator.model.js', () => ({
  FacilitatorModel: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('mongoose', () => ({
  default: { connection: { readyState: 1 } },
}));

import { FacilitatorModel } from '../../db/models/Facilitator.model.js';

describe('FacilitatorStore — MongoDB paths', () => {
  let store: FacilitatorStore;

  beforeEach(() => {
    store = new FacilitatorStore();
    vi.mocked(FacilitatorModel.findOne).mockReset();
    vi.mocked(FacilitatorModel.create).mockReset();
  });

  describe('findByEmailAsync', () => {
    it('retorna do cache se já presente (sem hit no banco)', async () => {
      store.create({ email: 'cache@empresa.com', name: 'Cached', passwordHash: 'h' });
      const result = await store.findByEmailAsync('cache@empresa.com');
      expect(result).not.toBeNull();
      expect(FacilitatorModel.findOne).not.toHaveBeenCalled();
    });

    it('busca no banco quando não está em cache', async () => {
      vi.mocked(FacilitatorModel.findOne).mockResolvedValue(mockDoc as never);
      const result = await store.findByEmailAsync('gestor@empresa.com');
      expect(result?.email).toBe('gestor@empresa.com');
    });

    it('retorna null quando banco não encontra', async () => {
      vi.mocked(FacilitatorModel.findOne).mockResolvedValue(null);
      const result = await store.findByEmailAsync('nao-existe@empresa.com');
      expect(result).toBeNull();
    });

    it('retorna null em caso de erro no banco', async () => {
      vi.mocked(FacilitatorModel.findOne).mockRejectedValue(new Error('DB error'));
      const result = await store.findByEmailAsync('erro@empresa.com');
      expect(result).toBeNull();
    });
  });

  describe('createAsync', () => {
    it('persiste no banco quando conectado', async () => {
      vi.mocked(FacilitatorModel.create).mockResolvedValue(mockDoc as never);
      const record = await store.createAsync({ email: 'novo@empresa.com', name: 'Novo', passwordHash: 'h' });
      expect(record.email).toBe('gestor@empresa.com');
      expect(FacilitatorModel.create).toHaveBeenCalledOnce();
    });

    it('fallback para memória em caso de erro no banco', async () => {
      vi.mocked(FacilitatorModel.create).mockRejectedValue(new Error('DB error'));
      const record = await store.createAsync({ email: 'fallback@empresa.com', name: 'FB', passwordHash: 'h' });
      expect(record.email).toBe('fallback@empresa.com');
    });
  });

  describe('existsByEmailAsync', () => {
    it('retorna true se email está no cache', async () => {
      store.create({ email: 'existe@empresa.com', name: 'E', passwordHash: 'h' });
      const result = await store.existsByEmailAsync('existe@empresa.com');
      expect(result).toBe(true);
    });

    it('busca no banco quando não está em cache', async () => {
      vi.mocked(FacilitatorModel.findOne).mockResolvedValue(mockDoc as never);
      const result = await store.existsByEmailAsync('gestor@empresa.com');
      expect(result).toBe(true);
    });

    it('retorna false quando banco não encontra', async () => {
      vi.mocked(FacilitatorModel.findOne).mockResolvedValue(null);
      const result = await store.existsByEmailAsync('nao-existe@empresa.com');
      expect(result).toBe(false);
    });

    it('retorna false em caso de erro no banco', async () => {
      vi.mocked(FacilitatorModel.findOne).mockRejectedValue(new Error('DB error'));
      const result = await store.existsByEmailAsync('erro@empresa.com');
      expect(result).toBe(false);
    });
  });
});
