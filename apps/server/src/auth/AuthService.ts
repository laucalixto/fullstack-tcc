import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const BCRYPT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface JwtPayload {
  facilitatorId: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(
    payload: Pick<JwtPayload, 'facilitatorId'>,
    expiresIn: string = JWT_EXPIRES_IN,
  ): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
  }

  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err) {
      throw new Error(`Invalid or expired token: ${(err as Error).message}`);
    }
  }
}
