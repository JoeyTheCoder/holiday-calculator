import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { IonItem, IonLabel, IonSelect, IonSelectOption, IonButton, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, Language } from '../../services/language.service';

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule,
    IonItem, IonLabel, IonSelect, IonSelectOption, IonButton, IonIcon
  ]
})
export class LanguageSelectorComponent implements OnInit {
  selectedLanguage: string = 'en';
  languages: Language[] = [];
  
  @ViewChild('langSelect') langSelect!: IonSelect;
  
  constructor(private languageService: LanguageService) {
    this.languages = this.languageService.availableLanguages;
  }
  
  ngOnInit() {
    this.languageService.currentLanguage$.subscribe(lang => {
      this.selectedLanguage = lang;
    });
  }
  
  getCurrentLanguageFlag(): string {
    const currentLang = this.languages.find(lang => lang.code === this.selectedLanguage);
    return currentLang?.flag || '🌐';
  }
  
  getCurrentLanguageName(): string {
    const currentLang = this.languages.find(lang => lang.code === this.selectedLanguage);
    return currentLang?.name || 'Language';
  }
  
  toggleLanguageOptions() {
    // Use ViewChild instead of querySelector for better reliability
    if (this.langSelect) {
      this.langSelect.open();
    }
  }
  
  onLanguageChange(event: any) {
    const langCode = event.detail.value;
    this.languageService.changeLanguage(langCode);
  }
} 