import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { HolidayProvider } from './holiday.provider';

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
  // Will be populated dynamically
  private holidays: Holiday[] = [];
  // Cache for holidays by year
  private holidayCache = new Map<number, Holiday[]>();

  constructor(
    @Optional() private http: HttpClient,
    private holidayProvider: HolidayProvider
  ) {
    const currentYear = new Date().getFullYear();
    console.log(`[HolidayService] Initializing service with current year: ${currentYear}`);
    
    // Initialize with current year's holidays
    this.loadHolidays(currentYear);
    
    // Also pre-load next year's holidays (often needed for planning)
    this.loadHolidays(currentYear + 1);
  }

  // Load holidays for a specific year
  private loadHolidays(year: number): void {
    console.log(`[HolidayService] Loading holidays for year ${year} from provider`);
    
    // Get holidays from the provider
    const holidays = this.holidayProvider.getHolidaysForYear(year);
    
    // Store them in cache
    this.holidayCache.set(year, holidays);
    
    // Set the current working set of holidays
    this.holidays = holidays;
    
    // THIS IS THE CRITICAL PART - Add debug logs to see what's being loaded
    console.log(`[HolidayService] Loaded ${holidays.length} holidays for ${year}:`, 
      holidays.map(h => `${h.name}: ${h.date} (canton: ${h.canton})`));
  }

  // When checking if a date is a holiday, make sure to load that year's holidays
  isPublicHoliday(date: Date, canton: string = 'ZH'): boolean {
    // First check if it's a weekend
    if (this.isWeekend(date)) {
      console.log(`[HolidayService] ${date.toISOString().split('T')[0]} is a weekend, not counted as holiday`);
      return false;
    }
    
    // Make sure the holidays for this year are loaded
    const year = date.getFullYear();
    console.log(`[HolidayService] Checking if ${date.toISOString().split('T')[0]} is a holiday in ${canton}`);
    
    if (!this.holidayCache.has(year)) {
      console.log(`[HolidayService] Loading holidays for year ${year} during isPublicHoliday check`);
      this.loadHolidays(year);
    }
    
    // IMPORTANT: Use the cached holidays for the SPECIFIC YEAR, not the general holidays array
    const yearHolidays = this.holidayCache.get(year) || [];
    
    // Format month and day for comparison
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Check if the formatted date directly matches or if we have a full date match
    const dateStr = `${month}-${day}`;
    const fullDateStr = `${year}-${month}-${day}`;
    
    // Debug log to see what we're comparing
    console.log(`[HolidayService] Looking for ${dateStr} or ${fullDateStr} in year ${year} holidays (${yearHolidays.length} entries)`);
    
    // Find any holiday matching the date and canton
    const isHoliday = yearHolidays.some(holiday => {
      // Check if the holiday is for all cantons or the specified canton
      const cantonMatch = holiday.canton === 'all' || 
                        holiday.canton.split(',').includes(canton);
      
      // Check for both formats: MM-DD or YYYY-MM-DD
      const dateMatch = (holiday.date === dateStr || holiday.date === fullDateStr) && cantonMatch;
      
      if (dateMatch) {
        console.log(`[HolidayService] ✓ MATCH: ${holiday.name} (${holiday.date})`);
      }
      
      return dateMatch;
    });
    
    console.log(`[HolidayService] ${date.toISOString().split('T')[0]} is ${isHoliday ? '' : 'not '}a holiday in ${canton}`);
    return isHoliday;
  }

  // Similarly, update getHolidaysForCanton to ensure we have the right year's data
  getHolidaysForCanton(canton: string, year: number): Observable<any[]> {
    // Make sure the holidays for this year are loaded
    if (!this.holidayCache.has(year)) {
      this.loadHolidays(year);
    }
    
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
    console.log('------- VACATION OPTIMIZER INPUT -------');
    console.log(`Canton: ${canton}, Available Days: ${availableDays}, Year: ${year}`);
    console.log(`Custom Holidays: ${customHolidays.length}, Removed Holidays: ${removedHolidays.length}`);
    console.log('Removed Holidays:', removedHolidays.map(d => d.toISOString().split('T')[0])); // Log for debugging
    
    return this.getHolidaysForCanton(canton, year).pipe(
      map(holidays => {
        console.log(`Holidays for canton ${canton}: `, holidays);
        
        // Convert holidays to Date objects
        let holidayDates = holidays.map(h => {
          const [y, m, d] = h.date.split('-').map(Number);
          return new Date(y, m - 1, d);
        });
        
        // Add custom holidays
        holidayDates = [...holidayDates, ...customHolidays];
        
        // More stringent check for removed holidays
        holidayDates = holidayDates.filter(holiday => {
          const holidayString = holiday.toISOString().split('T')[0];
          return !removedHolidays.some(removed => {
            const removedString = removed.toISOString().split('T')[0];
            return removedString === holidayString;
          });
        });
        
        console.log(`Total holidays after customization: ${holidayDates.length}`);
        console.log('Remaining holidays:', holidayDates.map(d => d.toISOString().split('T')[0])); // Log for debugging
        
        // Find potential vacation periods
        const periodsToEvaluate = this.findPotentialVacationPeriods(holidayDates, year, availableDays, canton, removedHolidays);
        
        console.log(`Number of candidate periods generated: ${periodsToEvaluate.length}`);
        
        // Sort by score instead of efficiency
        periodsToEvaluate.sort((a, b) => (b.score || b.efficiency) - (a.score || a.efficiency));
        
        // Take top periods that don't exceed available days
        const optimalPeriods = this.selectOptimalPeriods(periodsToEvaluate, availableDays);
        
        // Process the periods to add additional properties for UI display
        const processedPeriods = optimalPeriods.map(period => {
          // Create a new object with just the weekdays for actual vacation
          const actualStartDate = period.start instanceof Date ? period.start : new Date(period.start);
          const actualEndDate = period.end instanceof Date ? period.end : new Date(period.end);
          
          // Calculate the expanded period (including weekends) for "total days off" display
          const expandedStartDate = new Date(actualStartDate);
          const expandedEndDate = new Date(actualEndDate);
          
          // If the start day is Monday, include the weekend before
          if (actualStartDate.getDay() === 1) { // Monday
            expandedStartDate.setDate(expandedStartDate.getDate() - 2); // Include weekend before
          }
          
          // If the end day is Friday, include the weekend after
          if (actualEndDate.getDay() === 5) { // Friday
            expandedEndDate.setDate(expandedEndDate.getDate() + 2); // Include weekend after
          }
          
          return {
            ...period,
            // Keep the actual vacation dates (typically weekdays only)
            start: actualStartDate,
            end: actualEndDate,
            // Add properties for the expanded period with weekends if needed
            fullPeriodStart: expandedStartDate,
            fullPeriodEnd: expandedEndDate
          };
        });
        
        // Calculate total days off
        const totalDaysOff = processedPeriods.reduce((sum, period) => sum + period.totalDaysOff, 0);
        const daysUsed = processedPeriods.reduce((sum, period) => sum + period.daysUsed, 0);
        
        const result = {
          totalDaysOff: totalDaysOff,
          daysUsed: daysUsed,
          suggestedPeriods: processedPeriods
        };
        
        console.log('------- VACATION OPTIMIZER OUTPUT -------');
        console.log(`Total Days Off: ${totalDaysOff}`);
        console.log(`Days Used: ${daysUsed}`);
        console.log(`Number of suggested periods: ${processedPeriods.length}`);
        console.log('Suggested Periods:', JSON.stringify(processedPeriods, null, 2));
        
        return result;
      })
    );
  }

  private findPotentialVacationPeriods(holidays: Date[], year: number, maxDaysToUse: number, canton: string = 'ZH', removedDates: Date[] = []): VacationPeriod[] {
    console.log('------- FINDING POTENTIAL VACATION PERIODS -------');
    console.log(`Year: ${year}, Max Days: ${maxDaysToUse}, Canton: ${canton}`);
    console.log(`Number of holidays: ${holidays.length}`);
    
    const periods: VacationPeriod[] = [];
    
    // First prioritize full work weeks (Monday-Friday)
    // Increase priority by finding these first
    const fullWeeks = this.findFullWeekPeriods(year, maxDaysToUse, canton, holidays);
    console.log(`Generated ${fullWeeks.length} full work week periods`);
    periods.push(...fullWeeks);
    
    // Then find bridge periods around holidays
    const bridgePeriods = this.findBridgePeriods(holidays, year, maxDaysToUse, canton);
    console.log(`Generated ${bridgePeriods.length} bridge periods around holidays`);
    periods.push(...bridgePeriods);
    
    // Add extended weekend periods (connecting multiple weekends)
    const extendedWeekends = this.findExtendedWeekendPeriods(year, maxDaysToUse, canton, holidays);
    console.log(`Generated ${extendedWeekends.length} extended weekend periods`);
    periods.push(...extendedWeekends);
    
    // Add weekend-to-weekend bridge periods (strategic periods connecting two weekends)
    const weekendBridges = this.findWeekendBridgePeriods(year, maxDaysToUse, canton);
    console.log(`Generated ${weekendBridges.length} weekend-to-weekend bridge periods`);
    periods.push(...weekendBridges);
    
    console.log(`Total number of potential periods: ${periods.length}`);
    
    // Ensure all periods are within the specified year
    const withinYearPeriods = periods.filter(period => {
      const startDate = period.start instanceof Date ? period.start : new Date(period.start);
      const endDate = period.end instanceof Date ? period.end : new Date(period.end);
      return startDate.getFullYear() === year && endDate.getFullYear() === year;
    });
    
    console.log(`After filtering by year ${year}: ${withinYearPeriods.length} periods`);
    
    // Remove duplicates
    const uniquePeriods = this.removeDuplicatePeriods(withinYearPeriods);
    console.log(`After removing duplicates: ${uniquePeriods.length} periods`);
    
    // After generating all periods, filter out any that include removed dates
    const filteredPeriods = uniquePeriods.filter(period => {
      // Check if this period contains any removed date
      const start = period.start instanceof Date ? period.start : new Date(period.start);
      const end = period.end instanceof Date ? period.end : new Date(period.end);
      
      // Check each day in the period
      const currentDate = new Date(start);
      while (currentDate <= end) {
        // Is this date in the removed dates?
        const matchesRemovedDate = removedDates.some(removedDate => 
          this.isSameDay(currentDate, removedDate)
        );
        
        if (matchesRemovedDate) {
          return false; // Filter out this period
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return true; // Keep this period
    });
    
    console.log(`After removing periods with excluded dates: ${filteredPeriods.length} periods`);
    
    return filteredPeriods;
  }

  // Modify the full week periods finder to give higher priority to weeks with holidays
  private findFullWeekPeriods(year: number, maxDaysToUse: number, canton: string, holidays: Date[]): VacationPeriod[] {
    const periods: VacationPeriod[] = [];
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    
    // Iterate through each Monday of the year
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      // Skip if not Monday
      if (d.getDay() !== 1) continue;
      
      const monday = new Date(d);
      const friday = new Date(d);
      friday.setDate(friday.getDate() + 4); // Friday is 4 days after Monday
      
      // Calculate vacation days needed (business days minus holidays)
      const holidaysInWeek = this.countHolidaysInPeriod(monday, friday, canton);
      const vacationDaysNeeded = 5 - holidaysInWeek; // 5 business days in a week
      
      // Skip if we need too many vacation days or none at all
      if (vacationDaysNeeded <= 0 || vacationDaysNeeded > maxDaysToUse) continue;
      
      // Calculate total consecutive days off (including weekends before and after)
      const weekendBefore = new Date(monday);
      weekendBefore.setDate(weekendBefore.getDate() - 2); // Saturday before
      
      const weekendAfter = new Date(friday);
      weekendAfter.setDate(weekendAfter.getDate() + 2); // Sunday after
      
      const totalDaysOff = this.daysBetween(weekendBefore, weekendAfter) + 1;
      const efficiency = totalDaysOff / vacationDaysNeeded;
      
      // Calculate score with bonuses
      const monthBonus = this.calculateMonthDiversityBonus(monday.getMonth());
      // INCREASE the holiday bonus significantly to prioritize weeks with holidays
      const holidayBonus = holidaysInWeek > 0 ? holidaysInWeek * 3.0 : 0;
      const score = efficiency + monthBonus + holidayBonus + 2.0; // +2.0 bonus for complete weeks (increased)
      
      periods.push({
        // IMPORTANT: Only include the actual vacation period (Monday-Friday)
        // not the surrounding weekends in the date range
        start: new Date(monday),
        end: new Date(friday),
        daysUsed: vacationDaysNeeded,
        totalDaysOff,
        efficiency,
        score
      });
    }
    
    return periods;
  }

  // New helper method to find bridge periods around holidays
  private findBridgePeriods(holidays: Date[], year: number, maxDaysToUse: number, canton: string): VacationPeriod[] {
    const periods: VacationPeriod[] = [];
    
    // For each holiday, look for bridge opportunities
    for (const holiday of holidays) {
      // Skip holidays that fall on weekends
      if (this.isWeekend(holiday)) continue;
      
      // Skip holidays not in the selected year
      if (holiday.getFullYear() !== year) continue;
      
      const day = holiday.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      
      // Different bridge strategies based on day of the week
      
      // Case 1: Holiday on Tuesday - bridge Monday
      if (day === 2) {
        const start = new Date(holiday);
        start.setDate(start.getDate() - 3); // Start from Saturday
        const end = new Date(holiday);
        
        // Check if Monday is already a holiday
        const monday = new Date(holiday);
        monday.setDate(monday.getDate() - 1);
        
        if (!this.isPublicHoliday(monday, canton)) {
          const vacationDaysNeeded = 1; // Just Monday
          
          if (vacationDaysNeeded <= maxDaysToUse) {
            const totalDaysOff = 4; // Saturday through Tuesday
            const efficiency = totalDaysOff / vacationDaysNeeded;
            const score = efficiency + this.calculateMonthDiversityBonus(holiday.getMonth()) + 1.5;
            
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
      
      // Case 2: Holiday on Thursday - bridge Friday
      if (day === 4) {
        const start = new Date(holiday);
        const end = new Date(holiday);
        end.setDate(end.getDate() + 3); // End on Sunday
        
        // Check if Friday is already a holiday
        const friday = new Date(holiday);
        friday.setDate(friday.getDate() + 1);
        
        if (!this.isPublicHoliday(friday, canton)) {
          const vacationDaysNeeded = 1; // Just Friday
          
          if (vacationDaysNeeded <= maxDaysToUse) {
            const totalDaysOff = 4; // Thursday through Sunday
            const efficiency = totalDaysOff / vacationDaysNeeded;
            const score = efficiency + this.calculateMonthDiversityBonus(holiday.getMonth()) + 1.5;
            
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
      
      // Case 3: Holiday on Wednesday - bridge to make a full week
      if (day === 3) {
        // Option A: Bridge Monday and Tuesday
        const startA = new Date(holiday);
        startA.setDate(startA.getDate() - 4); // Start from Saturday
        const endA = new Date(holiday);
        
        // Check how many days we need to bridge
        const monday = new Date(holiday);
        monday.setDate(monday.getDate() - 2);
        const tuesday = new Date(holiday);
        tuesday.setDate(tuesday.getDate() - 1);
        
        let vacationDaysNeededA = 0;
        if (!this.isPublicHoliday(monday, canton)) vacationDaysNeededA++;
        if (!this.isPublicHoliday(tuesday, canton)) vacationDaysNeededA++;
        
        if (vacationDaysNeededA > 0 && vacationDaysNeededA <= maxDaysToUse) {
          const totalDaysOff = 5; // Saturday through Wednesday
          const efficiency = totalDaysOff / vacationDaysNeededA;
          const score = efficiency + this.calculateMonthDiversityBonus(holiday.getMonth()) + 1.2;
          
          periods.push({
            start: new Date(startA),
            end: new Date(endA),
            daysUsed: vacationDaysNeededA,
            totalDaysOff,
            efficiency,
            score
          });
        }
        
        // Option B: Bridge Thursday and Friday
        const startB = new Date(holiday);
        const endB = new Date(holiday);
        endB.setDate(endB.getDate() + 4); // End on Sunday
        
        const thursday = new Date(holiday);
        thursday.setDate(thursday.getDate() + 1);
        const friday = new Date(holiday);
        friday.setDate(friday.getDate() + 2);
        
        let vacationDaysNeededB = 0;
        if (!this.isPublicHoliday(thursday, canton)) vacationDaysNeededB++;
        if (!this.isPublicHoliday(friday, canton)) vacationDaysNeededB++;
        
        if (vacationDaysNeededB > 0 && vacationDaysNeededB <= maxDaysToUse) {
          const totalDaysOff = 5; // Wednesday through Sunday
          const efficiency = totalDaysOff / vacationDaysNeededB;
          const score = efficiency + this.calculateMonthDiversityBonus(holiday.getMonth()) + 1.2;
          
          periods.push({
            start: new Date(startB),
            end: new Date(endB),
            daysUsed: vacationDaysNeededB,
            totalDaysOff,
            efficiency,
            score
          });
        }
        
        // Option C: Bridge the whole week if we have enough days
        const startC = new Date(holiday);
        startC.setDate(startC.getDate() - 4); // Start from Saturday before
        const endC = new Date(holiday);
        endC.setDate(endC.getDate() + 4); // End on Sunday after
        
        // Count all vacation days needed for the full week
        let vacationDaysNeededC = 0;
        for (let i = -2; i <= 2; i++) {
          if (i === 0) continue; // Skip the holiday itself
          
          const checkDay = new Date(holiday);
          checkDay.setDate(checkDay.getDate() + i);
          
          if (!this.isWeekend(checkDay) && !this.isPublicHoliday(checkDay, canton)) {
            vacationDaysNeededC++;
          }
        }
        
        if (vacationDaysNeededC > 0 && vacationDaysNeededC <= maxDaysToUse) {
          const totalDaysOff = 9; // Full 9-day period including weekends
          const efficiency = totalDaysOff / vacationDaysNeededC;
          const score = efficiency + this.calculateMonthDiversityBonus(holiday.getMonth()) + 2.0;
          
          periods.push({
            start: new Date(startC),
            end: new Date(endC),
            daysUsed: vacationDaysNeededC,
            totalDaysOff,
            efficiency,
            score
          });
        }
      }
      
      // Case 4: Holiday on Monday - create a 4-day weekend
      if (day === 1) {
        const start = new Date(holiday);
        start.setDate(start.getDate() - 2); // Start from Saturday
        const end = new Date(holiday);
        
        // No vacation days needed, already a 3-day weekend
        // But we can extend by taking Tuesday-Friday
        for (let additionalDays = 1; additionalDays <= 4; additionalDays++) {
          if (additionalDays > maxDaysToUse) break;
          
          const extendedEnd = new Date(holiday);
          extendedEnd.setDate(extendedEnd.getDate() + additionalDays);
          
          // Count how many vacation days we actually need (some might be holidays)
          let actualVacationDays = 0;
          for (let i = 1; i <= additionalDays; i++) {
            const checkDay = new Date(holiday);
            checkDay.setDate(checkDay.getDate() + i);
            
            if (!this.isWeekend(checkDay) && !this.isPublicHoliday(checkDay, canton)) {
              actualVacationDays++;
            }
          }
          
          if (actualVacationDays > 0) {
            const totalDaysOff = 3 + additionalDays; // 3-day weekend + additional days
            const efficiency = totalDaysOff / actualVacationDays;
            const score = efficiency + this.calculateMonthDiversityBonus(holiday.getMonth()) + 1.0;
            
            periods.push({
              start: new Date(start),
              end: new Date(extendedEnd),
              daysUsed: actualVacationDays,
              totalDaysOff,
              efficiency,
              score
            });
          }
        }
      }
      
      // Case 5: Holiday on Friday - create a 4-day weekend
      if (day === 5) {
        const start = new Date(holiday);
        const end = new Date(holiday);
        end.setDate(end.getDate() + 2); // End on Sunday
        
        // No vacation days needed, already a 3-day weekend
        // But we can extend by taking Monday-Thursday before
        for (let additionalDays = 1; additionalDays <= 4; additionalDays++) {
          if (additionalDays > maxDaysToUse) break;
          
          const extendedStart = new Date(holiday);
          extendedStart.setDate(extendedStart.getDate() - additionalDays);
          
          // Count how many vacation days we actually need (some might be holidays)
          let actualVacationDays = 0;
          for (let i = 1; i <= additionalDays; i++) {
            const checkDay = new Date(holiday);
            checkDay.setDate(checkDay.getDate() - i);
            
            if (!this.isWeekend(checkDay) && !this.isPublicHoliday(checkDay, canton)) {
              actualVacationDays++;
            }
          }
          
          if (actualVacationDays > 0) {
            const totalDaysOff = 3 + additionalDays; // 3-day weekend + additional days
            const efficiency = totalDaysOff / actualVacationDays;
            const score = efficiency + this.calculateMonthDiversityBonus(holiday.getMonth()) + 1.0;
            
            periods.push({
              start: new Date(extendedStart),
              end: new Date(end),
              daysUsed: actualVacationDays,
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

  // New helper method to find extended weekend periods
  private findExtendedWeekendPeriods(year: number, maxDaysToUse: number, canton: string, holidays: Date[]): VacationPeriod[] {
    const periods: VacationPeriod[] = [];
    
    // Start searching from the beginning of the year
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    
    // Focus on generating better Monday-Friday periods
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      // Look specifically for Mondays to create perfect Monday-Friday spans
      if (d.getDay() === 1) { // Monday
        const monday = new Date(d);
        const friday = new Date(d);
        friday.setDate(friday.getDate() + 4); // Friday
        
        // Skip if this period extends beyond year boundary
        if (friday.getFullYear() > year) continue;
        
        // Count vacation days needed (account for holidays)
        let vacationDaysNeeded = 0;
        for (let i = 0; i < 5; i++) { // Monday through Friday
          const checkDay = new Date(monday);
          checkDay.setDate(checkDay.getDate() + i);
          
          if (!this.isPublicHoliday(checkDay, canton)) {
            vacationDaysNeeded++;
          }
        }
        
        // Skip if we need too many days or no days at all
        if (vacationDaysNeeded <= 0 || vacationDaysNeeded > maxDaysToUse) continue;
        
        // Calculate total days off (including both weekends)
        const saturdayBefore = new Date(monday);
        saturdayBefore.setDate(saturdayBefore.getDate() - 2);
        
        const sundayAfter = new Date(friday);
        sundayAfter.setDate(sundayAfter.getDate() + 2);
        
        const totalDaysOff = this.daysBetween(saturdayBefore, sundayAfter) + 1; // 9 days for a full period
        const efficiency = totalDaysOff / vacationDaysNeeded;
        
        // Higher score for periods that include holidays
        const holidaysInPeriod = this.countHolidaysInPeriod(monday, friday, canton);
        const monthBonus = this.calculateMonthDiversityBonus(monday.getMonth());
        
        // Give a massive bonus to full-week periods (Monday-Friday) with high efficiency
        const weekBonus = 3.0; // Significant bonus for connecting two weekends with a full week
        const holidayBonus = holidaysInPeriod * 2.5;
        const score = efficiency + monthBonus + weekBonus + holidayBonus;
        
        periods.push({
          start: new Date(monday), // Monday
          end: new Date(friday),   // Friday
          daysUsed: vacationDaysNeeded,
          totalDaysOff,
          efficiency,
          score
        });
      }
    }
    
    // Add some shorter but still valuable periods (3-4 days)
    // ... existing code for other types of periods ...
    
    return periods;
  }

  // Add a new method to find strategic periods connecting two weekends
  private findWeekendBridgePeriods(year: number, maxDaysToUse: number, canton: string): VacationPeriod[] {
    const periods: VacationPeriod[] = [];
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    
    // We want to find Monday-to-Friday spans (5 working days)
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      // Skip if not Monday
      if (d.getDay() !== 1) continue;
      
      // This is a Monday - check for a full week to the next Friday
      const monday = new Date(d);
      const friday = new Date(d);
      friday.setDate(friday.getDate() + 4); // Friday is 4 days after Monday
      
      // Skip if this span goes beyond the year
      if (friday.getFullYear() > year) continue;
      
      // Calculate vacation days needed (account for holidays)
      const holidaysInPeriod = this.countHolidaysInPeriod(monday, friday, canton);
      const vacationDaysNeeded = 5 - holidaysInPeriod;
      
      // Skip if we need too many vacation days or none at all
      if (vacationDaysNeeded <= 0 || vacationDaysNeeded > maxDaysToUse) continue;
      
      // Calculate total consecutive days off (including weekends before and after)
      const saturdayBefore = new Date(monday);
      saturdayBefore.setDate(saturdayBefore.getDate() - 2); // Saturday before
      
      const sundayAfter = new Date(friday);
      sundayAfter.setDate(sundayAfter.getDate() + 2); // Sunday after
      
      // Only include if both weekends are within the year
      if (saturdayBefore.getFullYear() < year || sundayAfter.getFullYear() > year) continue;
      
      const totalDaysOff = this.daysBetween(saturdayBefore, sundayAfter) + 1;
      const efficiency = totalDaysOff / vacationDaysNeeded;
      
      // Calculate score with bonuses
      const monthBonus = this.calculateMonthDiversityBonus(monday.getMonth());
      const holidayBonus = holidaysInPeriod > 0 ? holidaysInPeriod * 2.0 : 0;
      const bridgeBonus = 2.0; // Strong bonus for connecting two weekends
      const score = efficiency + monthBonus + holidayBonus + bridgeBonus;
      
      periods.push({
        start: new Date(saturdayBefore), // Include weekend before
        end: new Date(sundayAfter),     // Include weekend after
        daysUsed: vacationDaysNeeded,
        totalDaysOff,
        efficiency,
        score
      });
    }
    
    return periods;
  }

  // Remove duplicate periods - improved version that handles both use cases
  private removeDuplicatePeriods(periods: any[]): any[] {
    const uniquePeriods: any[] = [];
    const seen = new Set<string>();
    
    periods.forEach(period => {
      // Convert dates to ISO strings for comparison
      const startStr = period.start instanceof Date 
        ? period.start.toISOString().split('T')[0] 
        : period.start;
      const endStr = period.end instanceof Date 
        ? period.end.toISOString().split('T')[0] 
        : period.end;
      
      const key = `${startStr}-${endStr}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniquePeriods.push(period);
      } else {
        // If we already have this period, keep the one with the higher score
        const existingIndex = uniquePeriods.findIndex(p => {
          const pStartStr = p.start instanceof Date 
            ? p.start.toISOString().split('T')[0] 
            : p.start;
          const pEndStr = p.end instanceof Date 
            ? p.end.toISOString().split('T')[0] 
            : p.end;
          
          return `${pStartStr}-${pEndStr}` === key;
        });
        
        if (existingIndex >= 0 && (period.score || period.efficiency) > (uniquePeriods[existingIndex].score || uniquePeriods[existingIndex].efficiency)) {
          uniquePeriods[existingIndex] = period;
        }
      }
    });
    
    return uniquePeriods;
  }

  // Modify the selectOptimalPeriods function to prioritize full weeks with holidays
  private selectOptimalPeriods(candidatePeriods: VacationPeriod[], vacationDaysAvailable: number): VacationPeriod[] {
    console.log('------- SELECTING OPTIMAL PERIODS -------');
    console.log(`Candidate periods: ${candidatePeriods.length}, Days available: ${vacationDaysAvailable}`);
    
    if (candidatePeriods.length === 0) return [];
    
    // Categorize periods by type for better prioritization
    // First, identify full weeks with holidays (highest priority)
    const fullWeeksWithHolidays = candidatePeriods.filter(period => {
      if (period.start instanceof Date && period.end instanceof Date) {
        const start = period.start;
        const end = period.end;
        const daysBetween = this.daysBetween(start, end);
        const isCompleteWorkWeek = this.isCompleteWorkWeek(start, end);
        const holidaysCount = this.countHolidaysInPeriod(start, end, 'ZH');
        return isCompleteWorkWeek && holidaysCount > 0;
      }
      return false;
    });
    
    // Regular full work weeks without holidays
    const fullWeekPeriods = candidatePeriods.filter(period => 
      period.start instanceof Date && 
      period.end instanceof Date && 
      this.isCompleteWorkWeek(period.start, period.end) &&
      !fullWeeksWithHolidays.includes(period)
    );
    
    // Then find bridge periods around holidays
    const bridgePeriods = candidatePeriods.filter(period => {
      // Check if this period contains a holiday but is not a full week
      if (period.start instanceof Date && period.end instanceof Date) {
        const start = period.start;
        const end = period.end;
        const canton = 'ZH'; // Default to ZH, but ideally this would be passed in
        return this.countHolidaysInPeriod(start, end, canton) > 0 && 
               !this.isCompleteWorkWeek(start, end);
      }
      return false;
    });
    
    const weekendBridgePeriods = candidatePeriods.filter(period => {
      if (period.start instanceof Date && period.end instanceof Date) {
        const daysBetween = this.daysBetween(period.start, period.end);
        // Weekend bridges are typically 9 days (2 weekends + 5 weekdays)
        return daysBetween >= 8 && daysBetween <= 10 && 
               this.countHolidaysInPeriod(period.start, period.end, 'ZH') === 0;
      }
      return false;
    });
    
    const extendedWeekendPeriods = candidatePeriods.filter(period => {
      if (period.start instanceof Date && period.end instanceof Date) {
        const start = period.start;
        const end = period.end;
        const canton = 'ZH'; // Default to ZH
        const daysBetween = this.daysBetween(start, end);
        return this.countHolidaysInPeriod(start, end, canton) === 0 && 
               !this.isCompleteWorkWeek(start, end) &&
               daysBetween < 8 && daysBetween > 3; // Short periods that aren't full weeks
      }
      return false;
    });
    
    const otherPeriods = candidatePeriods.filter(period => 
      !fullWeeksWithHolidays.includes(period) &&
      !fullWeekPeriods.includes(period) && 
      !bridgePeriods.includes(period) && 
      !weekendBridgePeriods.includes(period) &&
      !extendedWeekendPeriods.includes(period)
    );
    
    // Sort each category by score
    const sortByScore = (a: VacationPeriod, b: VacationPeriod) => 
      (b.score || b.efficiency) - (a.score || a.efficiency);
    
    fullWeeksWithHolidays.sort(sortByScore);
    fullWeekPeriods.sort(sortByScore);
    bridgePeriods.sort(sortByScore);
    weekendBridgePeriods.sort(sortByScore);
    extendedWeekendPeriods.sort(sortByScore);
    otherPeriods.sort(sortByScore);
    
    // Combine, prioritizing by category
    const sortedPeriods = [
      ...fullWeeksWithHolidays,    // NEW: First priority: full weeks with holidays
      ...bridgePeriods,            // Second priority: periods with holidays
      ...fullWeekPeriods,          // Third priority: full weeks without holidays
      ...weekendBridgePeriods,     // Fourth priority: weekend bridges
      ...extendedWeekendPeriods,   // Fifth priority: extended weekends
      ...otherPeriods              // Last priority: other periods
    ];
    
    // Track selected periods and maintain month distribution
    const selectedRanges = new Set<string>();
    const selectedPeriods: VacationPeriod[] = [];
    let daysRemaining = vacationDaysAvailable;
    
    // Track months to ensure distribution
    const monthsUsed = new Map<number, number>(); // Map to count periods per month
    
    // Process periods in order of priority
    for (const period of sortedPeriods) {
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
      
      // Get the month of this period
      const periodMonth = period.start instanceof Date 
        ? period.start.getMonth() 
        : new Date(period.start).getMonth();
      
      // Count how many periods we already have in this month
      const monthCount = monthsUsed.get(periodMonth) || 0;
      
      // Determine if this is an exceptional deal
      const isExceptionalDeal = 
        (period.efficiency > 4) || // High efficiency
        (period.start instanceof Date && 
         period.end instanceof Date && 
         this.countHolidaysInPeriod(period.start, period.end, 'ZH') > 1) || // Multiple holidays
        this.isCompleteWorkWeek(
          period.start instanceof Date ? period.start : new Date(period.start), 
          period.end instanceof Date ? period.end : new Date(period.end)
        ); // Full week
      
      // Skip if we already have too many periods in this month and it's not exceptional
      // The more months we've used, the stricter we get about adding more to the same month
      const maximumPeriodsPerMonth = monthsUsed.size <= 3 ? 2 : 1;
      
      if (monthCount >= maximumPeriodsPerMonth && !isExceptionalDeal && monthsUsed.size < 6) {
        continue;
      }
      
      // Skip if adding this period would exceed the available days
      if (period.daysUsed > daysRemaining) continue;
      
      // Add this period
      selectedPeriods.push(period);
      selectedRanges.add(rangeKey);
      monthsUsed.set(periodMonth, monthCount + 1);
      daysRemaining -= period.daysUsed;
      
      // If we've used all available days, break
      if (daysRemaining <= 0) break;
    }
    
    // If we still have days and haven't achieved good distribution, try to add more periods
    if (daysRemaining > 0 && monthsUsed.size < 6) {
      // Find months that we haven't used yet
      const unusedMonths = Array.from({length: 12}, (_, i) => i)
                               .filter(month => !monthsUsed.has(month));
      
      // Look for periods in unused months
      for (const month of unusedMonths) {
        if (daysRemaining <= 0) break;
        
        // Find periods in this month that don't overlap with selected periods
        const periodsInMonth = sortedPeriods.filter(period => {
          const periodMonth = period.start instanceof Date 
            ? period.start.getMonth() 
            : new Date(period.start).getMonth();
          
          return periodMonth === month && period.daysUsed <= daysRemaining;
        });
        
        // Try to add a non-overlapping period
        for (const period of periodsInMonth) {
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
            
            return (
              (currentStart <= selectedEnd && currentEnd >= selectedStart) ||
              (selectedStart <= currentEnd && selectedEnd >= currentStart)
            );
          });
          
          // Skip if there's an overlap
          if (overlapsWithSelected) continue;
          
          // Add this period
          selectedPeriods.push(period);
          selectedRanges.add(rangeKey);
          monthsUsed.set(month, 1);
          daysRemaining -= period.daysUsed;
          
          // Move to the next month once we've added a period from this one
          break;
        }
      }
    }
    
    console.log(`Selected ${selectedPeriods.length} optimal periods across ${monthsUsed.size} months`);
    console.log('Months used:', Array.from(monthsUsed.keys()).map(m => m + 1)); // +1 because months are 0-indexed
    
    return selectedPeriods;
  }

  // Improved month diversity bonus calculation to better distribute vacations
  private calculateMonthDiversityBonus(monthIndex: number): number {
    // More balanced seasonal bonuses to spread vacations throughout the year
    const seasonalBonuses = [
      1.0,  // January - winter
      1.1,  // February - winter
      1.3,  // March - spring
      1.5,  // April - spring (often has Easter holidays)
      1.4,  // May - spring/early summer (often has public holidays)
      1.2,  // June - summer
      1.0,  // July - summer 
      1.0,  // August - summer
      1.3,  // September - fall
      1.2,  // October - fall
      1.1,  // November - winter
      1.0,  // December - winter (common holiday month)
    ];
    
    return seasonalBonuses[monthIndex];
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
    const holidaysInPeriod = this.countHolidaysInPeriod(start, end, canton);
    const vacationDaysNeeded = businessDays - holidaysInPeriod;
    
    // Skip periods that don't need vacation days
    if (vacationDaysNeeded <= 0) return 0;
    
    // Base score is the efficiency (days off per vacation day)
    const efficiency = totalDaysOff / vacationDaysNeeded;
    score = efficiency;
    
    // Check if this is a "bridge" period (contains holidays)
    if (holidaysInPeriod > 0) {
      // Significant bonus for periods with holidays (bridges)
      score += 1.5 * holidaysInPeriod; // Increased from 1.0
    }
    
    // Add a stronger bonus for complete weeks
    const isCompleteWeek = this.isCompleteWorkWeek(start, end);
    if (isCompleteWeek) {
      // Stronger bonus for complete weeks
      score += 1.0; // Increased from 0.2
      
      // Extra bonus for complete weeks that include holidays
      if (holidaysInPeriod > 0) {
        score += 0.5 * holidaysInPeriod;
      }
    }
    
    // Add month diversity bonus
    const monthIndex = start.getMonth();
    score += this.calculateMonthDiversityBonus(monthIndex);
    
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
    
    const completeWeekPeriods = this.findCompleteWorkWeeks(year, vacationDaysAvailable, canton);
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
  private findCompleteWorkWeeks(year: number, maxDaysToUse: number, canton: string): VacationPeriod[] {
    console.log('------- FINDING FULL WORK WEEKS -------');
    console.log(`Year: ${year}, Max Days: ${maxDaysToUse}, Canton: ${canton}`);
    
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
      
      // Count holidays in this period
      const holidaysInPeriod = this.countHolidaysInPeriod(weekStart, weekEnd, canton);
      
      // Consider all weeks, not just those with holidays
      // Count business days that aren't holidays
      const businessDays = this.countBusinessDays(weekStart, weekEnd, canton);
      const vacationDaysNeeded = businessDays - holidaysInPeriod;
      
      // Only consider weeks where we need to use vacation days but not too many
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
        const holidayBonus = holidaysInPeriod > 0 ? holidaysInPeriod * 1.2 : 0; 
        
        // Calculate final score with all bonuses
        const score = efficiency + holidayBonus + monthDiversityBonus;
        
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
    
    console.log(`Generated ${periods.length} full work week periods`);
    return periods;
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

  // Helper to check if two dates represent the same day
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  /**
   * Get holidays for a specific canton and year
   */
  getHolidays(canton: string, year: number): any[] {
    console.log(`[HolidayService] Getting holidays for canton ${canton}, year ${year}`);
    
    // Make sure holidays for this year are loaded
    if (!this.holidayCache.has(year)) {
      console.log(`[HolidayService] Loading holidays for year ${year} in getHolidays`);
      this.loadHolidays(year);
    }
    
    // Get the holidays for this year
    const yearHolidays = this.holidayCache.get(year) || [];
    
    // Add extra verification for correct year
    console.log(`[HolidayService] Using cache for year ${year} with ${yearHolidays.length} entries`);
    
    // Filter for canton-specific holidays and convert to full dates
    const filteredHolidays = yearHolidays
      .filter(holiday => 
        holiday.canton === 'all' || 
        holiday.canton.split(',').includes(canton)
      )
      .map(holiday => {
        const [month, day] = holiday.date.split('-').map(Number);
        
        // Ensure we're using the correct year by creating a date with the specified year
        const holidayDate = new Date(year, month - 1, day);
        
        // Verify the created date has the correct year
        if (holidayDate.getFullYear() !== year) {
          console.warn(`[HolidayService] Date creation issue: Expected year ${year} but got ${holidayDate.getFullYear()} for ${holiday.name}`);
          // Fix the year if needed - important for December/January edge cases
          holidayDate.setFullYear(year);
        }
        
        return {
          name: holiday.name,
          date: holidayDate,
          canton: holiday.canton
        };
      });
    
    console.log(`[HolidayService] Found ${filteredHolidays.length} holidays for canton ${canton}, year ${year}:`,
      filteredHolidays.map(h => `${h.name} (${h.date.toISOString().split('T')[0]})`));
    
    return filteredHolidays;
  }
} 