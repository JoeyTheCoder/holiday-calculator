import { Component } from '@angular/core';

interface CalendarEvent {
  title: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
}

interface Calendar {
  mode: string;
  currentDate: Date;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  eventSource: CalendarEvent[] = [
    {
      title: 'Event 1',
      startTime: new Date(Date.UTC(2022, 1, 15)),
      endTime: new Date(Date.UTC(2022, 1, 16)),
      allDay: false
    },
    // Weitere Ereignisse...
  ];
  viewTitle: string = '';
  calendar: Calendar = {
    mode: 'month',
    currentDate: new Date(),
  };

  constructor() {}

  onEventSelected(event: CalendarEvent): void {
    console.log('Event selected:' + event.startTime + '-' + event.endTime + ',' + event.title);
  }

  onViewTitleChanged(title: string): void {
    this.viewTitle = title;
  }

  onTimeSelected(ev: { selectedTime: Date; events: CalendarEvent[] }): void {
    console.log('Selected time: ' + ev.selectedTime + ', hasEvents: '+(ev.events!==undefined && ev.events.length!==0));
  }
}