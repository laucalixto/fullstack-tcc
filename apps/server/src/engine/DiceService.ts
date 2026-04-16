import { randomInt } from 'node:crypto';

export class DiceService {
  /** Lança um dado de 6 faces usando CSPRNG. Resultado: 1–6. */
  static roll(): number {
    return randomInt(1, 7);
  }
}
