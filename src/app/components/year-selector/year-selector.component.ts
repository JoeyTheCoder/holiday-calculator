import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, 
         IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-year-selector',
  templateUrl: './year-selector.component.html',
  styleUrls: ['./year-selector.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonSelect, IonSelectOption
  ]
})
export class YearSelectorComponent implements OnInit {
  @Output() yearChanged = new EventEmitter<number>();
  
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];
  
  constructor() {
    const currentYear = new Date().getFullYear();
    // Generate years from current year to current year + 5
    for (let year = currentYear; year <= currentYear + 5; year++) {
      this.availableYears.push(year);
    }
  }
  
  ngOnInit() { }
  
  // Fix method to accept the event parameter
  onYearChange(event: any) {
    const year = event.detail.value;
    this.selectedYear = year;
    this.yearChanged.emit(year);
  }
} 