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
  start: Date | string;
  end: Date | string;
  daysUsed: number;
  totalDaysOff: number;
  efficiency: number;
  score?: number;
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

  isPublicHoliday(date: Date, canton: string = 'ZH'): boolean {
    // Ensure we're using a Date object
    const checkDate = new Date(date);
    
    // Format month and day for comparison
    const month = String(checkDate.getMonth() + 1).padStart(2, '0');
    const day = String(checkDate.getDate()).padStart(2, '0');
    const dateStr = `${month}-${day}`;
    
    // Debug output to verify date format
    // console.log(`Checking if ${checkDate.toDateString()} (${dateStr}) is a holiday in ${canton}`);
    
    // Find any holiday matching the date and canton
    const isHoliday = this.holidays.some(holiday => {
      // Check if the holiday is for all cantons or the specified canton
      const cantonMatch = holiday.canton === 'all' || 
                        holiday.canton.split(',').includes(canton);
      
      // Match the date string
      return holiday.date === dateStr && cantonMatch;
    });
    
    // Debug output to verify result
    // if (isHoliday) console.log(`${checkDate.toDateString()} is a holiday!`);
    
    return isHoliday;
  }

  getHolidaysForCanton(canton: string, year: number): Observable<any[]> {
    // Filter holidays relevant to the canton
    const cantonHolidays = this.holidays.filter(holiday => 
      holiday.canton === 'all' || 
      holiday.canton.split(',').includes(canton)
    );
    
    // Convert to full dates with the given year
    const holidaysWithFullDates = cantonHolidays.map(holiday => {
      const [month, day] = holiday.date.split('-').map(Number);
      return {
        ...holiday,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      };
    });
    
    return of(holidaysWithFullDates);
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
        const periodsToEvaluate = this.findPotentialVacationPeriods(holidayDates, year, availableDays, canton);
        
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

  private findPotentialVacationPeriods(holidays: Date[], year: number, maxDaysToUse: number, canton: string = 'ZH'): VacationPeriod[] {
    const periods: VacationPeriod[] = [];
    
    // First add full work weeks (Monday-Friday)
    const fullWeeks = this.findFullWorkWeeks(year, maxDaysToUse, canton);
    periods.push(...fullWeeks);
    
    // Get all public holidays and weekends in the year
    const daysOff: Date[] = [...holidays];
    
    // Only consider periods in the selected year
    const startDate = new Date(year, 0, 1);  // January 1st of selected year
    const endDate = new Date(year, 11, 31);  // December 31st of selected year
    
    // Generate potential periods around each holiday with higher priority
    for (const holiday of holidays) {
      // Skip holidays not in the selected year
      if (holiday.getFullYear() !== year) continue;
      
      // Look at periods starting up to 7 days before the holiday
      for (let startOffset = -7; startOffset <= 0; startOffset++) {
        // Look at periods ending up to 7 days after the holiday
        for (let endOffset = 0; endOffset <= 7; endOffset++) {
          // Skip trivial cases
          if (startOffset === 0 && endOffset === 0) continue;
          
          const periodStart = new Date(holiday);
          periodStart.setDate(holiday.getDate() + startOffset);
          
          const periodEnd = new Date(holiday);
          periodEnd.setDate(holiday.getDate() + endOffset);
          
          // Skip periods that are too long for available days
          const businessDays = this.countBusinessDays(periodStart, periodEnd, canton);
          if (businessDays > maxDaysToUse) continue;
          
          // Calculate how many days would be taken off
          const vacationDaysUsed = this.countVacationDays(periodStart, periodEnd, holidays);
          if (vacationDaysUsed === 0 || vacationDaysUsed > maxDaysToUse) continue;
          
          // Calculate total consecutive days off
          const totalDaysOff = this.daysBetween(periodStart, periodEnd) + 1;
          
          // Calculate efficiency (days off per vacation day)
          const efficiency = totalDaysOff / vacationDaysUsed;
          
          // Check if it's a full Monday-Friday work week
          const isFullWeek = this.isCompleteWorkWeek(periodStart, periodEnd);
          
          // Calculate score with bonuses for holiday periods and complete weeks
          const holidayBonus = 0.5; // Bonus for including holidays
          const fullWeekBonus = isFullWeek ? 0.7 : 0; // Extra bonus for complete weeks
          const score = efficiency + holidayBonus + fullWeekBonus;
          
          periods.push({
            start: new Date(periodStart),
            end: new Date(periodEnd),
            daysUsed: vacationDaysUsed,
            totalDaysOff,
            efficiency,
            score
          });
        }
      }
    }
    
    // Also consider bridge days (connecting weekends)
    // For each week, try to bridge between two weekends
    // Use the existing weekend surrounding code, but prioritize connecting weekends
    
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    
    // Look for opportunities to connect weekends
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 7)) {
      // Find Monday of the current week
      const monday = new Date(d);
      monday.setDate(d.getDate() + (1 + 7 - d.getDay()) % 7);
      
      // Find Friday of the current week
      const friday = new Date(d);
      friday.setDate(d.getDate() + (5 + 7 - d.getDay()) % 7);
      
      // For a full work week (Monday to Friday)
      const periodStart = new Date(monday);
      const periodEnd = new Date(friday);
      
      // Calculate metrics
      const businessDays = this.countBusinessDays(periodStart, periodEnd, canton);
      if (businessDays > maxDaysToUse) continue;
      
      const vacationDaysUsed = this.countVacationDays(periodStart, periodEnd, holidays);
      if (vacationDaysUsed === 0 || vacationDaysUsed > maxDaysToUse) continue;
      
      // 9 days total (5 workdays + 2 weekend days before + 2 weekend days after)
      const totalDaysOff = 9;
      
      // Calculate efficiency (days off per vacation day)
      const efficiency = totalDaysOff / vacationDaysUsed;
      
      // Apply a bonus for the full week
      const score = efficiency * 1.2; // 20% bonus
      
      periods.push({
        start: new Date(periodStart),
        end: new Date(periodEnd),
        daysUsed: vacationDaysUsed,
        totalDaysOff,
        efficiency,
        score
      });
    }
    
    return periods;
  }

  private selectOptimalPeriods(candidatePeriods: VacationPeriod[], vacationDaysAvailable: number): VacationPeriod[] {
    if (candidatePeriods.length === 0) return [];
    
    // First, sort by score (which now includes bonuses for holidays and full weeks)
    candidatePeriods.sort((a, b) => (b.score || b.efficiency) - (a.score || a.efficiency));
    
    // Add a flag to track which start/end date combinations we've already selected
    // to avoid duplicates with different internal scores but same date ranges
    const selectedRanges = new Set<string>();
    const selectedPeriods: VacationPeriod[] = [];
    let daysRemaining = vacationDaysAvailable;
    
    // Process periods in order of efficiency
    for (const period of candidatePeriods) {
      // Skip if we've already added this exact date range
      const startDate = period.start instanceof Date 
        ? period.start.toISOString().split('T')[0] 
        : period.start;
      const endDate = period.end instanceof Date 
        ? period.end.toISOString().split('T')[0] 
        : period.end;
      const rangeKey = `${startDate}-${endDate}`;
      
      if (selectedRanges.has(rangeKey)) continue;
      
      // Check if this period overlaps with any already selected periods
      const overlapsWithSelected = selectedPeriods.some(selectedPeriod => {
        // Convert dates to consistent format
        const selectedStart = selectedPeriod.start instanceof Date 
          ? selectedPeriod.start 
          : new Date(selectedPeriod.start);
        const selectedEnd = selectedPeriod.end instanceof Date 
          ? selectedPeriod.end 
          : new Date(selectedPeriod.end);
        
        const currentStart = period.start instanceof Date 
          ? period.start 
          : new Date(period.start);
        const currentEnd = period.end instanceof Date 
          ? period.end 
          : new Date(period.end);
        
        // Check for overlap (if the periods share any days)
        return (
          (currentStart <= selectedEnd && currentEnd >= selectedStart) ||
          (selectedStart <= currentEnd && selectedEnd >= currentStart)
        );
      });
      
      // Skip if there's an overlap
      if (overlapsWithSelected) continue;
      
      // Skip if adding this period would exceed the available days
      if (period.daysUsed > daysRemaining) continue;
      
      // Add this period
      selectedPeriods.push(period);
      selectedRanges.add(rangeKey);
      daysRemaining -= period.daysUsed;
      
      // If we've used all available days, break
      if (daysRemaining <= 0) break;
    }
    
    return selectedPeriods;
  }

  // Helper method to check if a date is in an array
  private isDateInArray(date: Date, dateArray: Date[]): boolean {
    return dateArray.some(d => 
      d.getDate() === date.getDate() && 
      d.getMonth() === date.getMonth() && 
      d.getFullYear() === date.getFullYear()
    );
  }

  // Calculate days between two dates
  private daysBetween(start: Date | string, end: Date | string): number {
    // Convert to Date objects if needed
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    
    // Calculate days between dates
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    return Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay));
  }

  private countBusinessDays(start: Date, end: Date, canton: string = 'ZH'): number {
    let count = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      if (!this.isWeekend(currentDate) && !this.isPublicHoliday(currentDate, canton)) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }

  // Public method for checking if a date is a weekend (Sat/Sun)
  public isWeekend(date: Date | string): boolean {
    const checkDate = date instanceof Date ? date : new Date(date);
    const day = checkDate.getDay();
    // 0 is Sunday, 6 is Saturday
    return day === 0 || day === 6;
  }

  // Public method for counting vacation days
  public countVacationDays(start: Date | string, end: Date | string, holidays: Date[]): number {
    // Convert to Date objects if needed
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    
    let count = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Only count weekdays that are not holidays
      if (!this.isWeekend(currentDate) && !this.isDateInArray(currentDate, holidays)) {
        count++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }

  // Add a method to score vacation period candidates
  private scoreVacationPeriod(start: Date, end: Date, canton: string): number {
    let score = 0;
    
    // Calculate base score (days off per vacation day)
    const totalDaysOff = this.countDays(start, end);
    const businessDays = this.countBusinessDays(start, end, canton);
    const efficiency = totalDaysOff / businessDays;
    
    // Base score is the efficiency
    score = efficiency;
    
    const isCompleteWeek = this.isCompleteWorkWeek(start, end);
    if (isCompleteWeek) {
      // Boost score for complete weeks
      score += 0.5; // Add significant bonus for complete weeks
    }
    
    // Additional score for periods with holidays
    const holidaysInPeriod = this.countHolidaysInPeriod(start, end, canton);
    if (holidaysInPeriod > 0) {
      score += 0.3 * holidaysInPeriod; // Bonus for each holiday
    }
    
    return score;
  }

  // Check if a period is a complete work week (Monday to Friday)
  private isCompleteWorkWeek(start: Date | string, end: Date | string): boolean {
    // Convert to Date objects if needed
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    
    // For a complete work week:
    // 1. Start date should be a Monday (day 1)
    // 2. End date should be a Friday (day 5)
    // 3. The period should span exactly 5 business days
    return startDate.getDay() === 1 && 
           endDate.getDay() === 5 && 
        this.daysBetween(startDate, endDate) === 4;
  }

  // Count business days without considering holidays
  public countBusinessDaysWithoutHolidays(start: Date, end: Date): number {
    let count = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      if (!this.isWeekend(currentDate)) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }

  // Count holidays in a period
  private countHolidaysInPeriod(start: Date, end: Date, canton: string): number {
    let count = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      if (!this.isWeekend(currentDate) && this.isPublicHoliday(currentDate, canton)) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }

  findOptimalVacationPeriods(
    year: number, 
    vacationDaysAvailable: number, 
    canton: string
  ): Observable<any> {
    // Generate all possible periods
    const candidatePeriods: any[] = [];
    
    // Start by finding periods around public holidays
    const holidayPeriods = this.findPeriodsAroundHolidays(year, canton);
    candidatePeriods.push(...holidayPeriods);
    
    const completeWeekPeriods = this.findCompleteWorkWeeks(year, canton, vacationDaysAvailable);
    candidatePeriods.push(...completeWeekPeriods);
    
    // Finally, add other candidate periods
    const otherPeriods = this.generateCandidatePeriods(year, canton);
    candidatePeriods.push(...otherPeriods);
    
    // Remove duplicates and sort by efficiency
    const uniquePeriods = this.removeDuplicatePeriods(candidatePeriods);
    
    // Sort by our new scoring system
    uniquePeriods.sort((a, b) => b.score - a.score);
    
    // Choose optimal periods
    const optimalPeriods = this.selectOptimalPeriods(
      uniquePeriods,
      vacationDaysAvailable
    );
    
    return of({
      totalDaysOff: optimalPeriods.reduce((sum, p) => sum + p.totalDaysOff, 0),
      daysUsed: optimalPeriods.reduce((sum, p) => sum + p.daysUsed, 0),
      suggestedPeriods: optimalPeriods,
      year: year,
      canton: canton
    });
  }

  // Find periods around public holidays
  private findPeriodsAroundHolidays(year: number, canton: string): any[] {
    const periods: any[] = [];
    const holidays = this.getPublicHolidaysForYear(year, canton);
    
    holidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      
      // Skip weekends
      if (this.isWeekend(holidayDate)) return;
      
      // Try different period lengths around the holiday
      [-4, -3, -2, -1, 0, 1, 2, 3, 4].forEach(offset => {
        if (offset === 0) return; // Skip just the holiday itself
        
        // Create a period starting or ending with the holiday
        let start, end;
        
        if (offset < 0) {
          // Period ending with the holiday
          start = new Date(holidayDate);
          start.setDate(start.getDate() + offset);
          end = new Date(holidayDate);
        } else {
          // Period starting with the holiday
          start = new Date(holidayDate);
          end = new Date(holidayDate);
          end.setDate(end.getDate() + offset);
        }
        
        // Calculate details for this period
        const totalDaysOff = this.countDays(start, end);
        const businessDays = this.countBusinessDays(start, end, canton);
        const daysUsed = businessDays - this.countHolidaysInPeriod(start, end, canton);
        const efficiency = totalDaysOff / daysUsed;
        const score = this.scoreVacationPeriod(start, end, canton);
        
        periods.push({
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          totalDaysOff,
          daysUsed,
          efficiency,
          score
        });
      });
    });
    
    return periods;
  }

  // Find complete work weeks
  private findCompleteWorkWeeks(year: number, canton: string, maxDaysToUse: number): any[] {
    const periods: any[] = [];
    
    // For each month
    for (let month = 0; month < 12; month++) {
      // Get the first day of the month
      const firstDay = new Date(year, month, 1);
      
      // Find all Mondays in this month
      for (let day = 1; day <= 31; day++) {
        const date = new Date(year, month, day);
        
        // Stop if we're in the next month
        if (date.getMonth() !== month) break;
        
        // Check if it's a Monday
        if (date.getDay() === 1) {
          // Create a period from Monday to Friday
          const start = new Date(date);
          const end = new Date(date);
          end.setDate(end.getDate() + 4); // Friday
          
          // Calculate details for this period
          const totalDaysOff = this.countDays(start, end);
          const businessDays = this.countBusinessDays(start, end, canton);
          const holidaysInPeriod = this.countHolidaysInPeriod(start, end, canton);
          const vacationDaysNeeded = businessDays - holidaysInPeriod;
          
          // Only consider weeks where we need to use vacation days
          if (vacationDaysNeeded > 0 && vacationDaysNeeded <= maxDaysToUse) {
            // Calculate true time off (including weekends before and after)
            const extendedStart = new Date(start);
            extendedStart.setDate(extendedStart.getDate() - 2); // Include weekend before
            
            const extendedEnd = new Date(end);
            extendedEnd.setDate(extendedEnd.getDate() + 2); // Include weekend after
            
            const totalDaysOff = this.daysBetween(extendedStart, extendedEnd) + 1;
            const efficiency = totalDaysOff / vacationDaysNeeded;
            
            // Apply month diversity bonus to avoid clustering
            const monthIndex = start.getMonth();
            const monthDiversityBonus = this.calculateMonthDiversityBonus(monthIndex);
            
            // Apply holidays bonus (more holidays = better deal)
            const holidayBonus = holidaysInPeriod * 0.3;
            
            // Calculate final score with all bonuses
            const score = efficiency + 0.5 + holidayBonus + monthDiversityBonus;
            
            periods.push({
              start: new Date(start),
              end: new Date(end),
              daysUsed: vacationDaysNeeded,
              totalDaysOff,
              efficiency,
              score
            });
          }
        }
      }
    }
    
    return periods;
  }

  // Remove duplicate periods
  private removeDuplicatePeriods(periods: any[]): any[] {
    const uniquePeriods: any[] = [];
    const seen = new Set();
    
    periods.forEach(period => {
      const key = `${period.start}-${period.end}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePeriods.push(period);
      }
    });
    
    return uniquePeriods;
  }

  // Add the missing countDays method
  private countDays(start: Date, end: Date): number {
    // Count total calendar days (including weekends and holidays)
    const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
    return Math.round(Math.abs((end.getTime() - start.getTime()) / oneDay)) + 1; // +1 to include both start and end dates
  }

  // Get holidays in a range (for component's description)
  public getHolidaysInRange(start: Date | string, end: Date | string, canton: string = 'ZH'): any[] {
    // Convert to Date objects if needed
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    
    const result = [];
    const currentDate = new Date(startDate);
    
    // Loop through each day in the range
    while (currentDate <= endDate) {
      if (this.isPublicHoliday(currentDate, canton)) {
        // Format month and day for comparison
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${month}-${day}`;
        
        // Find the holiday name
        const holiday = this.holidays.find(h => 
          h.date === dateStr && 
          (h.canton === 'all' || h.canton.split(',').includes(canton))
        );
        
        if (holiday) {
          result.push({
            name: holiday.name,
            date: new Date(currentDate)
          });
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return result;
  }

  // Add method to get public holidays for a year
  private getPublicHolidaysForYear(year: number, canton: string): any[] {
    // Get all holidays for the given canton and year
    const result: any[] = [];
    
    this.holidays.forEach(holiday => {
      if (holiday.canton === 'all' || holiday.canton.split(',').includes(canton)) {
        const [month, day] = holiday.date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        result.push({
          date: date,
          name: holiday.name,
          canton: holiday.canton
        });
      }
    });
    
    return result;
  }

  // Generate candidate periods of various lengths
  private generateCandidatePeriods(year: number, canton: string): any[] {
    const periods: any[] = [];
    
    // Generate candidate periods of various lengths throughout the year
    for (let month = 0; month < 12; month++) {
      for (let day = 1; day <= 28; day += 7) { // Start from different days
        for (let length = 2; length <= 5; length++) { // Try different lengths
          const start = new Date(year, month, day);
          const end = new Date(year, month, day + length - 1);
          
          // Skip periods that span more than one month
          if (end.getMonth() !== month) continue;
          
          // Calculate efficiency
          const totalDaysOff = this.countDays(start, end);
          const businessDays = this.countBusinessDays(start, end, canton);
          const daysUsed = businessDays - this.countHolidaysInPeriod(start, end, canton);
          const efficiency = totalDaysOff / daysUsed;
          const score = this.scoreVacationPeriod(start, end, canton);
          
          periods.push({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
            totalDaysOff,
            daysUsed,
            efficiency,
            score
          });
        }
      }
    }
    
    return periods;
  }

  // Enhanced findFullWorkWeeks method with better scoring
  private findFullWorkWeeks(year: number, maxDaysToUse: number, canton: string): VacationPeriod[] {
    const periods: VacationPeriod[] = [];
    
    // Generate full Monday-Friday work weeks for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Find all Mondays in the year
    const currentDate = new Date(startDate);
    
    // Move to the first Monday of the year
    while (currentDate.getDay() !== 1) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Generate all Monday-Friday periods
    while (currentDate < endDate) {
      // Monday is the start date
      const weekStart = new Date(currentDate);
      
      // Friday is 4 days after Monday
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 4);
      
      // Count business days that aren't holidays
      const businessDays = this.countBusinessDays(weekStart, weekEnd, canton);
      const holidaysInPeriod = this.countHolidaysInPeriod(weekStart, weekEnd, canton);
      const vacationDaysNeeded = businessDays - holidaysInPeriod;
      
      // Only consider weeks where we need to use vacation days
      if (vacationDaysNeeded > 0 && vacationDaysNeeded <= maxDaysToUse) {
        // Calculate true time off (including weekends before and after)
        const extendedStart = new Date(weekStart);
        extendedStart.setDate(extendedStart.getDate() - 2); // Include weekend before
        
        const extendedEnd = new Date(weekEnd);
        extendedEnd.setDate(extendedEnd.getDate() + 2); // Include weekend after
        
        const totalDaysOff = this.daysBetween(extendedStart, extendedEnd) + 1;
        const efficiency = totalDaysOff / vacationDaysNeeded;
        
        // Apply month diversity bonus to avoid clustering
        const monthIndex = weekStart.getMonth();
        const monthDiversityBonus = this.calculateMonthDiversityBonus(monthIndex);
        
        // Apply holidays bonus (more holidays = better deal)
        const holidayBonus = holidaysInPeriod * 0.3;
        
        // Calculate final score with all bonuses
        const score = efficiency + 0.5 + holidayBonus + monthDiversityBonus;
        
        periods.push({
          start: new Date(weekStart),
          end: new Date(weekEnd),
          daysUsed: vacationDaysNeeded,
          totalDaysOff,
          efficiency,
          score
        });
      }
      
      // Move to next Monday
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return periods;
  }

  // New method to calculate month diversity bonus
  private calculateMonthDiversityBonus(monthIndex: number): number {
    // Encourage diversity by giving bonuses to summer/winter months
    // This helps avoid clustering in January
    if (monthIndex >= 5 && monthIndex <= 8) { // June-September (summer)
      return 0.4;
    } else if (monthIndex >= 11 || monthIndex <= 1) { // December-February (winter)
      return 0.3;
    } else if (monthIndex >= 3 && monthIndex <= 4) { // April-May (spring)
      return 0.2;
    } else {
      return 0.1;
    }
  }
} 