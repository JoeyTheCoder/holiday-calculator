import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { IonIcon, IonCard, IonCardHeader, IonCardTitle, 
         IonCardContent, IonCardSubtitle } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline } from 'ionicons/icons';
import { HolidayService } from '../../services/holiday.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';

interface TimelineDay {
  date: Date;
  isWeekend: boolean;
  isHoliday: boolean;
  isVacation: boolean;
  isExtendedDay?: boolean;
  label: string;
  shortLabel: string;
  weekdayLabel: string;
}

@Component({
  selector: 'app-vacation-optimizer',
  templateUrl: './vacation-optimizer.component.html',
  styleUrls: ['./vacation-optimizer.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule,
    IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonCardSubtitle
  ]
})
export class VacationOptimizerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() optimizationResult: any;
  @Input() availableDays: number = 0;
  
  currentYear = new Date().getFullYear();
  private langSubscription: Subscription = new Subscription();
  
  constructor(
    private holidayService: HolidayService,
    private translateService: TranslateService,
    private languageService: LanguageService
  ) {
    addIcons({
      calendarOutline,
      timeOutline,
    });
  }

  ngOnInit() {
    // Subscribe to language changes
    this.langSubscription = this.languageService.currentLanguage$.subscribe(lang => {
      // Update date formatting and other locale-specific logic when language changes
      this.updateLocaleSpecificData(lang);
    });
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    // Implement ngOnChanges to fix the error
    if (changes['optimizationResult'] && changes['optimizationResult'].currentValue) {
      // Handle changes to optimization result if needed
    }
  }
  
  ngOnDestroy() {
    // Clean up subscription to prevent memory leaks
    if (this.langSubscription) {
      this.langSubscription.unsubscribe();
    }
  }

  updateLocaleSpecificData(locale: string) {
    // This method can be used to update any locale-specific data
    console.log('Language updated to', locale);
    
    // If you need to refresh any data or UI elements based on language, do it here
    // No need to force refresh as Angular change detection should handle this
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    
    // Use the current language locale for date formatting
    const d = new Date(date);
    return d.toLocaleDateString(this.translateService.currentLang || 'en-CH', { 
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
    
    // Start from the previous weekend or at least 2 days before
    const extendedStart = new Date(startDate);
    const startDayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // If starting on Monday-Thursday, show the weekend before
    if (startDayOfWeek >= 1 && startDayOfWeek <= 4) {
      // Go back to the previous Saturday
      extendedStart.setDate(startDate.getDate() - startDayOfWeek - 1);
    } else if (startDayOfWeek === 0) { // If starting on Sunday
      // Just include the Saturday before
      extendedStart.setDate(startDate.getDate() - 1);
    } else {
      // For Friday/Saturday starts, just go back 1 day to show context
      extendedStart.setDate(startDate.getDate() - 1);
    }
    
    // Include the weekend after or at least 2 days after
    const extendedEnd = new Date(endDate);
    const endDayOfWeek = endDate.getDay();
    
    // If ending on Tuesday-Friday, show the weekend after
    if (endDayOfWeek >= 2 && endDayOfWeek <= 5) {
      // Go forward to the next Sunday
      extendedEnd.setDate(endDate.getDate() + (7 - endDayOfWeek));
    } else if (endDayOfWeek === 1) { // If ending on Monday
      // Just include 2 more days for context
      extendedEnd.setDate(endDate.getDate() + 2);
    } else {
      // For Saturday/Sunday ends, just go forward 1 day for context
      extendedEnd.setDate(endDate.getDate() + 1);
    }
    
    // Clone the start date to avoid modifying it
    const currentDate = new Date(extendedStart);
    
    // Use the current language for all date formatting
    const currentLocale = this.translateService.currentLang || 'en-CH';
    
    // Generate days for the timeline
    while (currentDate <= extendedEnd) {
      // European format: 0 = Monday, 6 = Sunday (convert from JS format where 0 = Sunday)
      const dayOfWeek = currentDate.getDay();
      const europeanDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      // Weekends are days 5 (Saturday) and 6 (Sunday) in European format
      const isWeekend = europeanDayOfWeek === 5 || europeanDayOfWeek === 6;
      
      // Check if it's a holiday using the holiday service
      const isHoliday = this.holidayService.isPublicHoliday(
        currentDate, 
        this.optimizationResult.canton || 'ZH' // Default to Zurich if not specified
      );
      
      // Determine if it's a vacation day - only during the actual period and if it's a workday
      const isVacation = !isWeekend && !isHoliday && 
                        currentDate >= startDate && currentDate <= endDate;
      
      // Determine if it's an extended day (days before or after the actual period)
      const isExtendedDay = (currentDate < startDate || currentDate > endDate);
      
      days.push({
        date: new Date(currentDate),
        isWeekend,
        isHoliday,
        isVacation,
        isExtendedDay,
        label: currentDate.toLocaleDateString(currentLocale, { 
          weekday: 'long',
          month: 'short', 
          day: 'numeric'
        }),
        shortLabel: currentDate.getDate().toString(),
        weekdayLabel: currentDate.toLocaleDateString(currentLocale, { weekday: 'short' }).substring(0, 2)
      });
      
      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  // Add methods to categorize and explain suggestions
  getPeriodDescription(period: any): string {
    // Check if it's a complete work week
    const start = new Date(period.start);
    const end = new Date(period.end);
    
    if (start.getDay() === 1 && end.getDay() === 5 && 
        this.holidayService.countBusinessDaysWithoutHolidays(start, end) === 5) {
      return this.translateService.instant('VACATION.FULL_WORK_WEEK');
    }
    
    // Check if it contains holidays
    const holidays = this.holidayService.getHolidaysInRange(start, end, this.optimizationResult.canton);
    if (holidays && holidays.length > 0) {
      return this.translateService.instant('VACATION.INCLUDES_HOLIDAYS', {
        count: holidays.length,
        names: holidays.map((h: any) => h.name).join(', ')
      });
    }
    
    return this.translateService.instant('VACATION.STRATEGIC_TIME_OFF');
  }
}
