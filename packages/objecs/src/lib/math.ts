/**
 * Function to add `n` numbers
 * @param numbers
 * @returns
 */
export const sum = (...numbers: number[]) => numbers.reduce((a, b) => a + b, 0);

/**
 * Function to multiply `n` numbers
 * @param numbers
 * @returns
 */
export const multiply = (...numbers: number[]) =>
  numbers.reduce((a, b) => a * b, 1);
