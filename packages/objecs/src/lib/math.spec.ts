import { describe, expect, it } from 'vitest';
import { multiply, sum } from './math.js';

describe('Math', () => {
  describe('sum', () => {
    it('should add numbers', () => {
      expect(sum(1, 2, 3)).toBe(6);
    });
  });

  describe('multiply', () => {
    it('should multiply numbers', () => {
      expect(multiply(1, 2, 3)).toBe(6);
    });

    it('should multiply numbers with 1', () => {
      expect(multiply(1, 2, 3, 1)).toBe(6);
    });

    it('should multiply numbers with 0', () => {
      expect(multiply(1, 2, 3, 0)).toBe(0);
    });
  });
});
