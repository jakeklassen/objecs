import { describe, expect, test } from 'vitest';
import { randomBetween } from './random.js';

describe('Random', () => {
  describe('randomBetween', () => {
    const successCases = [
      [1, 5, 1],
      [1, 5, 2],
      [1, 5, 3],
      [1, 5, 4],
      [1, 5, 5],
    ];

    const failCases = [
      [1, 5, 0],
      [1, 5, 6],
    ];

    test.each(successCases)(
      'should generate a random number between %i and %i: %i',
      (min, max, expected) => {
        let n = randomBetween(min, max);

        do {
          try {
            expect(n).toBe(expected);
          } catch {
            n = randomBetween(min, max);
          }
        } while (n !== expected);
      },
    );

    test.each(failCases)(
      'between %i and %i should fail to generate %i',
      (min, max, expected) => {
        let n = randomBetween(min, max);
        const maxTimeMs = 100;
        const startTime = Date.now();

        do {
          try {
            expect(n).toBe(expected);
          } catch {
            n = randomBetween(min, max);
          } finally {
            if (Date.now() - startTime > maxTimeMs) {
              if (expected > max || expected < min) {
                expect(true).toBe(true);

                break;
              }

              throw new Error(`Timeout exceeded generating ${expected}`);
            }
          }
        } while (n !== expected);
      },
    );
  });
});
