import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HolidayService } from '../../services/holiday.service';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
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
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HolidayCalendarComponent implements OnInit, OnChanges {
  @Input() canton: string = '';
  @Input() year: number = new Date().getFullYear();
  
  @Output() holidayAdded = new EventEmitter<Date>();
  @Output() holidayRemoved = new EventEmitter<Date>();
  
  currentDate = new Date();
  currentMonth: number = this.currentDate.getMonth();
  
  // Track custom and removed holidays in component for display
  customHolidays: Date[] = [];
  removedHolidays: Date[] = [];
  
  calendarDays: CalendarDay[] = [];
  weekDays: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
  
  publicHolidays: any[] = [];

  constructor(private holidayService: HolidayService) { }

  ngOnInit() {
    this.generateCalendarDays();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['canton'] && !changes['canton'].firstChange) || 
        (changes['year'] && !changes['year'].firstChange)) {
      this.loadHolidays();
    }
  }

  loadHolidays() {
    if (this.canton) {
      this.holidayService.getHolidaysForCanton(this.canton, this.year).subscribe(holidays => {
        this.publicHolidays = holidays;
        this.generateCalendarDays();
      });
    } else {
      this.publicHolidays = [];
      this.generateCalendarDays();
    }
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
        const day = daysInPrevMonth - i;
        const date = new Date(this.year, this.currentMonth - 1, day);
        this.addCalendarDay(date, false);
      }
    }
    
    // Add all days in the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(this.year, this.currentMonth, i);
      this.addCalendarDay(date, true);
    }
    
    // Include days from the next month to complete the last week
    // In European format, the last day index is 6 (Sunday)
    const lastDayOfWeek = lastDay.getDay();
    const lastDayEuropeanWeekday = lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1;
    
    if (lastDayEuropeanWeekday < 6) {
      for (let i = 1; i <= 6 - lastDayEuropeanWeekday; i++) {
        const date = new Date(this.year, this.currentMonth + 1, i);
        this.addCalendarDay(date, false);
      }
    }
  }

  addCalendarDay(date: Date, isCurrentMonth: boolean) {
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();
    
    // Check if it's a holiday using the holiday service directly
    const isHoliday = this.holidayService.isPublicHoliday(date, this.canton);
    let holidayName = '';
    
    // Get holiday name if available
    if (isHoliday && this.publicHolidays && this.publicHolidays.length > 0) {
      // Format month and day for comparison
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${month}-${day}`;
      
      const holiday = this.publicHolidays.find(h => {
        // Extract month and day from the holiday date string
        const hDate = new Date(h.date);
        const hMonth = String(hDate.getMonth() + 1).padStart(2, '0');
        const hDay = String(hDate.getDate()).padStart(2, '0');
        const hDateStr = `${hMonth}-${hDay}`;
        
        return hDateStr === dateStr;
      });
      
      if (holiday) {
        holidayName = holiday.name;
      }
    }
    
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
      isCurrentMonth,
      isToday,
      isHoliday: isHoliday && !isRemovedHoliday, // Only count as holiday if not removed
      isCustomHoliday,
      isRemovedHoliday,
      holidayName
    });
  }

  prevMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.year--;
    } else {
      this.currentMonth--;
    }
    this.loadHolidays();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.year++;
    } else {
      this.currentMonth++;
    }
    this.loadHolidays();
  }
  
  // Handle day click for adding/removing holidays
  onDayClick(day: CalendarDay) {
    if (!day.isCurrentMonth) return;
    
    const clickedDate = new Date(day.date);
    
    if (day.isHoliday && !day.isRemovedHoliday) {
      // Remove public holiday
      this.removedHolidays.push(clickedDate);
      this.holidayRemoved.emit(clickedDate);
    } else if (day.isCustomHoliday) {
      // Remove custom holiday
      this.customHolidays = this.customHolidays.filter(d => 
        d.getDate() !== clickedDate.getDate() || 
        d.getMonth() !== clickedDate.getMonth() || 
        d.getFullYear() !== clickedDate.getFullYear()
      );
      this.holidayRemoved.emit(clickedDate);
    } else if (day.isRemovedHoliday) {
      // Restore removed holiday
      this.removedHolidays = this.removedHolidays.filter(d => 
        d.getDate() !== clickedDate.getDate() || 
        d.getMonth() !== clickedDate.getMonth() || 
        d.getFullYear() !== clickedDate.getFullYear()
      );
    } else {
      // Add custom holiday
      this.customHolidays.push(clickedDate);
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
