import { Injectable } from '@angular/core';
import { LoggingService } from './logging.service';

export interface Holiday {
  name: string;
  date: string; // Format: MM-DD or YYYY-MM-DD 
  canton: string;
  fullDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HolidayProvider {
  
  // Static holiday data by year
  private holidayData: Record<number, Holiday[]> = {
    // 2024 holidays
    2024: [
      { "name": "Neujahr", "date": "2024-01-01", "canton": "all" },
      { "name": "Berchtoldstag", "date": "2024-01-02", "canton": "AG,BE,JU,TG,VD" },
      { "name": "Heilige Drei Könige", "date": "2024-01-06", "canton": "GR,SZ,TI,UR" },
      { "name": "Karfreitag", "date": "2024-03-29", "canton": "AG,AR,AI,BL,BS,BE,FR,GE,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TG,UR,VD,ZG,ZH" },
      { "name": "Ostersonntag", "date": "2024-03-31", "canton": "all" },
      { "name": "Ostermontag", "date": "2024-04-01", "canton": "all" },
      { "name": "Tag der Arbeit", "date": "2024-05-01", "canton": "BL,BS,FR,JU,NE,SH,SO,TI,TG,ZH,Regional" },
      { "name": "Auffahrt", "date": "2024-05-09", "canton": "all" },
      { "name": "Pfingstmontag", "date": "2024-05-20", "canton": "AG,AR,AI,BL,BS,BE,GE,GL,GR,JU,SH,SZ,SO,SG,TI,TG,UR,VD,ZH" },
      { "name": "Fronleichnam", "date": "2024-05-30", "canton": "AG,AI,FR,GR,JU,LU,NW,OW,SZ,SO,TI,UR,VS,ZG,NE" },
      { "name": "St. Josef", "date": "2024-03-19", "canton": "GR,LU,NW,SZ,TI,UR,VS,ZG" },
      { "name": "Peter und Paul", "date": "2024-06-29", "canton": "GR,LU,Regional,TI" },
      { "name": "Bundesfeier", "date": "2024-08-01", "canton": "all" },
      { "name": "Mariä Himmelfahrt", "date": "2024-08-15", "canton": "AG,AI,FR,GR,NW,OW,SZ,SO,TI,UR,ZG" },
      { "name": "Eidgenössischer Dank-, Buss- und Bettag", "date": "2024-09-15", "canton": "AG,AR,AI,BL,BS,BE,FR,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TI,TG,UR,VD,VS,ZG,ZH" },
      { "name": "St. Leodegar", "date": "2024-10-02", "canton": "LU" },
      { "name": "Allerheiligen", "date": "2024-11-01", "canton": "AG,AI,FR,GL,GR,JU,LU,NW,OW,SZ,SO,SG,TI,UR,VS,ZG" },
      { "name": "Mariä Empfängnis", "date": "2024-12-08", "canton": "AG,AI,FR,GR,LU,NW,OW,SZ,SO,TI,UR,VS,ZG" },
      { "name": "Weihnachten", "date": "2024-12-25", "canton": "all" },
      { "name": "Stephanstag", "date": "2024-12-26", "canton": "AG,AR,AI,BL,BS,BE,GL,GR,LU,SZ,SO,SG,TI,TG,UR,ZH" }
    ],
    
    // 2025 holidays - Updated with your provided data
    2025: [
      { "name": "Neujahr", "date": "2025-01-01", "canton": "AG,AR,AI,BL,BS,BE,FR,GE,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TI,TG,UR,VD,VS,ZG,ZH" },
      { "name": "Berchtoldstag", "date": "2025-01-02", "canton": "AG,BE,JU,TG,VD" },
      { "name": "Heilige Drei Könige", "date": "2025-01-06", "canton": "GR,SZ,TI,UR" },
      { "name": "St. Josef", "date": "2025-03-19", "canton": "GR,LU,NW,SZ,TI,UR,VS,ZG" },
      { "name": "Karfreitag", "date": "2025-04-18", "canton": "AG,AR,AI,BL,BS,BE,FR,GE,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TG,UR,VD,ZG,ZH" },
      { "name": "Ostersonntag", "date": "2025-04-20", "canton": "all" },
      { "name": "Ostermontag", "date": "2025-04-21", "canton": "all" },
      { "name": "Sechseläuten", "date": "2025-04-28", "canton": "ZH" },
      { "name": "Tag der Arbeit", "date": "2025-05-01", "canton": "BL,BS,FR,JU,NE,SH,SO,TI,TG,ZH,Regional" },
      { "name": "Auffahrt", "date": "2025-05-29", "canton": "all" },
      { "name": "Pfingstmontag", "date": "2025-06-09", "canton": "AG,AR,AI,BL,BS,BE,GE,GL,GR,JU,SH,SZ,SO,SG,TI,TG,UR,VD,ZH" },
      { "name": "Fronleichnam", "date": "2025-06-19", "canton": "AG,AI,FR,GR,JU,LU,NW,OW,SZ,SO,TI,UR,VS,ZG,NE" },
      { "name": "Peter und Paul", "date": "2025-06-29", "canton": "GR,LU,Regional,TI" },
      { "name": "Bundesfeier", "date": "2025-08-01", "canton": "all" },
      { "name": "Mariä Himmelfahrt", "date": "2025-08-15", "canton": "AG,AI,FR,GR,NW,OW,SZ,SO,TI,UR,ZG" },
      { "name": "Genfer Bettag", "date": "2025-09-11", "canton": "GE" },
      { "name": "Knabenschiessen", "date": "2025-09-15", "canton": "ZH" },
      { "name": "Eidgenössischer Dank-, Buss- und Bettag", "date": "2025-09-21", "canton": "AG,AR,AI,BL,BS,BE,FR,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TI,TG,UR,VD,VS,ZG,ZH" },
      { "name": "Mauritiustag", "date": "2025-09-22", "canton": "AI,LU,Regional,SO" },
      { "name": "St. Leodegar", "date": "2025-10-02", "canton": "LU" },
      { "name": "Allerheiligen", "date": "2025-11-01", "canton": "AG,AI,FR,GL,GR,JU,LU,NW,OW,SZ,SO,SG,TI,UR,VS,ZG" },
      { "name": "Mariä Empfängnis", "date": "2025-12-08", "canton": "AG,AI,FR,GR,LU,NW,OW,SZ,SO,TI,UR,VS,ZG" },
      { "name": "Weihnachten", "date": "2025-12-25", "canton": "all" },
      { "name": "Stephanstag", "date": "2025-12-26", "canton": "AG,AR,AI,BL,BS,BE,GL,GR,LU,SZ,SO,SG,TI,TG,UR,ZH" }
    ],
    
    // 2026 holidays - Added based on your provided data
    2026: [
      { "name": "Neujahr", "date": "2026-01-01", "canton": "AG,AR,AI,BL,BS,BE,FR,GE,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TI,TG,UR,VD,VS,ZG,ZH" },
      { "name": "Berchtoldstag", "date": "2026-01-02", "canton": "AG,BE,JU,TG,VD" },
      { "name": "Heilige Drei Könige", "date": "2026-01-06", "canton": "GR,SZ,TI,UR" },
      { "name": "St. Josef", "date": "2026-03-19", "canton": "GR,LU,NW,SZ,TI,UR,VS,ZG" },
      { "name": "Karfreitag", "date": "2026-04-03", "canton": "AG,AR,AI,BL,BS,BE,FR,GE,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TG,UR,VD,ZG,ZH" },
      { "name": "Ostersonntag", "date": "2026-04-05", "canton": "all" },
      { "name": "Ostermontag", "date": "2026-04-06", "canton": "all" },
      { "name": "Sechseläuten", "date": "2026-04-20", "canton": "ZH" },
      { "name": "Tag der Arbeit", "date": "2026-05-01", "canton": "BL,BS,FR,JU,NE,SH,SO,TI,TG,ZH,Regional" },
      { "name": "Auffahrt", "date": "2026-05-14", "canton": "all" },
      { "name": "Pfingstmontag", "date": "2026-05-25", "canton": "AG,AR,AI,BL,BS,BE,GE,GL,GR,JU,SH,SZ,SO,SG,TI,TG,UR,VD,ZH" },
      { "name": "Fronleichnam", "date": "2026-06-04", "canton": "AG,AI,FR,GR,JU,LU,NW,OW,SZ,SO,TI,UR,VS,ZG,NE" },
      { "name": "Peter und Paul", "date": "2026-06-29", "canton": "GR,LU,Regional,TI" },
      { "name": "Bundesfeier", "date": "2026-08-01", "canton": "all" },
      { "name": "Mariä Himmelfahrt", "date": "2026-08-15", "canton": "AG,AI,FR,GR,NW,OW,SZ,SO,TI,UR,ZG" },
      { "name": "Genfer Bettag", "date": "2026-09-10", "canton": "GE" },
      { "name": "Knabenschiessen", "date": "2026-09-14", "canton": "ZH" },
      { "name": "Eidgenössischer Dank-, Buss- und Bettag", "date": "2026-09-20", "canton": "AG,AR,AI,BL,BS,BE,FR,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TI,TG,UR,VD,VS,ZG,ZH" },
      { "name": "Mauritiustag", "date": "2026-09-22", "canton": "AI,LU,Regional,SO" },
      { "name": "St. Leodegar", "date": "2026-10-02", "canton": "LU" },
      { "name": "Allerheiligen", "date": "2026-11-01", "canton": "AG,AI,FR,GL,GR,JU,LU,NW,OW,SZ,SO,SG,TI,UR,VS,ZG" },
      { "name": "Mariä Empfängnis", "date": "2026-12-08", "canton": "AG,AI,FR,GR,LU,NW,OW,SZ,SO,TI,UR,VS,ZG" },
      { "name": "Weihnachten", "date": "2026-12-25", "canton": "all" },
      { "name": "Stephanstag", "date": "2026-12-26", "canton": "AG,AR,AI,BL,BS,BE,GL,GR,LU,SZ,SO,SG,TI,TG,UR,ZH" }
    ],
    
    // 2027 holidays - Added based on your provided data
    2027: [
      { "name": "Neujahr", "date": "2027-01-01", "canton": "AG,AR,AI,BL,BS,BE,FR,GE,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TI,TG,UR,VD,VS,ZG,ZH" },
      { "name": "Berchtoldstag", "date": "2027-01-02", "canton": "AG,BE,JU,TG,VD" },
      { "name": "Heilige Drei Könige", "date": "2027-01-06", "canton": "GR,SZ,TI,UR" },
      { "name": "St. Josef", "date": "2027-03-19", "canton": "GR,LU,NW,SZ,TI,UR,VS,ZG" },
      { "name": "Karfreitag", "date": "2027-03-26", "canton": "AG,AR,AI,BL,BS,BE,FR,GE,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TG,UR,VD,ZG,ZH" },
      { "name": "Ostersonntag", "date": "2027-03-28", "canton": "all" },
      { "name": "Ostermontag", "date": "2027-03-29", "canton": "all" },
      { "name": "Sechseläuten", "date": "2027-04-19", "canton": "ZH" },
      { "name": "Tag der Arbeit", "date": "2027-05-01", "canton": "BL,BS,FR,JU,NE,SH,SO,TI,TG,ZH,Regional" },
      { "name": "Auffahrt", "date": "2027-05-06", "canton": "all" },
      { "name": "Pfingstmontag", "date": "2027-05-17", "canton": "AG,AR,AI,BL,BS,BE,GE,GL,GR,JU,SH,SZ,SO,SG,TI,TG,UR,VD,ZH" },
      { "name": "Fronleichnam", "date": "2027-05-27", "canton": "AG,AI,FR,GR,JU,LU,NW,OW,SZ,SO,TI,UR,VS,ZG,NE" },
      { "name": "Peter und Paul", "date": "2027-06-29", "canton": "GR,LU,Regional,TI" },
      { "name": "Bundesfeier", "date": "2027-08-01", "canton": "all" },
      { "name": "Mariä Himmelfahrt", "date": "2027-08-15", "canton": "AG,AI,FR,GR,NW,OW,SZ,SO,TI,UR,ZG" },
      { "name": "Genfer Bettag", "date": "2027-09-09", "canton": "GE" },
      { "name": "Knabenschiessen", "date": "2027-09-13", "canton": "ZH" },
      { "name": "Eidgenössischer Dank-, Buss- und Bettag", "date": "2027-09-19", "canton": "AG,AR,AI,BL,BS,BE,FR,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TI,TG,UR,VD,VS,ZG,ZH" },
      { "name": "Mauritiustag", "date": "2027-09-22", "canton": "AI,LU,Regional,SO" },
      { "name": "St. Leodegar", "date": "2027-10-02", "canton": "LU" },
      { "name": "Allerheiligen", "date": "2027-11-01", "canton": "AG,AI,FR,GL,GR,JU,LU,NW,OW,SZ,SO,SG,TI,UR,VS,ZG" },
      { "name": "Mariä Empfängnis", "date": "2027-12-08", "canton": "AG,AI,FR,GR,LU,NW,OW,SZ,SO,TI,UR,VS,ZG" },
      { "name": "Weihnachten", "date": "2027-12-25", "canton": "all" },
      { "name": "Stephanstag", "date": "2027-12-26", "canton": "AG,AR,AI,BL,BS,BE,GL,GR,LU,SZ,SO,SG,TI,TG,UR,ZH" }
    ]
  };

  constructor(private loggingService: LoggingService) { }

  /**
   * Get all holidays for a specific year from static data
   */
  getHolidaysForYear(year: number): Holiday[] {
    // Check if we have data for this year
    if (this.holidayData[year]) {
      // Return a deep copy to prevent accidental mutations
      const holidays = JSON.parse(JSON.stringify(this.holidayData[year]));
      
      // Ensure all dates have consistent format for the CORRECT YEAR
      holidays.forEach((holiday: Holiday) => {
        // Split the date and reconstruct in consistent format
        if (holiday.date.includes('-')) {
          const dateParts = holiday.date.split('-');
          if (dateParts.length === 3) {
            // Store the original full date
            holiday.fullDate = holiday.date;
            // Use MM-DD format for simpler comparison but keep the YEAR info associated
            holiday.date = `${dateParts[1]}-${dateParts[2]}`;
          }
        }
      });
      
      return holidays;
    }
    
    // If no data found, generate fallback data for common holidays
    return this.getFallbackHolidays(year);
  }

  /**
   * Add new holidays for a specific year
   */
  addHolidaysForYear(year: number, holidays: Holiday[]): void {
    this.holidayData[year] = holidays;
  }

  /**
   * Import holiday data from JSON
   */
  importHolidays(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      // Check if the data is in the expected format
      if (typeof data === 'object') {
        // If it's an object with years as keys
        Object.keys(data).forEach(yearStr => {
          const year = parseInt(yearStr);
          if (!isNaN(year) && Array.isArray(data[year])) {
            this.holidayData[year] = data[year];
          }
        });
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if holidays exist for a specific year
   */
  hasHolidaysForYear(year: number): boolean {
    return !!this.holidayData[year] && this.holidayData[year].length > 0;
  }

  /**
   * Get fallback holidays for a year when no data exists
   */
  getFallbackHolidays(year: number): Holiday[] {
    // Create basic holidays that occur on the same date every year
    return [
      { name: "Neujahr", date: "01-01", canton: "all", fullDate: `${year}-01-01` },
      { name: "Berchtoldstag", date: "01-02", canton: "AG,BE,JU,TG,VD", fullDate: `${year}-01-02` },
      { name: "Heilige Drei Könige", date: "01-06", canton: "GR,SZ,TI,UR", fullDate: `${year}-01-06` },
      { name: "Tag der Arbeit", date: "05-01", canton: "BL,BS,FR,JU,NE,SH,SO,TI,TG,ZH,Regional", fullDate: `${year}-05-01` },
      { name: "Bundesfeier", date: "08-01", canton: "all", fullDate: `${year}-08-01` },
      { name: "Weihnachten", date: "12-25", canton: "all", fullDate: `${year}-12-25` },
      { name: "Stephanstag", date: "12-26", canton: "AG,AR,AI,BL,BS,BE,GL,GR,LU,SZ,SO,SG,TI,TG,UR,ZH", fullDate: `${year}-12-26` }
    ];
  }
}
