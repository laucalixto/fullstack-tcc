import { randomInt } from 'node:crypto';

const MAX_ATTEMPTS = 100;

type RandomIntFn = (min: number, max: number) => number;

export class PINGenerator {
  /**
   * Gera um PIN numérico de 6 dígitos (100000–999999).
   * @param existing  Conjunto de PINs já em uso — o resultado nunca estará neste conjunto.
   * @param randomFn  Função de aleatoriedade (injetável para testes).
   */
  static generate(
    existing: Set<string> = new Set(),
    randomFn: RandomIntFn = randomInt,
  ): string {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const pin = String(randomFn(100_000, 1_000_000));
      if (!existing.has(pin)) return pin;
    }
    throw new Error(
      `PINGenerator: could not generate unique PIN after ${MAX_ATTEMPTS} attempts`,
    );
  }
}
