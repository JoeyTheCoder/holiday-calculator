import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';

interface Language {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule,
    IonButton, IonSelect, IonSelectOption
  ]
})
export class LanguageSelectorComponent implements OnInit {
  @ViewChild('langSelect') langSelect!: IonSelect;
  
  languages: Language[] = [
    { code: 'en', name: 'English', flag: '🌐' },
    { code: 'de-CH', name: 'Deutsch', flag: '🌐' },
    { code: 'fr-CH', name: 'Français', flag: '🌐' },
    { code: 'it-CH', name: 'Italiano', flag: '🌐' }
  ];
  
  selectedLanguage: string;
  
  constructor(private translateService: TranslateService) {
    this.selectedLanguage = this.translateService.currentLang || this.translateService.defaultLang;
  }
  
  ngOnInit() {}
  
  toggleLanguageOptions() {
    this.langSelect.open();
  }
  
  onLanguageChange(event: any) {
    const langCode = event.detail.value;
    this.selectedLanguage = langCode;
    this.translateService.use(langCode);
    
    // Save language preference to localStorage
    localStorage.setItem('selectedLanguage', langCode);
  }
  
  getCurrentLanguageFlag(): string {
    const lang = this.languages.find(l => l.code === this.selectedLanguage);
    return lang ? lang.flag : '🌐';
  }
  
  getCurrentLanguageName(): string {
    const lang = this.languages.find(l => l.code === this.selectedLanguage);
    return lang ? lang.name : 'Language';
  }
} 