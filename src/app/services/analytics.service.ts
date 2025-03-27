import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private isProduction = environment.production;
  private events: AnalyticsEvent[] = [];

  constructor() {
    // Initialize analytics if needed
    if (this.isProduction) {
      // You would initialize your analytics provider here
      // Example: Google Analytics, Matomo, etc.
      console.log('Analytics service initialized');
    }
  }

  /**
   * Track a user event
   */
  trackEvent(event: AnalyticsEvent): void {
    this.events.push(event);
    
    if (this.isProduction) {
      // Send to your analytics provider
      // Example for Google Analytics:
      // gtag('event', event.action, {
      //   'event_category': event.category,
      //   'event_label': event.label,
      //   'value': event.value
      // });
      
      console.log('Analytics event tracked:', event);
    }
  }

  /**
   * Track page view
   */
  trackPageView(pageName: string): void {
    if (this.isProduction) {
      // Example for Google Analytics:
      // gtag('config', 'YOUR-TRACKING-ID', {
      //   'page_path': pageName
      // });
      
      console.log('Page view tracked:', pageName);
    }
  }

  /**
   * Get all tracked events (for debugging)
   */
  getEvents(): AnalyticsEvent[] {
    return this.events;
  }
} 