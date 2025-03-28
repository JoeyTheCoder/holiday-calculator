import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { IonIcon, IonCard, IonCardHeader, IonCardTitle, 
         IonCardContent, IonCardSubtitle, IonButton } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Platform } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, logoGoogle, logoMicrosoft } from 'ionicons/icons';
import { HolidayService } from '../../services/holiday.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';
import { CalendarIntegrationService } from '../../services/calendar-integration.service';

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
    IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
    IonCardSubtitle, IonButton
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
    private languageService: LanguageService,
    private calendarService: CalendarIntegrationService,
    public platform: Platform
  ) {
    addIcons({
      calendarOutline,
      timeOutline,
      logoGoogle,
      logoMicrosoft
    });
  }

  ngOnInit() {
    this.langSubscription = this.languageService.currentLanguage$.subscribe(lang => {
      this.updateLocaleSpecificData(lang);
    });
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['optimizationResult'] && changes['optimizationResult'].currentValue) {
      // Handle changes to optimization result if needed
    }
  }
  
  ngOnDestroy() {
    if (this.langSubscription) {
      this.langSubscription.unsubscribe();
    }
  }

  updateLocaleSpecificData(locale: string) {
    console.log('Language updated to', locale);
    
    // If you need to refresh any data or UI elements based on language, do it here
    // No need to force refresh as Angular change detection should handle this
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    
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
  
  generateTimelineDays(period: any): TimelineDay[] {
    const days: TimelineDay[] = [];
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);
    
    const extendedStart = new Date(startDate);
    const startDayOfWeek = startDate.getDay();
    
    if (startDayOfWeek >= 1 && startDayOfWeek <= 4) {
      extendedStart.setDate(startDate.getDate() - startDayOfWeek - 1);
    } else if (startDayOfWeek === 0) {
      extendedStart.setDate(startDate.getDate() - 1);
    } else {
      extendedStart.setDate(startDate.getDate() - 1);
    }
    
    const extendedEnd = new Date(endDate);
    const endDayOfWeek = endDate.getDay();
    
    if (endDayOfWeek >= 2 && endDayOfWeek <= 5) {
      extendedEnd.setDate(endDate.getDate() + (7 - endDayOfWeek));
    } else if (endDayOfWeek === 1) {
      extendedEnd.setDate(endDate.getDate() + 2);
    } else {
      extendedEnd.setDate(endDate.getDate() + 1);
    }
    
    const currentDate = new Date(extendedStart);
    
    const currentLocale = this.translateService.currentLang || 'en-CH';
    
    while (currentDate <= extendedEnd) {
      const dayOfWeek = currentDate.getDay();
      const europeanDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      const isWeekend = europeanDayOfWeek === 5 || europeanDayOfWeek === 6;
      
      const isHoliday = this.holidayService.isPublicHoliday(
        currentDate, 
        this.optimizationResult.canton || 'ZH'
      );
      
      const isVacation = !isWeekend && !isHoliday && 
                        currentDate >= startDate && currentDate <= endDate;
      
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
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }

  getPeriodDescription(period: any): string {
    const start = new Date(period.start);
    const end = new Date(period.end);
    
    if (start.getDay() === 1 && end.getDay() === 5 && 
        this.holidayService.countBusinessDaysWithoutHolidays(start, end) === 5) {
      return this.translateService.instant('VACATION.FULL_WORK_WEEK');
    }
    
    const holidays = this.holidayService.getHolidaysInRange(start, end, this.optimizationResult.canton);
    if (holidays && holidays.length > 0) {
      const translatedNames = holidays.map((h: any) => {
        const translatedName = this.translateService.instant(`HOLIDAY_NAMES.${h.name}`);
        return translatedName !== `HOLIDAY_NAMES.${h.name}` ? translatedName : h.name;
      });
      
      return this.translateService.instant('VACATION.INCLUDES_HOLIDAYS', {
        count: holidays.length,
        names: translatedNames.join(', ')
      });
    }
    
    return this.translateService.instant('VACATION.STRATEGIC_TIME_OFF');
  }

  openGoogleCalendar(period: any): void {
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);
    
    endDate.setHours(23, 59, 59);
    
    const title = this.translateService.instant('VACATION.CALENDAR_TITLE');
    const description = this.translateService.instant('VACATION.CALENDAR_DESCRIPTION', {
      daysUsed: period.daysUsed || 0,
      totalDaysOff: period.totalDaysOff || 0,
      extraDays: period.totalDaysOff - period.daysUsed || 0
    });
    
    const googleCalendarUrl = this.calendarService.generateGoogleCalendarUrl(
      startDate, endDate, title, description
    );
    
    window.open(googleCalendarUrl, '_blank');
  }
  
  /**
   * Opens Outlook calendar with the vacation period (using improved web version)
   */
  openOutlookCalendar(period: any): void {
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);
    
    // Set endDate to the end of the day
    endDate.setHours(23, 59, 59);
    
    const title = this.translateService.instant('VACATION.CALENDAR_TITLE');
    const description = this.translateService.instant('VACATION.CALENDAR_DESCRIPTION', {
      daysUsed: period.daysUsed || 0,
      totalDaysOff: period.totalDaysOff || 0,
      extraDays: period.totalDaysOff - period.daysUsed || 0
    });
    
    // Log the original dates for debugging
    console.log('Original start date:', startDate);
    console.log('Original end date:', endDate);
    
    // Get the URL with improved format
    const outlookCalendarUrl = this.calendarService.generateCalendarUrl(
      startDate, endDate, title, description, 'outlook'
    );
    
    console.log('Opening Outlook web version with URL:', outlookCalendarUrl);
    
    // Open in a new window with specific settings to help maintain session
    try {
      // Set windowFeatures to full window for better experience
      const windowFeatures = 'width=1024,height=768,toolbar=yes,location=yes,menubar=yes,resizable=yes,scrollbars=yes';
      window.open(outlookCalendarUrl, '_blank', windowFeatures);
    } catch (e) {
      console.error('Error opening Outlook URL:', e);
      // Fallback to simple window open
      window.open(outlookCalendarUrl, '_blank');
    }
  }

  /**
   * Opens the native calendar app (especially useful for iOS)
   */
  openNativeCalendar(period: any): void {
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);
    
    endDate.setHours(23, 59, 59);
    
    const title = this.translateService.instant('VACATION.CALENDAR_TITLE');
    const description = this.translateService.instant('VACATION.CALENDAR_DESCRIPTION', {
      daysUsed: period.daysUsed || 0,
      totalDaysOff: period.totalDaysOff || 0,
      extraDays: period.totalDaysOff - period.daysUsed || 0
    });
    
    // Get the native calendar URL
    const nativeCalendarUrl = this.calendarService.generateCalendarUrl(
      startDate, endDate, title, description, 'native'
    );
    
    console.log('Opening native calendar with URL:', nativeCalendarUrl);
    
    // Try to open the URL
    try {
      window.open(nativeCalendarUrl, '_blank');
    } catch (e) {
      console.error('Error opening native calendar URL:', e);
    }
  }
}
