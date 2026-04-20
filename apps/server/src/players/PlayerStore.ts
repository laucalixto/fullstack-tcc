import { randomUUID } from 'node:crypto';
import { PlayerModel } from '../db/models/Player.model.js';

export interface PlayerRecord {
  playerId: string;
  firstName: string;
  lastName: string;
  email: string;
  industrialUnit: string;
  passwordHash: string;
  totalScore: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  name: string;
  industrialUnit: string;
  totalScore: number;
}

export class PlayerStore {
  private readonly byEmail = new Map<string, PlayerRecord>();
  private readonly byId = new Map<string, PlayerRecord>();

  existsByEmail(email: string): boolean {
    return this.byEmail.has(email.toLowerCase());
  }

  async existsByEmailAsync(email: string): Promise<boolean> {
    if (this.existsByEmail(email)) return true;
    const doc = await PlayerModel.findOne({ email: email.toLowerCase() });
    return !!doc;
  }

  findByEmail(email: string): PlayerRecord | null {
    return this.byEmail.get(email.toLowerCase()) ?? null;
  }

  async findByEmailAsync(email: string): Promise<PlayerRecord | null> {
    const cached = this.findByEmail(email);
    if (cached) return cached;
    
    const doc = await PlayerModel.findOne({ email: email.toLowerCase() });
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
  }

  create(data: Omit<PlayerRecord, 'playerId'>): PlayerRecord {
    const record: PlayerRecord = { 
      playerId: randomUUID(), 
      ...data,
      email: data.email.toLowerCase() 
    };
    this.byEmail.set(record.email, record);
    this.byId.set(record.playerId, record);
    return record;
  }

  async createAsync(data: Omit<PlayerRecord, 'playerId'>): Promise<PlayerRecord> {
    const doc = await PlayerModel.create({
      ...data,
      email: data.email.toLowerCase(),
    });
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
  }

  /**
   * Retorna os top 100 jogadores ordenados por pontuação.
   * Em produção, busca diretamente no MongoDB. Em testes, pode usar o cache.
   */
  async leaderboard(): Promise<LeaderboardEntry[]> {
    // Tenta buscar do MongoDB primeiro
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
    } catch (err) {
      // Fallback para cache em memória (útil para testes unitários simples)
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

  // Apenas para compatibilidade com código legado durante a transição
  leaderboardSync(): LeaderboardEntry[] {
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
