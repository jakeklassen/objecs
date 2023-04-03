/**
 * Generates a random number between min and max (inclusive).
 * @param min
 * @param max inclusive
 * @returns
 */
export const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
