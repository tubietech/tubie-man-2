import { Language } from '../../enums/Language';
import { languageFiles, LanguageKey } from './languageFiles';

export class LocalizationManager {
  private static instance: LocalizationManager;
  private currentLanguage: Language = Language.ENGLISH;
  private translations: typeof languageFiles[Language.ENGLISH];
  
  private constructor() {
    this.translations = languageFiles[this.currentLanguage];
  }
  
  static getInstance(): LocalizationManager {
    if (!LocalizationManager.instance) {
      LocalizationManager.instance = new LocalizationManager();
    }
    return LocalizationManager.instance;
  }
  
  setLanguage(language: Language): void {
    this.currentLanguage = language;
    this.translations = languageFiles[language];
  }
  
  getLanguage(): Language {
    return this.currentLanguage;
  }
  
  getText(key: LanguageKey): string {
    return this.translations[key];
  }
  
  getAll(): typeof languageFiles[Language.ENGLISH] {
    return this.translations;
  }
}