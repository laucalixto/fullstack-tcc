import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { PlayerModel } from '../db/models/Player.model.js';

export interface PlayerRecord {
  playerId: string;
  firstName: string;
  lastName: string;
  email: string;
  industrialUnit: string;
  passwordHash: string;
  totalScore: number;
  createdAt?: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  industrialUnit: string;
  totalScore: number;
}

export interface GameHistoryEntry {
  sessionId: string;
  sessionName: string;
  playedAt: string;
  score: number;
  rank: number;
  totalPlayers: number;
}

export class PlayerStore {
  private readonly byEmail = new Map<string, PlayerRecord>();
  private readonly byId = new Map<string, PlayerRecord>();
  private readonly history = new Map<string, GameHistoryEntry[]>();

  private isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  existsByEmail(email: string): boolean {
    return this.byEmail.has(email.toLowerCase());
  }

  async existsByEmailAsync(email: string): Promise<boolean> {
    if (this.existsByEmail(email)) return true;
    if (!this.isConnected()) return false;

    try {
      const doc = await PlayerModel.findOne({ email: email.toLowerCase() });
      return !!doc;
    } catch {
      return false;
    }
  }

  findByEmail(email: string): PlayerRecord | null {
    return this.byEmail.get(email.toLowerCase()) ?? null;
  }

  async findByEmailAsync(email: string): Promise<PlayerRecord | null> {
    const key = email.toLowerCase();
    const cached = this.findByEmail(key);
    if (cached) return cached;
    
    if (!this.isConnected()) return null;

    try {
      const doc = await PlayerModel.findOne({ email: key });
      if (!doc) return null;
      
      const record: PlayerRecord = {
        playerId: doc.id,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        industrialUnit: doc.industrialUnit,
        passwordHash: doc.passwordHash,
        totalScore: doc.totalScore,
      };
      this.byEmail.set(record.email, record);
      this.byId.set(record.playerId, record);
      return record;
    } catch {
      return null;
    }
  }

  findById(playerId: string): PlayerRecord | null {
    return this.byId.get(playerId) ?? null;
  }

  async findByIdAsync(playerId: string): Promise<PlayerRecord | null> {
    const cached = this.byId.get(playerId);
    if (cached) return cached;
    if (!this.isConnected()) return null;

    try {
      const doc = await PlayerModel.findOne({ playerId });
      if (!doc) return null;
      const record: PlayerRecord = {
        playerId: doc.playerId,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
        industrialUnit: doc.industrialUnit,
        passwordHash: doc.passwordHash,
        totalScore: doc.totalScore,
      };
      this.byEmail.set(record.email, record);
      this.byId.set(record.playerId, record);
      return record;
    } catch {
      return null;
    }
  }

  create(data: Omit<PlayerRecord, 'playerId'>): PlayerRecord {
    const record: PlayerRecord = {
      playerId: randomUUID(),
      ...data,
      email: data.email.toLowerCase(),
      createdAt: data.createdAt ?? Date.now(),
    };
    this.byEmail.set(record.email, record);
    this.byId.set(record.playerId, record);
    return record;
  }

  findAll(): PlayerRecord[] {
    return [...this.byId.values()];
  }

  async createAsync(data: Omit<PlayerRecord, 'playerId'>): Promise<PlayerRecord> {
    const playerId = randomUUID();
    const email = data.email.toLowerCase();

    if (this.isConnected()) {
      try {
        const doc = await PlayerModel.create({ ...data, playerId, email });
        const record: PlayerRecord = {
          playerId: doc.playerId,
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          industrialUnit: doc.industrialUnit,
          passwordHash: doc.passwordHash,
          totalScore: doc.totalScore,
        };
        this.byEmail.set(record.email, record);
        this.byId.set(record.playerId, record);
        return record;
      } catch (err) {
        console.error('[db] Player creation failed:', err);
      }
    }

    return this.create({ ...data, email } as Omit<PlayerRecord, 'playerId'>);
  }

  update(playerId: string, patch: Partial<Omit<PlayerRecord, 'playerId' | 'email'>>): PlayerRecord | null {
    const record = this.byId.get(playerId);
    if (!record) return null;
    Object.assign(record, patch);
    return record;
  }

  addGameResult(playerId: string, entry: GameHistoryEntry): void {
    const list = this.history.get(playerId) ?? [];
    list.unshift(entry);
    this.history.set(playerId, list);
  }

  getHistory(playerId: string): GameHistoryEntry[] {
    return this.history.get(playerId) ?? [];
  }

  async leaderboard(): Promise<LeaderboardEntry[]> {
    if (this.isConnected()) {
      try {
        const docs = await PlayerModel.find()
          .sort({ totalScore: -1 })
          .limit(100);
        
        if (docs.length > 0) {
          return docs.map((doc, i) => ({
            rank: i + 1,
            playerId: doc.id,
            name: `${doc.firstName} ${doc.lastName}`,
            industrialUnit: doc.industrialUnit,
            totalScore: doc.totalScore,
          }));
        }
      } catch {
        // Fallback para cache se erro na query
      }
    }

    const sorted = [...this.byId.values()].sort(
      (a, b) => b.totalScore - a.totalScore,
    );
    return sorted.map((p, i) => ({
      rank: i + 1,
      playerId: p.playerId,
      name: `${p.firstName} ${p.lastName}`,
      industrialUnit: p.industrialUnit,
      totalScore: p.totalScore,
    }));
  }

}
