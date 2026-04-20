import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
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

  private isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  findByEmail(email: string): FacilitatorRecord | null {
    return this.memCache.get(email.toLowerCase()) ?? null;
  }

  async findByEmailAsync(email: string): Promise<FacilitatorRecord | null> {
    const key = email.toLowerCase();
    const cached = this.memCache.get(key);
    if (cached) return cached;
    
    if (!this.isConnected()) return null;

    try {
      const doc = await FacilitatorModel.findOne({ email: key });
      if (!doc) return null;
      const record: FacilitatorRecord = { 
        id: doc.id as FacilitatorId, 
        email: doc.email, 
        name: doc.name, 
        passwordHash: doc.passwordHash 
      };
      this.memCache.set(key, record);
      return record;
    } catch (err) {
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
    const email = data.email.toLowerCase();

    if (this.isConnected()) {
      try {
        const doc = await FacilitatorModel.create({ ...data, email });
        const record: FacilitatorRecord = { 
          id: doc.id as FacilitatorId, 
          email: doc.email, 
          name: doc.name, 
          passwordHash: doc.passwordHash 
        };
        this.memCache.set(email, record);
        return record;
      } catch (err) {
        console.error('[db] Facilitator creation failed:', err);
      }
    }

    // Fallback para memória se banco offline
    return this.create(data);
  }

  existsByEmail(email: string): boolean {
    return this.memCache.has(email.toLowerCase());
  }

  async existsByEmailAsync(email: string): Promise<boolean> {
    if (this.existsByEmail(email)) return true;
    if (!this.isConnected()) return false;

    try {
      const doc = await FacilitatorModel.findOne({ email: email.toLowerCase() });
      return !!doc;
    } catch {
      return false;
    }
  }
}
