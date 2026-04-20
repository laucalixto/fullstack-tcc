import { randomUUID } from 'node:crypto';
import type { FacilitatorId } from '@safety-board/shared';
import { FacilitatorModel } from '../db/models/Facilitator.model.js';

export interface FacilitatorRecord {
  id: FacilitatorId;
  email: string;
  name: string;
  passwordHash: string;
}

/**
 * Store de facilitadores com cache em memória e persistência MongoDB.
 */
export class FacilitatorStore {
  private readonly memCache = new Map<string, FacilitatorRecord>();

  findByEmail(email: string): FacilitatorRecord | null {
    return this.memCache.get(email.toLowerCase()) ?? null;
  }

  async findByEmailAsync(email: string): Promise<FacilitatorRecord | null> {
    const cached = this.memCache.get(email.toLowerCase());
    if (cached) return cached;
    
    // Fallback para MongoDB se não estiver no cache (útil após restart do server)
    try {
      const doc = await FacilitatorModel.findOne({ email: email.toLowerCase() });
      if (!doc) return null;
      const record: FacilitatorRecord = { 
        id: doc.id as FacilitatorId, 
        email: doc.email, 
        name: doc.name, 
        passwordHash: doc.passwordHash 
      };
      this.memCache.set(email.toLowerCase(), record);
      return record;
    } catch (err) {
      // Em caso de erro no DB (ex: não conectado em testes unitários), 
      // apenas retorna null ou o que estiver no cache
      return null;
    }
  }

  create(data: Omit<FacilitatorRecord, 'id'>): FacilitatorRecord {
    const record: FacilitatorRecord = { 
      id: randomUUID() as FacilitatorId, 
      ...data, 
      email: data.email.toLowerCase() 
    };
    this.memCache.set(record.email, record);
    return record;
  }

  async createAsync(data: Omit<FacilitatorRecord, 'id'>): Promise<FacilitatorRecord> {
    const doc = await FacilitatorModel.create({ 
      ...data, 
      email: data.email.toLowerCase() 
    });
    const record: FacilitatorRecord = { 
      id: doc.id as FacilitatorId, 
      email: doc.email, 
      name: doc.name, 
      passwordHash: doc.passwordHash 
      };
    this.memCache.set(record.email, record);
    return record;
  }

  existsByEmail(email: string): boolean {
    return this.memCache.has(email.toLowerCase());
  }

  async existsByEmailAsync(email: string): Promise<boolean> {
    if (this.existsByEmail(email)) return true;
    const doc = await FacilitatorModel.findOne({ email: email.toLowerCase() });
    return !!doc;
  }
}
