import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-year-selector',
  templateUrl: './year-selector.component.html',
  styleUrls: ['./year-selector.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class YearSelectorComponent implements OnInit {
  @Output() yearChanged = new EventEmitter<number>();
  
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];
  
  constructor() { }

  ngOnInit() {
    const currentYear = new Date().getFullYear();
    // Generate years (current year and 5 years into the future)
    for (let year = currentYear; year <= currentYear + 5; year++) {
      this.availableYears.push(year);
    }
  }

  onYearChange() {
    this.yearChanged.emit(this.selectedYear);
  }
} 