import { Component, NgZone } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { 
  arrowBack, 
  arrowForward, 
  chevronBackOutline, 
  chevronForwardOutline,
  ellipsisVertical,
  caretDown,
  caretUp,
  checkmark
} from 'ionicons/icons';
import { addIcons } from 'ionicons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class AppComponent {
  constructor(
    private router: Router,
    private zone: NgZone,
    private translate: TranslateService
  ) {
    this.initializeApp();
    
    // Register all icons globally
    addIcons({
      'arrow-back': arrowBack,
      'arrow-forward': arrowForward,
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'ellipsis-vertical': ellipsisVertical,
      'caret-down': caretDown,
      'caret-up': caretUp,
      'checkmark': checkmark
    });
  }

  initializeApp() {
    // Fix hydration issues by forcing a navigation after app is ready
    setTimeout(() => {
      this.zone.run(() => {
        // Force refresh the current route
        const currentUrl = this.router.url;
        this.router.navigateByUrl('/', {skipLocationChange: true}).then(() => {
          this.router.navigate([currentUrl]);
        });
      });
    }, 100);
    
    // Fix hydration issues by removing page-invisible classes
    document.addEventListener('ionViewDidEnter', () => {
      const invisiblePages = document.querySelectorAll('.ion-page-invisible');
      invisiblePages.forEach(page => {
        page.classList.remove('ion-page-invisible');
      });
    });

    // Make sure a default language is set
    this.translate.setDefaultLang('en');
    
    // Force translation to be loaded with the default language
    this.translate.use('en').subscribe(
      () => console.log('Default translations loaded'),
      err => console.error('Error loading translations', err)
    );
    
    console.log('App component initialized');
  }
}
