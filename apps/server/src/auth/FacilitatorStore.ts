import { randomUUID } from 'node:crypto';
import type { FacilitatorId } from '@safety-board/shared';

interface FacilitatorRecord {
  id: FacilitatorId;
  email: string;
  name: string;
  passwordHash: string;
}

/**
 * Store in-memory para facilitadores.
 * Fase 2: sem persistência. Fase 4+: substituído por MongoDB.
 */
export class FacilitatorStore {
  private readonly store = new Map<string, FacilitatorRecord>();

  findByEmail(email: string): FacilitatorRecord | null {
    return this.store.get(email) ?? null;
  }

  create(data: Omit<FacilitatorRecord, 'id'>): FacilitatorRecord {
    const record: FacilitatorRecord = { id: randomUUID(), ...data };
    this.store.set(data.email, record);
    return record;
  }

  existsByEmail(email: string): boolean {
    return this.store.has(email);
  }
}
