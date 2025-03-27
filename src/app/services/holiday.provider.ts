import { Injectable } from '@angular/core';

export interface Holiday {
  name: string;
  date: string; // Format: MM-DD
  canton: string;
}

@Injectable({
  providedIn: 'root'
})
export class HolidayProvider {
  
  // Fixed holidays - these occur on the same date every year
  private fixedHolidays: Holiday[] = [
    { "name": "Neujahr", "date": "01-01", "canton": "AG,AR,AI,BL,BS,BE,FR,GE,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TI,TG,UR,VD,VS,ZG,ZH" },
    { "name": "Berchtoldstag", "date": "01-02", "canton": "AG,BE,JU,TG,VD" },
    { "name": "Heilige Drei Könige", "date": "01-06", "canton": "GR,SZ,TI,UR" },
    { "name": "St. Josef", "date": "03-19", "canton": "GR,LU,NW,SZ,TI,UR,VS,ZG" },
    { "name": "Tag der Arbeit", "date": "05-01", "canton": "BL,BS,FR,JU,NE,SH,SO,TI,TG,ZH,Regional" },
    { "name": "Peter und Paul", "date": "06-29", "canton": "GR,LU,Regional,TI" },
    { "name": "Bundesfeier", "date": "08-01", "canton": "all" },
    { "name": "Mariä Himmelfahrt", "date": "08-15", "canton": "AG,AI,FR,GR,NW,OW,SZ,SO,TI,UR,ZG" },
    { "name": "St. Leodegar", "date": "10-02", "canton": "LU" },
    { "name": "Allerheiligen", "date": "11-01", "canton": "AG,AI,FR,GL,GR,JU,LU,NW,OW,SZ,SO,SG,TI,UR,VS,ZG" },
    { "name": "Mariä Empfängnis", "date": "12-08", "canton": "AG,AI,FR,GR,LU,NW,OW,SZ,SO,TI,UR,VS,ZG" },
    { "name": "Weihnachten", "date": "12-25", "canton": "all" },
    { "name": "Stephanstag", "date": "12-26", "canton": "AG,AR,AI,BL,BS,BE,GL,GR,LU,SZ,SO,SG,TI,TG,UR,ZH" }
  ];

  // Local events that are fixed but not official holidays in all cantons
  private localFixedEvents: Holiday[] = [
    { "name": "Sechseläuten", "date": "04-28", "canton": "ZH" }, // Note: This is approximate, as Sechseläuten varies
    { "name": "Genfer Bettag", "date": "09-11", "canton": "GE" }, // Approximate
    { "name": "Knabenschiessen", "date": "09-15", "canton": "ZH" }, // Approximate
    { "name": "Mauritiustag", "date": "09-22", "canton": "AI,LU,Regional,SO" }
  ];

  constructor() {}

  /**
   * Get all holidays for a specific year
   */
  getHolidaysForYear(year: number): Holiday[] {
    // Start with the fixed holidays
    const holidays = [...this.fixedHolidays, ...this.localFixedEvents];
    
    // Add the floating holidays for the given year
    const floatingHolidays = this.calculateFloatingHolidays(year);
    holidays.push(...floatingHolidays);
    
    return holidays;
  }

  /**
   * Calculate floating holidays based on Easter date
   */
  private calculateFloatingHolidays(year: number): Holiday[] {
    const easterDate = this.calculateEasterDate(year);
    const floatingHolidays: Holiday[] = [];
    
    // Good Friday (2 days before Easter)
    const goodFriday = new Date(easterDate);
    goodFriday.setDate(easterDate.getDate() - 2);
    floatingHolidays.push({
      "name": "Karfreitag",
      "date": this.formatDate(goodFriday),
      "canton": "AG,AR,AI,BL,BS,BE,FR,GE,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TG,UR,VD,ZG,ZH"
    });
    
    // Easter Sunday
    floatingHolidays.push({
      "name": "Ostersonntag",
      "date": this.formatDate(easterDate),
      "canton": "all"
    });
    
    // Easter Monday (1 day after Easter)
    const easterMonday = new Date(easterDate);
    easterMonday.setDate(easterDate.getDate() + 1);
    floatingHolidays.push({
      "name": "Ostermontag",
      "date": this.formatDate(easterMonday),
      "canton": "all"
    });
    
    // Ascension Day (39 days after Easter)
    const ascensionDay = new Date(easterDate);
    ascensionDay.setDate(easterDate.getDate() + 39);
    floatingHolidays.push({
      "name": "Auffahrt",
      "date": this.formatDate(ascensionDay),
      "canton": "all"
    });
    
    // Whit Monday / Pentecost Monday (50 days after Easter)
    const whitMonday = new Date(easterDate);
    whitMonday.setDate(easterDate.getDate() + 50);
    floatingHolidays.push({
      "name": "Pfingstmontag",
      "date": this.formatDate(whitMonday),
      "canton": "AG,AR,AI,BL,BS,BE,GE,GL,GR,JU,SH,SZ,SO,SG,TI,TG,UR,VD,ZH"
    });
    
    // Corpus Christi (60 days after Easter)
    const corpusChristi = new Date(easterDate);
    corpusChristi.setDate(easterDate.getDate() + 60);
    floatingHolidays.push({
      "name": "Fronleichnam",
      "date": this.formatDate(corpusChristi),
      "canton": "AG,AI,FR,GR,JU,LU,NW,OW,SZ,SO,TI,UR,VS,ZG,NE"
    });
    
    // Federal Day of Thanksgiving, Repentance and Prayer 
    // (3rd Sunday in September)
    const federalPrayer = this.calculateThirdSundayInSeptember(year);
    floatingHolidays.push({
      "name": "Eidgenössischer Dank-, Buss- und Bettag",
      "date": this.formatDate(federalPrayer),
      "canton": "AG,AR,AI,BL,BS,BE,FR,GL,GR,JU,LU,NE,NW,OW,SH,SZ,SO,SG,TI,TG,UR,VD,VS,ZG,ZH"
    });
    
    return floatingHolidays;
  }

  /**
   * Calculate Easter Sunday date using the Meeus/Jones/Butcher algorithm
   */
  private calculateEasterDate(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-based month
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return new Date(year, month, day);
  }

  /**
   * Calculate the third Sunday in September
   */
  private calculateThirdSundayInSeptember(year: number): Date {
    // Start with September 1
    const date = new Date(year, 8, 1);
    
    // Move to the first Sunday
    while (date.getDay() !== 0) {
      date.setDate(date.getDate() + 1);
    }
    
    // Add 14 days to get to the third Sunday
    date.setDate(date.getDate() + 14);
    
    return date;
  }

  /**
   * Format date as MM-DD string
   */
  private formatDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
  }
}
