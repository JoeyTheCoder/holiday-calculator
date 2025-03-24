import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { IonIcon, IonCard, IonCardHeader, IonCardTitle, 
         IonCardContent, IonCardSubtitle } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, trendingUpOutline } from 'ionicons/icons';
import { HolidayService } from '../../services/holiday.service';

interface TimelineDay {
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
  isVacation: boolean;
  label: string;
  shortLabel: string;
}

@Component({
  selector: 'app-vacation-optimizer',
  templateUrl: './vacation-optimizer.component.html',
  styleUrls: ['./vacation-optimizer.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle
  ]
})
export class VacationOptimizerComponent implements OnChanges {
  @Input() optimizationResult: any;
  @Input() availableDays: number = 0;
  
  currentYear = new Date().getFullYear();

  constructor(private holidayService: HolidayService) {
    addIcons({
      calendarOutline,
      timeOutline,
      trendingUpOutline
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reset or update component when inputs change
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    
    const d = new Date(date);
    return d.toLocaleDateString('en-CH', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  }

  calculateDaysGained(): number {
    if (!this.optimizationResult) return 0;
    return this.optimizationResult.totalDaysOff - this.optimizationResult.daysUsed;
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
      
      // Check if it's a holiday using the holiday service
      const isHoliday = this.holidayService.isPublicHoliday(
        currentDate, 
        this.optimizationResult.canton || 'ZH' // Default to Zurich if not specified
      );
      
      // It's a vacation day if it's a weekday and not a holiday
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
