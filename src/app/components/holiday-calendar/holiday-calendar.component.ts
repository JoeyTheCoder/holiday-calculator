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
  @Input() year: number | null = null;
  
  @Output() holidayAdded = new EventEmitter<Date>();
  @Output() holidayRemoved = new EventEmitter<Date>();
  
  currentDate = new Date();
  currentMonth: number = this.currentDate.getMonth();
  currentYear: number = this.year || new Date().getFullYear();
  
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

  // Add a flag to track if year has been set
  yearSelected: boolean = false;

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
    console.log(`[Calendar] Initialization info:`);
    console.log(`  - System year: ${new Date().getFullYear()}`); 
    console.log(`  - Input year: ${this.year}`);
    
    // Don't set a default year - leave it null until explicitly set
    this.currentYear = this.year || new Date().getFullYear();
    console.log(`  - Current component year: ${this.currentYear}`);
    
    // Mark if we have a selected year or not
    this.yearSelected = this.year !== null;
    console.log(`[Calendar] Year selected: ${this.yearSelected}`);
    
    // Initialize month names
    this.initMonthNames();
    
    // Subscribe to language changes
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(() => {
      this.initMonthNames();
      this.updateMonthName();
      if (this.yearSelected) {
        this.generateCalendarDays();
      }
    });
    
    // Set initial month name
    this.updateMonthName();
    
    // Only generate calendar if year is selected
    if (this.yearSelected) {
      this.generateCalendarDays();
    }
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
    console.log(`[Calendar] Input changes detected:`, 
      Object.keys(changes).map(key => `${key}: ${changes[key].previousValue} → ${changes[key].currentValue}`));
    
    // If the year input changes, update our internal state
    if (changes['year']) {
      const newYear = changes['year'].currentValue;
      console.log(`[Calendar] Year input changed to ${newYear}`);
      
      // Explicitly set both year values for consistency
      this.year = newYear;
      this.currentYear = newYear;
      
      // Pre-load holidays for the new year
      this.loadHolidays(newYear);
      
      // Update the UI
      this.updateMonthName();
      this.generateCalendarDays();
      console.log(`[Calendar] Calendar updated for new year: ${this.currentYear}`);
    }
    
    // If the canton changes, reload holidays and regenerate the calendar
    if (changes['canton']) {
      console.log(`[Calendar] Canton changed to ${this.canton}`);
      // Reload holidays for the current year and canton
      this.loadHolidays(this.currentYear);
      // Regenerate the calendar
      this.generateCalendarDays();
    }
  }

  // Add a method to explicitly load holidays for a year
  private loadHolidays(year: number) {
    console.log(`[Calendar] Pre-loading holidays for canton ${this.canton}, year ${year}`);
    // Force the holiday service to load this year's holidays
    this.publicHolidays = this.holidayService.getHolidays(this.canton, year);
    console.log(`[Calendar] Loaded ${this.publicHolidays.length} public holidays for year ${year}`);
  }

  updateMonthName() {
    this.currentMonthName = this.localizedMonthNames[this.currentMonth];
  }

  // Fix the findHolidayName method to explicitly use the correct year
  private findHolidayName(date: Date): string | undefined {
    // Clone the date to ensure we're working with a clean copy
    const checkDate = new Date(date.getTime());
    const year = checkDate.getFullYear();
    
    console.log(`[Calendar] Finding holiday name for ${checkDate.toISOString().split('T')[0]} (year: ${year})`);
    
    // Fix parameter order: canton first, then year
    const holidays = this.holidayService.getHolidays(this.canton, year);
    
    // Log all holidays found to debug
    console.log(`[Calendar] Found ${holidays.length} holidays for ${year}:`, 
      holidays.map(h => `${h.name} on ${h.date.toISOString().split('T')[0]}`));
    
    // Find matching holiday - strictly compare dates including year
    const holiday = holidays.find(h => 
      h.date.getDate() === checkDate.getDate() && 
      h.date.getMonth() === checkDate.getMonth() &&
      h.date.getFullYear() === checkDate.getFullYear()
    );
    
    if (holiday) {
      console.log(`[Calendar] ✓ Found holiday name: ${holiday.name} for ${checkDate.toISOString().split('T')[0]}`);
      return holiday.name;
    }
    
    return undefined;
  }

  // Generate calendar days
  generateCalendarDays() {
    if (!this.yearSelected) {
      console.log(`[Calendar] Calendar generation skipped - no year selected`);
      this.calendarDays = [];
      return;
    }
    
    console.log(`[Calendar] Generating calendar days for ${this.currentMonthName} ${this.currentYear}`);
    this.calendarDays = [];
    
    // Get first day of the month
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    // Get last day of the month
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    // Debug log the date range
    console.log(`[Calendar] Calendar range: ${firstDay.toISOString().split('T')[0]} to ${lastDay.toISOString().split('T')[0]}`);
    
    // Get the day of the week of the first day (0 = Sunday, 1 = Monday, etc.)
    let firstDayOfWeek = firstDay.getDay();
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Add days from previous month to fill the first row
    const daysFromPrevMonth = firstDayOfWeek;
    const prevMonth = new Date(this.currentYear, this.currentMonth, 0);
    const prevMonthDays = prevMonth.getDate();
    
    for (let i = prevMonthDays - daysFromPrevMonth + 1; i <= prevMonthDays; i++) {
      const date = new Date(
        this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear, 
        this.currentMonth === 0 ? 11 : this.currentMonth - 1, 
        i
      );
      this.addCalendarDay(date, false);
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(this.currentYear, this.currentMonth, i);
      this.addCalendarDay(date, true);
    }
    
    // Add days from next month to fill remaining cells
    const totalDaysAdded = this.calendarDays.length;
    const daysFromNextMonth = 42 - totalDaysAdded; // 6 weeks × 7 days = 42
    
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const date = new Date(
        this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear, 
        this.currentMonth === 11 ? 0 : this.currentMonth + 1, 
        i
      );
      this.addCalendarDay(date, false);
    }
  }
  
  // Add a day to the calendar
  private addCalendarDay(date: Date, isCurrentMonth: boolean) {
    // Create a proper copy of the date to avoid reference issues
    const checkDate = new Date(date.getTime());
    
    // Log the exact date being checked
    console.log(`[Calendar] Checking date: ${checkDate.toISOString().split('T')[0]} (month: ${this.currentMonth+1}, year: ${this.currentYear})`);
    
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                  date.getMonth() === today.getMonth() && 
                  date.getFullYear() === today.getFullYear();
    
    // Ensure we're using the calendar's current year when checking for holidays
    if (isCurrentMonth) {
      // For current month days, we can check holiday status directly
      console.log(`[Calendar] Checking holiday status for current month day: ${checkDate.toISOString().split('T')[0]}`);
    } else {
      // For previous/next month days, log this case for debugging
      console.log(`[Calendar] Day from adjacent month: ${checkDate.toISOString().split('T')[0]}`);
    }
    
    // Check if the date is a weekend
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    // Check if we've manually removed this holiday
    const isRemovedHoliday = this.removedHolidays.some(d => 
      d.getDate() === date.getDate() && 
      d.getMonth() === date.getMonth() && 
      d.getFullYear() === date.getFullYear()
    );
    
    // Check if it's a custom added holiday
    const isCustomHoliday = this.customHolidays.some(d => 
      d.getDate() === date.getDate() && 
      d.getMonth() === date.getMonth() && 
      d.getFullYear() === date.getFullYear()
    );
    
    // Check if it's a public holiday - USE THE CORRECT YEAR from the date object
    const isHoliday = !isRemovedHoliday && this.holidayService.isPublicHoliday(checkDate, this.canton);
    
    if (isHoliday) {
      console.log(`[Calendar] ✓ ${checkDate.toISOString().split('T')[0]} is a holiday in ${this.canton}`);
    }
    
    // Get holiday name for tooltips
    let holidayName: string | undefined;
    if (isHoliday) {
      holidayName = this.findHolidayName(checkDate);
    } else if (isCustomHoliday) {
      holidayName = this.translateService.instant('HOLIDAYS.CUSTOM');
    }
    
    this.calendarDays.push({
      date: checkDate,
      dayNumber: date.getDate(),
      isCurrentMonth: isCurrentMonth,
      isToday: isToday,
      isWeekend: isWeekend,
      isHoliday: isHoliday,
      isCustomHoliday: isCustomHoliday,
      isRemovedHoliday: isRemovedHoliday,
      holidayName: holidayName
    });
  }

  // Previous month navigation
  prevMonth() {
    console.log(`[Calendar] Navigating from month ${this.currentMonth} year ${this.currentYear} to previous month`);
    
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
      console.log(`[Calendar] Year changed to ${this.currentYear} (previous year)`);
    } else {
      this.currentMonth--;
    }
    
    this.updateMonthName();
    this.generateCalendarDays();
  }

  // Next month navigation
  nextMonth() {
    console.log(`[Calendar] Navigating from month ${this.currentMonth} year ${this.currentYear} to next month`);
    
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
      console.log(`[Calendar] Year changed to ${this.currentYear} (next year)`);
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

  // Add a public method to set the year explicitly
  setYear(year: number) {
    console.log(`[Calendar] Explicitly setting year to ${year} (was ${this.currentYear})`);
    this.currentYear = year;
    this.year = year; // Make sure both are updated
    this.yearSelected = true;
    this.updateMonthName();
    this.generateCalendarDays();
    
    // Pre-load holidays for this year
    this.loadHolidays(year);
  }

  // Also add a reset method that returns to the input year
  resetToInputYear() {
    console.log(`[Calendar] Resetting to input year ${this.year}`);
    this.currentYear = this.year || new Date().getFullYear();
    this.currentMonth = new Date().getMonth(); // Back to current month
    this.updateMonthName();
    this.generateCalendarDays();
  }

  // Fix the missing initMonthNames method by adding it
  private initMonthNames() {
    console.log('[Calendar] Initializing month names');
    this.updateLocalizedMonthNames();
  }

  // Alternatively, we can rename our prevMonth back to match the template
  // Or we need to update the template to use prevMonth instead of previousMonth
  previousMonth() {
    console.log('[Calendar] previousMonth called, delegating to prevMonth');
    this.prevMonth();
  }

  // Add a public method to debug the current year state
  getDebugInfo(): string {
    return `Calendar year: ${this.currentYear}, Input year: ${this.year}`;
  }
}
