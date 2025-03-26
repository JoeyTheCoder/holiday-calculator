import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HolidayService } from '../../services/holiday.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
         IonButton, IonIcon, IonItem, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForward } from 'ionicons/icons';

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
export class HolidayCalendarComponent implements OnInit, OnChanges {
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
  
  // Rename weekDays to weekdays to match the template
  weekdays: string[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
  
  publicHolidays: any[] = [];

  // Add this property to resolve the error
  currentMonthName: string = '';

  constructor(
    private holidayService: HolidayService,
    private translateService: TranslateService
  ) {
    addIcons({
      arrowBack,
      arrowForward
    });
  }

  ngOnInit() {
    // Register the icons
    addIcons({
      arrowBack,
      arrowForward
    });
    
    // Initialize the calendar
    this.updateMonthName();
    this.generateCalendarDays();
    
    // Load holidays for the current canton/year
    this.loadHolidays();
  }

  ngOnChanges(changes: SimpleChanges) {
    // When canton or year changes, update the calendar
    if (changes['canton'] || changes['year']) {
      this.loadHolidays();
      this.generateCalendarDays();
    }
  }

  loadHolidays() {
    // Load holidays for the current canton and year
    this.publicHolidays = this.holidayService.getHolidays(this.canton, this.year) || [];
    
    // Clear custom and removed holidays when canton/year changes
    this.customHolidays = [];
    this.removedHolidays = [];
  }

  generateCalendarDays(): void {
    this.calendarDays = [];
    
    // Create a date for the first day of the current month
    const firstDay = new Date(this.year, this.currentMonth, 1);
    const lastDay = new Date(this.year, this.currentMonth + 1, 0);
    
    // Get day of week for the first day (0 = Sunday in JS)
    const firstDayOfWeek = firstDay.getDay();
    // Convert to European format (0 = Monday, 6 = Sunday)
    const firstDayEuropeanWeekday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Include days from the previous month to fill the first week
    if (firstDayEuropeanWeekday > 0) {
      const prevMonth = new Date(this.year, this.currentMonth, 0);
      const daysInPrevMonth = prevMonth.getDate();
      
      for (let i = firstDayEuropeanWeekday - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const date = new Date(this.year, this.currentMonth - 1, dayNum);
        this.addCalendarDay(date, false);
      }
    }
    
    // Add days for the current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(this.year, this.currentMonth, day);
      this.addCalendarDay(date, true);
    }
    
    // Include days from the next month to complete the grid
    const totalDaysAdded = this.calendarDays.length;
    const remainingDays = 42 - totalDaysAdded; // 6 rows of 7 days
    
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(this.year, this.currentMonth + 1, i);
      this.addCalendarDay(date, false);
    }
  }
  
  addCalendarDay(date: Date, isCurrentMonth: boolean) {
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                   date.getMonth() === today.getMonth() && 
                   date.getFullYear() === today.getFullYear();
    
    // Check if the date is a holiday
    const isHoliday = this.holidayService.isPublicHoliday(date, this.canton);
    const holidayName = isHoliday ? this.findHolidayName(date) : undefined;
    
    // Check custom and removed holidays as before
    const isCustomHoliday = this.customHolidays.some(h => 
      h.getDate() === date.getDate() && 
      h.getMonth() === date.getMonth() && 
      h.getFullYear() === date.getFullYear()
    );
    
    const isRemovedHoliday = this.removedHolidays.some(h => 
      h.getDate() === date.getDate() && 
      h.getMonth() === date.getMonth() && 
      h.getFullYear() === date.getFullYear()
    );
    
    this.calendarDays.push({
      date: new Date(date),
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

  // Rename prevMonth to previousMonth to match the template
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
  
  // Rename onDayClick to toggleHoliday to match the template
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
      this.holidayAdded.emit(clickedDate);
    }
    
    // Regenerate calendar to reflect changes
    this.generateCalendarDays();
  }

  // Find holiday name method to replace getHolidayName
  findHolidayName(date: Date): string {
    // If we have holiday data loaded
    for (const holiday of this.publicHolidays) {
      const holidayDate = new Date(holiday.date);
      if (holidayDate.getDate() === date.getDate() && 
          holidayDate.getMonth() === date.getMonth()) {
        return holiday.name || 'Holiday';
      }
    }
    return 'Holiday';
  }

  private getDaysOfWeek(): string[] {
    // European format (Monday first)
    return ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  }

  // Add this method to update the month name
  updateMonthName() {
    const date = new Date(this.currentYear, this.currentMonth, 1);
    const locale = this.translateService.currentLang || 'en';
    this.currentMonthName = date.toLocaleDateString(locale, { month: 'long' }).toUpperCase();
  }
}
