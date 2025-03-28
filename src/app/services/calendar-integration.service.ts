import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class CalendarIntegrationService {

  constructor(
    private http: HttpClient,
    private platform: Platform
  ) { }

  /**
   * Send calendar invitation via email
   * This requires a backend service to send the actual email with calendar attachment
   */
  sendCalendarInvitation(email: string, startDate: Date, endDate: Date, title: string, description: string): Observable<any> {
    // This would typically call your backend API endpoint that handles email sending
    const payload = {
      email,
      event: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        title,
        description
      }
    };
    
    // Replace with your actual API endpoint
    return this.http.post('/api/send-calendar-invitation', payload).pipe(
      catchError(error => {
        console.error('Error sending calendar invitation:', error);
        return of({ success: false, error: 'Failed to send invitation' });
      })
    );
  }

  /**
   * Generate a mailto link with calendar attachment
   * This opens the user's email client with a pre-filled email containing the event
   */
  generateMailtoWithCalendar(email: string, startDate: Date, endDate: Date, title: string, description: string): string {
    // Format dates for iCalendar
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const now = formatDate(new Date());
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    
    // Generate a unique ID for the event
    const eventUID = `vacation-${start}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Create the ICS content
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//VacationOptimizer//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${eventUID}`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    // Base64 encode the ICS content for the mailto link
    const base64ICS = btoa(unescape(encodeURIComponent(icsContent)));
    
    // Create mailto link with attachment
    const subject = encodeURIComponent(`Calendar Invitation: ${title}`);
    const body = encodeURIComponent(`Please find your vacation calendar invitation attached.\n\n${description}`);
    
    return `mailto:${email}?subject=${subject}&body=${body}&attach=data:text/calendar;base64,${base64ICS}`;
  }

  /**
   * Generate Google Calendar event creation URL or deep link
   * This will attempt to open the native app on mobile devices with improved fallback
   */
  generateGoogleCalendarUrl(startDate: Date, endDate: Date, title: string, description: string): string {
    // Format dates for Google Calendar
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\..*\d/g, '');
    };
    
    const start = formatGoogleDate(startDate);
    const end = formatGoogleDate(endDate);
    
    // Create basic params that will be used in all formats
    const baseParams = {
      text: title,
      dates: `${start}/${end}`,
      details: description
    };
    
    // Check if on Android - use web URL with intent fallback which is more reliable
    if (this.platform.is('android')) {
      // Use a standard URL that will either open in browser or trigger intent filter
      const baseUrl = 'https://calendar.google.com/calendar/event';
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        ...baseParams
      });
      
      return `${baseUrl}?${params.toString()}`;
    } 
    // Check if on iOS
    else if (this.platform.is('ios')) {
      // First try the standard URL which works better on iOS
      const baseUrl = 'https://calendar.google.com/calendar/event';
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        ...baseParams
      });
      
      return `${baseUrl}?${params.toString()}`;
    }
    
    // Default to web URL for all other platforms
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      ...baseParams,
      sf: 'true',
      output: 'xml'
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate Outlook calendar event creation URL or deep link
   * Uses Microsoft's updated deep linking endpoint with debug logging
   */
  generateOutlookCalendarUrl(startDate: Date, endDate: Date, title: string, description: string): string {
    // Format dates for Outlook - use UTC ISO format
    const formatOutlookDate = (date: Date) => date.toISOString();
    
    const startFormatted = formatOutlookDate(startDate);
    const endFormatted = formatOutlookDate(endDate);
    
    // Debug flag - set to true to enable detailed logging
    const isDebug = true;
    if (isDebug) console.log('Platform:', this.platform.platforms());
    
    // For mobile platforms, attempt to use the native URI schemes first.
    if (this.platform.is('android')) {
      // Try multiple approaches for Android and log results
      
      if (isDebug) console.log('Trying Outlook deep link for Android');
      
      // Try the direct ms-outlook:// scheme first (newer Outlook versions support this)
      const msOutlookScheme = `ms-outlook://calendar/create?subject=${encodeURIComponent(title)}&starttime=${encodeURIComponent(startFormatted)}&endtime=${encodeURIComponent(endFormatted)}&body=${encodeURIComponent(description)}`;
      
      // Also create outlook:// scheme (older versions)
      const outlookScheme = `outlook://calendar/create?subject=${encodeURIComponent(title)}&starttime=${encodeURIComponent(startFormatted)}&endtime=${encodeURIComponent(endFormatted)}&body=${encodeURIComponent(description)}`;
      
      // Create a fallback intent URI
      const intentUri = `intent://calendar.office.com/#Intent;scheme=https;package=com.microsoft.office.outlook;S.browser_fallback_url=https://outlook.office.com/calendar/action/compose?subject=${encodeURIComponent(title)}&startdt=${encodeURIComponent(startFormatted)}&enddt=${encodeURIComponent(endFormatted)}&body=${encodeURIComponent(description)};end`;
      
      if (isDebug) {
        console.log('MS Outlook URI:', msOutlookScheme);
        console.log('Outlook URI:', outlookScheme);
        console.log('Intent URI:', intentUri);
      }
      
      // Return one of the schemes - we can change which one is used for testing
      // Let's try the ms-outlook scheme first as it's the most modern
      return msOutlookScheme;
    } 
    else if (this.platform.is('ios')) {
      // Debug iOS too
      if (isDebug) console.log('Trying Outlook deep link for iOS');
      
      // Use native iOS scheme for Outlook (use ms-outlook:// for iOS)
      const iosScheme = `ms-outlook://calendar/create?subject=${encodeURIComponent(title)}&starttime=${encodeURIComponent(startFormatted)}&endtime=${encodeURIComponent(endFormatted)}&body=${encodeURIComponent(description)}`;
      
      if (isDebug) console.log('iOS Outlook URI:', iosScheme);
      
      return iosScheme;
    }
    
    // Debug desktop case
    if (isDebug) console.log('Using web URL for Outlook');
    
    // Default web URL for desktop browsers (and as a fallback)
    const baseUrl = 'https://outlook.office.com/calendar/action/compose';
    const params = new URLSearchParams({
      subject: title,
      startdt: startFormatted,
      enddt: endFormatted,
      body: description
    });
    
    const webUrl = `${baseUrl}?${params.toString()}`;
    if (isDebug) console.log('Web URL:', webUrl);
    
    return webUrl;
  }

  /**
   * Generate native iOS calendar event creation URL
   * This will open the built-in Calendar app on iOS devices
   */
  generateNativeIOSCalendarUrl(startDate: Date, endDate: Date, title: string, description: string): string {
    // Format dates for iOS Calendar (RFC5545 format)
    const formatIOSDate = (date: Date) => {
      return date.toISOString().replace(/[-:.]/g, '').substring(0, 15) + 'Z';
    };
    
    const startFormatted = formatIOSDate(startDate);
    const endFormatted = formatIOSDate(endDate);
    
    // iOS Calendar scheme and parameters
    const baseUrl = 'calshow://';
    
    // For adding an event, we use the x-apple-calevent:// scheme
    const eventUrl = `x-apple-calevent://create?title=${encodeURIComponent(title)}&startdate=${startFormatted}&enddate=${endFormatted}&notes=${encodeURIComponent(description)}`;
    
    // Debug flag - set to true to enable detailed logging
    const isDebug = true;
    if (isDebug) console.log('iOS Calendar URL:', eventUrl);
    
    return eventUrl;
  }

  /**
   * Generate the appropriate calendar URL based on platform
   * This is a convenience method for platform-specific calendar integration
   */
  generateCalendarUrl(startDate: Date, endDate: Date, title: string, description: string, type: 'google' | 'outlook' | 'native' = 'native'): string {
    // Use platform detection to determine the best calendar URL to use
    if (type === 'google') {
      return this.generateGoogleCalendarUrl(startDate, endDate, title, description);
    } else if (type === 'outlook') {
      // Try a different approach with Outlook's more modern format
      // Convert dates to a format Outlook prefers - ISO string without timezone offset
      const formatOutlookDate = (date: Date) => {
        // Format as YYYY-MM-DDTHH:MM:SS
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      };
      
      const startFormatted = formatOutlookDate(startDate);
      const endFormatted = formatOutlookDate(endDate);
      
      // Try the newer Office 365 format with deeplink
      const baseUrl = 'https://outlook.office.com/calendar/deeplink/compose';
      const params = new URLSearchParams({
        subject: title,
        body: description,
        startdt: startFormatted,
        enddt: endFormatted,
        // Add allday parameter since we're dealing with vacation days
        allday: 'true',
        path: '/calendar/action/compose',
        rru: 'addevent'
      });
      
      return `${baseUrl}?${params.toString()}`;
    } else if (type === 'native' && this.platform.is('ios')) {
      // Use native iOS calendar for iOS devices
      return this.generateNativeIOSCalendarUrl(startDate, endDate, title, description);
    } else {
      // Fall back to Google Calendar for other platforms
      return this.generateGoogleCalendarUrl(startDate, endDate, title, description);
    }
  }
}
