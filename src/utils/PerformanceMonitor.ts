import { LogGroup } from "../enums/LogGroup";
import { Logger } from "./Logger";

/**
 * Performance monitoring utility for tracking FPS and frame time statistics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;

  private frameCount: number = 0;
  private totalFrameTime: number = 0;
  private minFrameTime: number = Infinity;
  private maxFrameTime: number = Infinity;
  private minFPS: number = Infinity;
  private maxFPS: number = 0;
  private totalFPS: number = 0;
  private lastLogTime: number = 0;
  private logInterval: number = 5000; // 5 seconds in milliseconds
  private enabled: boolean = true;
  private logger: Logger;

  private constructor() {
    this.lastLogTime = Date.now();
    this.logger = new Logger(LogGroup.PERFORMANCE);
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Enable or disable performance monitoring
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.logger.log('Monitoring disabled');
    } else {
      this.logger.log('Monitoring enabled');
    }
  }

  /**
   * Update performance metrics with current frame data
   * @param delta - Time elapsed since last frame in milliseconds
   */
  public update(delta: number): void {
    if (!this.enabled) return;

    const currentTime = Date.now();

    // Calculate current FPS (frames per second)
    const currentFPS = delta > 0 ? 1000 / delta : 0;

    // Accumulate statistics
    this.frameCount++;
    this.totalFrameTime += delta;
    this.totalFPS += currentFPS;

    // Track min/max frame time
    if (delta < this.minFrameTime) {
      this.minFrameTime = delta;
    }
    if (delta > this.maxFrameTime) {
      this.maxFrameTime = delta;
    }

    // Track min/max FPS
    if (currentFPS < this.minFPS && currentFPS > 0) {
      this.minFPS = currentFPS;
    }
    if (currentFPS > this.maxFPS) {
      this.maxFPS = currentFPS;
    }

    // Log statistics every 5 seconds
    if (currentTime - this.lastLogTime >= this.logInterval) {
      this.logStatistics();
      this.reset();
      this.lastLogTime = currentTime;
    }
  }

  /**
   * Log accumulated performance statistics
   */
  private logStatistics(): void {
    if (this.frameCount === 0) return;

    const avgFrameTime = this.totalFrameTime / this.frameCount;
    const avgFPS = this.totalFPS / this.frameCount;

    const perfLogs = [];
    perfLogs.push('5-second performance statistics:');
    perfLogs.push(`  FPS:        Avg: ${avgFPS.toFixed(2)} | Min: ${this.minFPS.toFixed(2)} | Max: ${this.maxFPS.toFixed(2)}`);
    perfLogs.push(`  Frame Time: Avg: ${avgFrameTime.toFixed(2)}ms | Min: ${this.minFrameTime.toFixed(2)}ms | Max: ${this.maxFrameTime.toFixed(2)}ms`);
    perfLogs.push(`  Total Frames: ${this.frameCount}`);
    this.logger.logMultiLine(perfLogs);
  }

  /**
   * Reset statistics for next logging interval
   */
  private reset(): void {
    this.frameCount = 0;
    this.totalFrameTime = 0;
    this.totalFPS = 0;
    this.minFrameTime = Infinity;
    this.maxFrameTime = 0;
    this.minFPS = Infinity;
    this.maxFPS = 0;
  }

  /**
   * Force log current statistics and reset
   */
  public forceLog(): void {
    if (this.enabled) {
      this.logStatistics();
      this.reset();
      this.lastLogTime = Date.now();
    }
  }
}
