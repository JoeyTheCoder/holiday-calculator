import { Component } from '@angular/core';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  public appPages = [
    { title: 'Startseite', url: '/home', icon: 'home' },
    { title: 'Meine Feiertage', url: '/cal-modal', icon: 'paper-plane' },
    
  ];
}
