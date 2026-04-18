import { randomUUID } from 'node:crypto';

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
    return this.byEmail.has(email);
  }

  create(data: Omit<PlayerRecord, 'playerId'>): PlayerRecord {
    const record: PlayerRecord = { playerId: randomUUID(), ...data };
    this.byEmail.set(data.email, record);
    this.byId.set(record.playerId, record);
    return record;
  }

  leaderboard(): LeaderboardEntry[] {
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
