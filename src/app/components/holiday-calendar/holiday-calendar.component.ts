import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HolidayService } from '../../services/holiday.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
         IonButton, IonIcon, IonItem, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  isCustomHoliday: boolean;
  isRemovedHoliday: boolean;
  holidayName?: string;
}

@Component({
  selector: 'app-holiday-calendar',
  templateUrl: './holiday-calendar.component.html',
  styleUrls: ['./holiday-calendar.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonButton, IonIcon, IonItem, IonLabel
  ]
})
export class HolidayCalendarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() canton: string = 'ZH';
  @Input() year: number = new Date().getFullYear();
  
  @Output() holidayAdded = new EventEmitter<Date>();
  @Output() holidayRemoved = new EventEmitter<Date>();
  
  currentDate = new Date();
  currentMonth: number = this.currentDate.getMonth();
  currentYear: number = this.currentDate.getFullYear();
  
  // Track custom and removed holidays in component for display
  customHolidays: Date[] = [];
  removedHolidays: Date[] = [];
  
  calendarDays: CalendarDay[] = [];
  
  weekdays: string[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  // Use localized month names instead of translation keys
  localizedMonthNames: string[] = [];
  
  publicHolidays: any[] = [];
  currentMonthName: string = '';
  
  // Add subscription to track language changes
  private langChangeSubscription: Subscription = new Subscription();

  constructor(
    private holidayService: HolidayService,
    private translateService: TranslateService
  ) {
    // Explicitly register the icons with proper names
    addIcons({
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline
    });
    
    // Initialize localized month names
    this.updateLocalizedMonthNames();
  }

  ngOnInit() {
    // Load holidays for the current selection
    this.loadHolidays();
    this.updateMonthName();
    this.generateCalendarDays();
    
    // Subscribe to language changes
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(() => {
      this.updateLocalizedMonthNames();
      this.updateMonthName();
      this.generateCalendarDays(); // Regenerate calendar to update holiday names
    });
  }
  
  // Update month names based on current language
  updateLocalizedMonthNames() {
    const currentLang = this.translateService.currentLang || this.translateService.defaultLang;
    
    // Create a date and get month names in the current language
    const monthsArray = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(2000, i, 1);
      // Convert month name to uppercase
      const monthName = date.toLocaleString(currentLang, { month: 'long' }).toUpperCase();
      monthsArray.push(monthName);
    }
    
    this.localizedMonthNames = monthsArray;
  }
  
  ngOnDestroy() {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['canton'] || changes['year']) {
      this.loadHolidays();
      this.generateCalendarDays();
    }
  }

  loadHolidays() {
    this.publicHolidays = this.holidayService.getHolidays(this.canton, this.year);
  }

  updateMonthName() {
    this.currentMonthName = this.localizedMonthNames[this.currentMonth];
  }

  // Get the actual holiday name from the holiday service
  findHolidayName(date: Date): string {
    for (const holiday of this.publicHolidays) {
      const holidayDate = new Date(holiday.date);
      if (holidayDate.getDate() === date.getDate() && 
          holidayDate.getMonth() === date.getMonth()) {
        return holiday.name;
      }
    }
    return '';
  }

  // Generate calendar days
  generateCalendarDays() {
    this.calendarDays = [];
    
    // Get first day of the month
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    // Get last day of the month
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    // Convert to Monday = 0, Sunday = 6 format
    let firstDayOfWeek = firstDay.getDay() - 1;
    if (firstDayOfWeek < 0) firstDayOfWeek = 6; // Sunday becomes 6
    
    // Add days from previous month to fill first row
    if (firstDayOfWeek > 0) {
      const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
      for (let i = prevMonthLastDay - firstDayOfWeek + 1; i <= prevMonthLastDay; i++) {
        const date = new Date(this.currentYear, this.currentMonth - 1, i);
        this.addCalendarDay(date, false);
      }
    }
    
    // Add days for current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(this.currentYear, this.currentMonth, i);
      this.addCalendarDay(date, true);
    }
    
    // Add days from next month to complete the grid
    const gridSize = Math.ceil(this.calendarDays.length / 7) * 7;
    if (this.calendarDays.length < gridSize) {
      const daysToAdd = gridSize - this.calendarDays.length;
      for (let i = 1; i <= daysToAdd; i++) {
        const date = new Date(this.currentYear, this.currentMonth + 1, i);
        this.addCalendarDay(date, false);
      }
    }
  }
  
  // Add a day to the calendar
  addCalendarDay(date: Date, isCurrentMonth: boolean) {
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                   date.getMonth() === today.getMonth() && 
                   date.getFullYear() === today.getFullYear();
    
    // Determine if the date is a public holiday
    const isHoliday = this.holidayService.isPublicHoliday(date, this.canton);
    
    // Check if the date is in the removedHolidays array
    const isRemovedHoliday = this.removedHolidays.some(d => 
      d.getDate() === date.getDate() && 
      d.getMonth() === date.getMonth() && 
      d.getFullYear() === date.getFullYear()
    );
    
    // Check if the date is in the customHolidays array
    const isCustomHoliday = this.customHolidays.some(d => 
      d.getDate() === date.getDate() && 
      d.getMonth() === date.getMonth() && 
      d.getFullYear() === date.getFullYear()
    );
    
    // Get the holiday name if it's a holiday and not removed
    let holidayName = '';
    if (isHoliday && !isRemovedHoliday) {
      holidayName = this.findHolidayName(date);
    } else if (isCustomHoliday) {
      // Use the translate service directly to get the current translation
      holidayName = this.translateService.instant('HOLIDAYS.CUSTOM');
    }
    
    this.calendarDays.push({
      date,
      dayNumber: date.getDate(),
      isCurrentMonth,
      isToday,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: isHoliday && !isRemovedHoliday, // Only count as holiday if not removed
      isCustomHoliday,
      isRemovedHoliday,
      holidayName
    });
  }

  // Previous month navigation
  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.updateMonthName();
    this.generateCalendarDays();
  }

  // Next month navigation
  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.updateMonthName();
    this.generateCalendarDays();
  }
  
  // Toggle holiday status on day click
  toggleHoliday(day: CalendarDay) {
    if (!day.isCurrentMonth) return;
    
    const clickedDate = new Date(day.date);
    
    if (day.isHoliday && !day.isRemovedHoliday) {
      // Remove public holiday
      this.removedHolidays.push(clickedDate);
      day.isHoliday = false;
      day.holidayName = undefined;
      this.holidayRemoved.emit(clickedDate);
    } else if (day.isCustomHoliday) {
      // Remove custom holiday
      this.customHolidays = this.customHolidays.filter(d => 
        d.getDate() !== clickedDate.getDate() || 
        d.getMonth() !== clickedDate.getMonth() || 
        d.getFullYear() !== clickedDate.getFullYear()
      );
      day.isCustomHoliday = false;
      this.holidayRemoved.emit(clickedDate);
    } else if (day.isRemovedHoliday) {
      // Restore removed holiday
      this.removedHolidays = this.removedHolidays.filter(d => 
        d.getDate() !== clickedDate.getDate() || 
        d.getMonth() !== clickedDate.getMonth() || 
        d.getFullYear() !== clickedDate.getFullYear()
      );
      day.isRemovedHoliday = false;
      
      // Check if it should be restored as a public holiday
      const isPublicHoliday = this.holidayService.isPublicHoliday(clickedDate, this.canton);
      if (isPublicHoliday) {
        day.isHoliday = true;
        day.holidayName = this.findHolidayName(clickedDate);
      }
      
      this.holidayAdded.emit(clickedDate);
    } else {
      // Add custom holiday
      this.customHolidays.push(clickedDate);
      day.isCustomHoliday = true;
      // Use the translate service directly to get the current translation
      day.holidayName = this.translateService.instant('HOLIDAYS.CUSTOM');
      this.holidayAdded.emit(clickedDate);
    }
    
    // Regenerate calendar to reflect changes
    this.generateCalendarDays();
  }

  private getDaysOfWeek(): string[] {
    // European format (Monday first)
    return ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  }
}
