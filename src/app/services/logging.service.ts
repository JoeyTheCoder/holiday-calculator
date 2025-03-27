import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  private isDebugMode = !environment.production;

  log(source: string, message: string, data?: any): void {
    if (this.isDebugMode) {
      if (data) {
        console.log(`[${source}] ${message}`, data);
      } else {
        console.log(`[${source}] ${message}`);
      }
    }
  }

  warn(source: string, message: string, data?: any): void {
    if (this.isDebugMode) {
      if (data) {
        console.warn(`[${source}] ${message}`, data);
      } else {
        console.warn(`[${source}] ${message}`);
      }
    }
  }

  error(source: string, message: string, data?: any): void {
    // Always log errors, even in production
    if (data) {
      console.error(`[${source}] ${message}`, data);
    } else {
      console.error(`[${source}] ${message}`);
    }
  }
} 