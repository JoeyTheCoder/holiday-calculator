import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
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
  @Input() defaultYear: number | null = null;
  @Output() yearChanged = new EventEmitter<number>();
  
  // Initialize with current year but don't emit yet
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];
  
  constructor() {
    const currentYear = new Date().getFullYear();
    console.log(`[YearSelector] Current system year: ${currentYear}`);
    
    // Generate years from current year to current year + 2
    for (let year = currentYear; year <= currentYear + 2; year++) {
      this.availableYears.push(year);
    }
  }
  
  ngOnInit() {
    // Use default year if provided, otherwise use current year
    this.selectedYear = this.defaultYear || new Date().getFullYear();
    
    // IMPORTANT: Emit the initial year after initialization
    // This ensures connected components get the year immediately
    console.log(`[YearSelector] Initializing with year: ${this.selectedYear}`);
    
    // Use setTimeout to ensure this happens after view initialization
    setTimeout(() => {
      console.log(`[YearSelector] Emitting initial year: ${this.selectedYear}`);
      this.yearChanged.emit(this.selectedYear);
    });
  }
  
  // Method to handle year changes from the UI
  onYearChange(event: any) {
    const year = event.detail.value;
    console.log(`[YearSelector] Year changed to: ${year}`);
    this.selectedYear = year;
    this.yearChanged.emit(year);
  }
} 