/**
 * Seeded random number generator for deterministic game replay
 * Uses Linear Congruential Generator (LCG) algorithm
 */

/**
 * Seeded random number generator using Linear Congruential Generator (LCG)
 * This allows for deterministic random sequences for game replay validation
 */
class SeededRandom {
  private static instance: SeededRandom;
  private seed: number;
  private currentSeed: number;

  private constructor() {
    // Generate initial seed from timestamp if not provided
    this.seed = Date.now();
    this.currentSeed = this.seed;
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SeededRandom {
    if (!SeededRandom.instance) {
      SeededRandom.instance = new SeededRandom();
    }
    return SeededRandom.instance;
  }

  /**
   * Set a specific seed for deterministic randomness
   * @param seed The seed value to use
   */
  public setSeed(seed: number): void {
    this.seed = seed;
    this.currentSeed = seed;
  }

  /**
   * Get the current seed value (for replay validation)
   */
  public getSeed(): number {
    return this.seed;
  }

  /**
   * Reset the random sequence to the initial seed
   */
  public reset(): void {
    this.currentSeed = this.seed;
  }

  /**
   * Generate next random number using LCG algorithm
   * Returns a value between 0 and 1
   */
  public next(): number {
    // LCG parameters (using values from Numerical Recipes)
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);

    this.currentSeed = (a * this.currentSeed + c) % m;
    return this.currentSeed / m;
  }
}

/**
 * Random utility class providing seeded random number generation
 */
export class Random {
  private static rng = SeededRandom.getInstance();

  /**
   * Get a random integer between min and max (inclusive)
   * Uses seeded random for deterministic replay
   * @param min Minimum value
   * @param max Maximum value
   * @returns Random integer between min and max
   */
  public static getInt(min: number, max: number): number {
    return Math.floor(Random.rng.next() * (max - min + 1)) + min;
  }

  /**
   * Get a random floating-point number between min and max
   * Uses seeded random for deterministic replay
   * @param min Minimum value
   * @param max Maximum value
   * @returns Random float between min and max
   */
  public static getFloat(min: number, max: number): number {
    return min + Random.rng.next() * (max - min);
  }

  /**
   * Get a random element from an array
   * @param list Array to select from
   * @returns Random element from the array, or undefined if array is empty
   */
  public static getArrayElement<T>(list: T[]): T | undefined {
    if (list.length > 0) {
      return list[Random.getInt(0, list.length - 1)];
    }
    return undefined;
  }

  /**
   * Shuffle an array in place using Fisher-Yates algorithm
   * @param list Array to shuffle
   */
  public static shuffleArray<T>(list: T[]): void {
    for (let i = 0; i < list.length; i++) {
      const j = Random.getInt(0, list.length - 1);
      const temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
  }

  /**
   * Set a specific seed for deterministic randomness
   * @param seed The seed value to use
   */
  public static setSeed(seed: number): void {
    Random.rng.setSeed(seed);
  }

  /**
   * Get the current seed value (for replay validation)
   */
  public static getSeed(): number {
    return Random.rng.getSeed();
  }

  /**
   * Reset the random sequence to the initial seed
   */
  public static reset(): void {
    Random.rng.reset();
  }
}
