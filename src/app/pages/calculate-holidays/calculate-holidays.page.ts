import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-calculate-holidays',
  templateUrl: './calculate-holidays.page.html',
  styleUrls: ['./calculate-holidays.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class CalculateHolidaysPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
