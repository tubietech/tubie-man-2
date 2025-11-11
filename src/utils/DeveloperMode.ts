import { LogGroup } from "../enums/LogGroup";
import { Logger } from "./Logger";

/**
 * Singleton class to manage developer mode state
 * Developer mode can only be activated from the menu screen using the Konami code
 */
export class DeveloperMode {
  private static instance: DeveloperMode;
  private enabled: boolean = false;

  private constructor() {}

  static getInstance(): DeveloperMode {
    if (!DeveloperMode.instance) {
      DeveloperMode.instance = new DeveloperMode();
    }
    return DeveloperMode.instance;
  }

  /**
   * Enable developer mode
   */
  enable(): void {
    this.enabled = true;
    Logger.logStatic(LogGroup.DEVELOPER, 'Enabled');
  }

  /**
   * Check if developer mode is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Reset developer mode (for testing purposes)
   */
  reset(): void {
    this.enabled = false;
    Logger.logStatic(LogGroup.DEVELOPER, 'Disabled');
  }
}
