import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-debug-info',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div style="position: fixed; bottom: 0; right: 0; background: rgba(0,0,0,0.8); color: white; padding: 10px; font-size: 12px; z-index: 9999;">
      <p>{{ 'DEBUG.CURRENT_LANG' | translate }}: {{ currentLang }}</p>
      <p>{{ 'DEBUG.DEFAULT_LANG' | translate }}: {{ defaultLang }}</p>
      <p>{{ 'DEBUG.AVAILABLE_LANGS' | translate }}: {{ availableLangs }}</p>
      <button (click)="forceRefresh()">{{ 'DEBUG.FORCE_REFRESH' | translate }}</button>
    </div>
  `
})
export class DebugInfoComponent implements OnInit {
  currentLang = 'Unknown';
  defaultLang = 'Unknown';
  availableLangs = 'Unknown';

  constructor(
    private translateService: TranslateService,
    private languageService: LanguageService
  ) {}

  ngOnInit() {
    this.updateInfo();
  }

  updateInfo() {
    try {
      this.currentLang = this.translateService.currentLang || 'Not set';
      this.defaultLang = this.translateService.defaultLang || 'Not set';
      this.availableLangs = this.translateService.getLangs().join(', ') || 'None';
    } catch (e) {
      console.error('Error in debug component:', e);
    }
  }

  forceRefresh() {
    window.location.reload();
  }
} 