import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, 
         IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
         IonCardContent, IonButton, IonInput, IonItem, IonLabel,
         IonList, IonIcon } from '@ionic/angular/standalone';
import { CantonSelectorComponent } from '../../components/canton-selector/canton-selector.component';
import { HolidayCalendarComponent } from '../../components/holiday-calendar/holiday-calendar.component';
import { HolidayService } from '../../services/holiday.service';
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import { YearSelectorComponent } from '../../components/year-selector/year-selector.component';
import { VacationOptimizerComponent } from '../../components/vacation-optimizer/vacation-optimizer.component';

interface TimelineDay {
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
  isVacation: boolean;
  label: string;
  shortLabel: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    CantonSelectorComponent, HolidayCalendarComponent, IonCard, IonCardHeader,
    IonCardTitle, IonCardSubtitle, IonCardContent, IonButton, IonInput, IonItem, IonLabel,
    IonList, IonIcon, YearSelectorComponent, VacationOptimizerComponent
  ]
})
export class HomePage implements OnInit {
  selectedCanton: string = '';
  selectedYear: number = new Date().getFullYear();
  availableVacationDays: number = 20;
  optimizationResult: any = null;
  
  // Add custom holidays tracking
  customHolidays: Date[] = [];
  removedHolidays: Date[] = [];

  constructor(private holidayService: HolidayService) {
    addIcons({ calendarOutline });
  }

  ngOnInit() {
  }

  onCantonChanged(canton: string) {
    this.selectedCanton = canton;
  }
  
  onYearChanged(year: number) {
    this.selectedYear = year;
    // Reset optimization if year changes
    this.optimizationResult = null;
  }
  
  // Add methods for custom holiday management
  onHolidayAdded(date: Date) {
    this.customHolidays.push(date);
  }
  
  onHolidayRemoved(date: Date) {
    // If it's a custom holiday, remove from customHolidays
    this.customHolidays = this.customHolidays.filter(h => 
      h.getFullYear() !== date.getFullYear() || 
      h.getMonth() !== date.getMonth() || 
      h.getDate() !== date.getDate()
    );
    
    // If it's a public holiday, add to removedHolidays
    if (this.holidayService.isPublicHoliday(date, this.selectedCanton)) {
      this.removedHolidays.push(date);
    }
  }
  
  calculateOptimalHolidays() {
    // Include custom and removed holidays in calculation
    this.holidayService.calculateOptimalHolidays(
      this.selectedCanton, 
      this.availableVacationDays, 
      this.selectedYear,
      this.customHolidays,
      this.removedHolidays
    ).subscribe(result => {
      this.optimizationResult = result;
    });
  }
  
  // Format date in a readable format
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  }
  
  // Generate timeline visualization data
  generateTimelineDays(period: any): TimelineDay[] {
    const days: TimelineDay[] = [];
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);
    
    // Clone the start date to avoid modifying it
    const currentDate = new Date(startDate);
    
    // Generate days for the timeline
    while (currentDate <= endDate) {
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      
      // For demo purposes, let's assume some holidays
      // In a real app, you would check against your holiday service
      const isHoliday = this.holidayService.isPublicHoliday(currentDate, this.selectedCanton);
      
      // For demo purposes, let's assume weekdays that aren't holidays are vacation days
      const isVacation = !isWeekend && !isHoliday;
      
      days.push({
        date: new Date(currentDate),
        isWeekend,
        isHoliday,
        isVacation,
        label: currentDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'short', 
          day: 'numeric'
        }),
        shortLabel: currentDate.getDate().toString()
      });
      
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }
}
