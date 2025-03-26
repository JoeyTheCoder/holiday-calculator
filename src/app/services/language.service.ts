import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { Inject } from '@angular/core';

export interface Language {
  code: string;
  name: string;
  flag?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  availableLanguages: Language[] = [
    { code: 'de-CH', name: 'Deutsch' },
    { code: 'fr-CH', name: 'Français' },
    { code: 'it-CH', name: 'Italiano' },
    { code: 'en', name: 'English' }
  ];

  private currentLanguageSubject = new BehaviorSubject<string>(this.getDefaultLanguage());
  currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor(
    private translate: TranslateService,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.initializeLanguage();
  }

  private initializeLanguage() {
    try {
      // Set available languages
      const availableLangCodes = this.availableLanguages.map(lang => lang.code);
      this.translate.addLangs(availableLangCodes);
      
      // Try to get stored language
      let savedLang = localStorage.getItem('selectedLanguage');
      
      // If no saved language or not in available languages, use default
      if (!savedLang || !availableLangCodes.includes(savedLang)) {
        savedLang = this.getDefaultLanguage();
      }
      
      // Set default fallback language
      this.translate.setDefaultLang('en');
      
      // Wait for DOM to be ready before changing language
      setTimeout(() => {
        this.changeLanguage(savedLang);
        console.log('Language service initialized with language:', savedLang);
      }, 0);
    } catch (err) {
      console.error('Error initializing language service:', err);
      // Fall back to English in case of errors
      this.translate.use('en');
    }
  }

  changeLanguage(langCode: string) {
    try {
      console.log('Changing language to:', langCode);
      
      // Store in local storage
      localStorage.setItem('selectedLanguage', langCode);
      
      // Update document language
      this.document.documentElement.lang = langCode;
      
      // Use in translate service
      this.translate.use(langCode);
      
      // Update the subject
      this.currentLanguageSubject.next(langCode);
    } catch (err) {
      console.error('Error changing language:', err);
    }
  }

  getLanguageName(code: string): string {
    const lang = this.availableLanguages.find(l => l.code === code);
    return lang ? lang.name : code;
  }

  getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  private getDefaultLanguage(): string {
    try {
      // Try to get browser language
      const browserLang = this.translate.getBrowserLang();
      
      // Check if browser language is supported, otherwise default to English
      if (browserLang && this.availableLanguages.some(lang => lang.code.startsWith(browserLang))) {
        // Find the exact match or closest match
        const exactMatch = this.availableLanguages.find(lang => lang.code === browserLang);
        if (exactMatch) return exactMatch.code;
        
        // Find partial match (e.g., 'de' matches 'de-CH')
        const partialMatch = this.availableLanguages.find(lang => lang.code.startsWith(browserLang + '-'));
        if (partialMatch) return partialMatch.code;
      }
    } catch (err) {
      console.error('Error determining default language:', err);
    }
    
    return 'en';
  }
} 