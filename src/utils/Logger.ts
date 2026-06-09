import { LogGroup } from '../enums/LogGroup';
import { logConfig } from '../config/logConfig';
import { gameConfig } from '../config/gameConfig';

/**
 * Logger class for standardized logging across the application
 * Supports log groups, multi-line messages, and configurable output
 */
export class Logger {
  private group: LogGroup;

  /**
   * Create a logger instance for a specific group
   * @param group The log group this logger belongs to
   */
  constructor(group: LogGroup) {
    this.group = group;
  }

  /**
   * Log a message if logging is enabled for this group
   * @param message The message to log
   */
  log(message: string): void {
    Logger.logStatic(this.group, message);
  }

  /**
   * Log a multi-line message with proper indentation
   * Only the first line has the group prefix, subsequent lines are indented
   * @param lines Array of strings, one per line
   */
  logMultiLine(lines: string[]): void {
    Logger.logMultiLineStatic(this.group, lines);
  }

  /**
   * Static method to log a message without creating an instance
   * @param group The log group
   * @param message The message to log
   */
  static logStatic(group: LogGroup, message: string): void {
    // Check global logging flag
    if (!gameConfig.logging.enabled) {
      return;
    }

    // Check group-specific flag
    if (!logConfig.groups[group]) {
      return;
    }

    // Log with group prefix
    console.log(`[${group}] ${message}`);
  }

  /**
   * Static method to log multi-line messages without creating an instance
   * @param group The log group
   * @param lines Array of strings, one per line
   */
  static logMultiLineStatic(group: LogGroup, lines: string[]): void {
    // Check global logging flag
    if (!gameConfig.logging.enabled) {
      return;
    }

    // Check group-specific flag
    if (!logConfig.groups[group]) {
      return;
    }

    // Return early if no lines provided
    if (lines.length === 0) {
      return;
    }

    // First line gets the group prefix
    console.log(`[${group}] ${lines[0]}`);

    // Subsequent lines are indented
    const indent = logConfig.indentation;
    for (let i = 1; i < lines.length; i++) {
      console.log(`${indent}${lines[i]}`);
    }
  }

  /**
   * Log a warning message (always shown if global logging is enabled)
   * @param message The warning message
   */
  warn(message: string): void {
    Logger.warnStatic(this.group, message);
  }

  /**
   * Log a multi-line warning message with proper indentation
   * Only the first line has the group prefix, subsequent lines are indented
   * @param lines Array of strings, one per line
   */
  warnMultiLine(lines: string[]): void {
    Logger.warnMultiLineStatic(this.group, lines);
  }

  /**
   * Static method to log a warning
   * @param group The log group
   * @param message The warning message
   */
  static warnStatic(group: LogGroup, message: string): void {
    if (!gameConfig.logging.enabled) {
      return;
    }

    console.warn(`[${group}] ${message}`);
  }

  /**
   * Static method to log multi-line warnings without creating an instance
   * @param group The log group
   * @param lines Array of strings, one per line
   */
  static warnMultiLineStatic(group: LogGroup, lines: string[]): void {
    // Check global logging flag
    if (!gameConfig.logging.enabled) {
      return;
    }

    // Return early if no lines provided
    if (lines.length === 0) {
      return;
    }

    // First line gets the group prefix
    console.warn(`[${group}] ${lines[0]}`);

    // Subsequent lines are indented
    const indent = logConfig.indentation;
    for (let i = 1; i < lines.length; i++) {
      console.warn(`${indent}${lines[i]}`);
    }
  }

  /**
   * Log an error message (always shown if global logging is enabled)
   * @param message The error message
   */
  error(message: string): void {
    Logger.errorStatic(this.group, message);
  }

  /**
   * Log a multi-line error message with proper indentation
   * Only the first line has the group prefix, subsequent lines are indented
   * @param lines Array of strings, one per line
   */
  errorMultiLine(lines: string[]): void {
    Logger.errorMultiLineStatic(this.group, lines);
  }

  /**
   * Static method to log an error
   * @param group The log group
   * @param message The error message
   */
  static errorStatic(group: LogGroup, message: string): void {
    if (!gameConfig.logging.enabled) {
      return;
    }

    console.error(`[${group}] ${message}`);
  }

  /**
   * Static method to log multi-line errors without creating an instance
   * @param group The log group
   * @param lines Array of strings, one per line
   */
  static errorMultiLineStatic(group: LogGroup, lines: string[]): void {
    // Check global logging flag
    if (!gameConfig.logging.enabled) {
      return;
    }

    // Return early if no lines provided
    if (lines.length === 0) {
      return;
    }

    // First line gets the group prefix
    console.error(`[${group}] ${lines[0]}`);

    // Subsequent lines are indented
    const indent = logConfig.indentation;
    for (let i = 1; i < lines.length; i++) {
      console.error(`${indent}${lines[i]}`);
    }
  }
}
