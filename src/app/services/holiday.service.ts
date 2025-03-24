import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

interface Holiday {
  name: string;
  date: string;
  canton: string;
}

interface VacationPeriod {
  start: Date;
  end: Date;
  daysUsed: number;
  totalDaysOff: number;
  efficiency: number;
}

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  // Swiss cantonal holidays data
  private holidays: Holiday[] = [
    // Example holidays - you'll want to expand this
    { name: 'New Year', date: '01-01', canton: 'all' },
    { name: 'Good Friday', date: '04-07', canton: 'all' },
    { name: 'Easter Monday', date: '04-10', canton: 'all' },
    { name: 'Labor Day', date: '05-01', canton: 'ZH,BS,SH,TG,TI,NE,JU' },
    { name: 'Ascension Day', date: '05-18', canton: 'all' },
    { name: 'Whit Monday', date: '05-29', canton: 'all' },
    { name: 'Swiss National Day', date: '08-01', canton: 'all' },
    { name: 'Christmas', date: '12-25', canton: 'all' },
    { name: 'St Stephen\'s Day', date: '12-26', canton: 'all' }
    // Add more canton-specific holidays
  ];

  constructor(@Optional() private http: HttpClient) {}

  isPublicHoliday(date: Date, canton: string): boolean {
    const dateString = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return this.holidays.some(h => 
      h.date === dateString && 
      (h.canton === 'all' || h.canton.split(',').includes(canton))
    );
  }

  getHolidaysForCanton(canton: string, year: number): Observable<Holiday[]> {
    // Filter holidays for the given canton
    const cantonHolidays = this.holidays.filter(h => 
      h.canton === 'all' || h.canton.split(',').includes(canton)
    );
    
    // Add the year to the date
    const updatedHolidays = cantonHolidays.map(holiday => {
      const [month, day] = holiday.date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      date.setFullYear(year);
      return {
        ...holiday,
        date: date.toISOString().split('T')[0]
      };
    });
    
    return of(updatedHolidays);
  }

  calculateOptimalHolidays(
    canton: string, 
    availableDays: number, 
    year: number = new Date().getFullYear(),
    customHolidays: Date[] = [],
    removedHolidays: Date[] = []
  ): Observable<any> {
    return this.getHolidaysForCanton(canton, year).pipe(
      map(holidays => {
        // Convert holidays to Date objects
        let holidayDates = holidays.map(h => {
          const [y, m, d] = h.date.split('-').map(Number);
          return new Date(y, m - 1, d);
        });
        
        // Add custom holidays
        holidayDates = [...holidayDates, ...customHolidays];
        
        // Remove user-removed holidays
        holidayDates = holidayDates.filter(holiday => 
          !removedHolidays.some(removed => 
            removed.getDate() === holiday.getDate() && 
            removed.getMonth() === holiday.getMonth() && 
            removed.getFullYear() === holiday.getFullYear()
          )
        );
        
        // Find potential vacation periods
        const periodsToEvaluate = this.findPotentialVacationPeriods(holidayDates, year, availableDays);
        
        // Sort by efficiency (days off per vacation day)
        periodsToEvaluate.sort((a, b) => b.efficiency - a.efficiency);
        
        // Take top periods that don't exceed available days
        const optimalPeriods = this.selectOptimalPeriods(periodsToEvaluate, availableDays);
        
        // Calculate total days off
        const totalDaysOff = optimalPeriods.reduce((sum, period) => sum + period.totalDaysOff, 0);
        const daysUsed = optimalPeriods.reduce((sum, period) => sum + period.daysUsed, 0);
        
        return {
          totalDaysOff: totalDaysOff,
          daysUsed: daysUsed,
          suggestedPeriods: optimalPeriods
        };
      })
    );
  }

  private findPotentialVacationPeriods(holidays: Date[], year: number, maxDaysToUse: number): VacationPeriod[] {
    const periods: VacationPeriod[] = [];
    
    // Get all public holidays and weekends in the year
    const daysOff: Date[] = [...holidays];
    
    // Only consider periods in the selected year
    const startDate = new Date(year, 0, 1);  // January 1st of selected year
    const endDate = new Date(year, 11, 31);  // December 31st of selected year
    
    // Generate potential periods around each holiday
    for (const holiday of holidays) {
      // Skip holidays not in the selected year
      if (holiday.getFullYear() !== year) continue;
      
      // Look at periods starting up to 7 days before the holiday
      for (let startOffset = -7; startOffset <= 0; startOffset++) {
        // Look at periods ending up to 7 days after the holiday
        for (let endOffset = 0; endOffset <= 7; endOffset++) {
          // Skip trivial cases
          if (startOffset === 0 && endOffset === 0) continue;
          
          const startDate = new Date(holiday);
          startDate.setDate(holiday.getDate() + startOffset);
          
          const endDate = new Date(holiday);
          endDate.setDate(holiday.getDate() + endOffset);
          
          // Skip periods that are too long for available days
          const businessDays = this.countBusinessDays(startDate, endDate);
          if (businessDays > maxDaysToUse) continue;
          
          // Calculate how many days would be taken off
          const vacationDaysUsed = this.countVacationDays(startDate, endDate, holidays);
          if (vacationDaysUsed === 0 || vacationDaysUsed > maxDaysToUse) continue;
          
          // Calculate total consecutive days off
          const totalDaysOff = this.daysBetween(startDate, endDate) + 1;
          
          // Calculate efficiency (days off per vacation day)
          const efficiency = totalDaysOff / vacationDaysUsed;
          
          periods.push({
            start: new Date(startDate),
            end: new Date(endDate),
            daysUsed: vacationDaysUsed,
            totalDaysOff,
            efficiency
          });
        }
      }
    }
    
    // Also look at periods around weekends
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    
    // For each week of the year
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 7)) {
      // Find Friday
      const friday = new Date(d);
      friday.setDate(d.getDate() + (5 - d.getDay()) % 7);
      
      // Find Monday
      const monday = new Date(d);
      monday.setDate(d.getDate() + (8 - d.getDay()) % 7);
      
      // Check various combinations of days before weekend and after weekend
      for (let beforeDays = 1; beforeDays <= 5; beforeDays++) {
        for (let afterDays = 1; afterDays <= 5; afterDays++) {
          const startDate = new Date(friday);
          startDate.setDate(friday.getDate() - beforeDays + 1);
          
          const endDate = new Date(monday);
          endDate.setDate(monday.getDate() + afterDays - 1);
          
          // Skip trivial cases
          if (beforeDays === 1 && afterDays === 1) continue;
          
          // Skip periods that are too long for available days
          const businessDays = this.countBusinessDays(startDate, endDate);
          if (businessDays > maxDaysToUse) continue;
          
          // Calculate how many days would be taken off
          const vacationDaysUsed = this.countVacationDays(startDate, endDate, holidays);
          if (vacationDaysUsed === 0 || vacationDaysUsed > maxDaysToUse) continue;
          
          // Calculate total consecutive days off
          const totalDaysOff = this.daysBetween(startDate, endDate) + 1;
          
          // Calculate efficiency (days off per vacation day)
          const efficiency = totalDaysOff / vacationDaysUsed;
          
          periods.push({
            start: new Date(startDate),
            end: new Date(endDate),
            daysUsed: vacationDaysUsed,
            totalDaysOff,
            efficiency
          });
        }
      }
    }
    
    return periods;
  }

  private selectOptimalPeriods(periods: VacationPeriod[], maxDaysToUse: number): VacationPeriod[] {
    // Filter out periods outside the target year
    const targetYear = periods.length > 0 ? periods[0].start.getFullYear() : new Date().getFullYear();
    
    periods = periods.filter(period => 
      period.start.getFullYear() === targetYear && 
      period.end.getFullYear() === targetYear
    );
    
    // Sort periods by efficiency (most efficient first)
    periods.sort((a, b) => b.efficiency - a.efficiency);
    
    const selected: VacationPeriod[] = [];
    let daysUsed = 0;
    
    // Greedy algorithm: pick most efficient periods first, until we use all available days
    for (const period of periods) {
      // Check if adding this period would exceed max days
      if (daysUsed + period.daysUsed <= maxDaysToUse) {
        // Check for overlap with already selected periods
        const hasOverlap = selected.some(selectedPeriod => 
          this.periodsOverlap(period, selectedPeriod)
        );
        
        if (!hasOverlap) {
          selected.push(period);
          daysUsed += period.daysUsed;
        }
      }
      
      // Stop once we've used all available days
      if (daysUsed >= maxDaysToUse) break;
    }
    
    return selected;
  }

  private periodsOverlap(a: VacationPeriod, b: VacationPeriod): boolean {
    return a.start <= b.end && b.start <= a.end;
  }

  private daysBetween(start: Date, end: Date): number {
    // Calculate days between two dates (inclusive)
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((end.getTime() - start.getTime()) / oneDay));
  }

  private countBusinessDays(start: Date, end: Date): number {
    // Count business days (excluding weekends)
    let count = 0;
    const curDate = new Date(start);
    
    while (curDate <= end) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      curDate.setDate(curDate.getDate() + 1);
    }
    
    return count;
  }

  private countVacationDays(start: Date, end: Date, holidays: Date[]): number {
    // Count days that need to be taken as vacation days
    let count = 0;
    const curDate = new Date(start);
    
    while (curDate <= end) {
      const dayOfWeek = curDate.getDay();
      
      // If it's a weekday and not a holiday
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !this.isDateInArray(curDate, holidays)) {
        count++;
      }
      
      curDate.setDate(curDate.getDate() + 1);
    }
    
    return count;
  }

  private isDateInArray(date: Date, dateArray: Date[]): boolean {
    return dateArray.some(d => 
      d.getDate() === date.getDate() && 
      d.getMonth() === date.getMonth() && 
      d.getFullYear() === date.getFullYear()
    );
  }
} 