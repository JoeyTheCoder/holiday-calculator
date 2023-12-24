import { CalendarComponent } from 'ionic2-calendar';
import { Component, ViewChild, OnInit, Inject, LOCALE_ID } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { formatDate } from '@angular/common';
import { CalModalPage } from '../cal-modal/cal-modal.page';

interface Event {
  desc: string | undefined;
  title: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  eventSource: Event[] = [];
  viewTitle: string = '';

  calendar = {
    mode: 'month',
    currentDate: new Date(),
  };

  selectedDate: Date = new Date();

  @ViewChild(CalendarComponent) myCal!: CalendarComponent;

  constructor(
    private alertCtrl: AlertController,
    @Inject(LOCALE_ID) private locale: string,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {}

  // Change current month/week/day
  next() {
    this.myCal.slideNext();
  }

  back() {
    this.myCal.slidePrev();
  }
  async openCalModal() {
    const modal = await this.modalCtrl.create({
      component: CalModalPage,
      cssClass: 'cal-modal',
      backdropDismiss: false
    });
  
    await modal.present();
  
    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.event) {
        let event = result.data.event;
        if (event.allDay) {
          let start = event.startTime;
          event.startTime = new Date(
            Date.UTC(
              start.getUTCFullYear(),
              start.getUTCMonth(),
              start.getUTCDate()
            )
          );
          event.endTime = new Date(
            Date.UTC(
              start.getUTCFullYear(),
              start.getUTCMonth(),
              start.getUTCDate() + 1
            )
          );
        }
        this.eventSource.push(result.data.event);
        this.myCal.loadEvents();
      }
    });
  }

  // Selected date reange and hence title changed
  onViewTitleChanged(title: string) {
    this.viewTitle = title;
  }

  // Calendar event was clicked
  async onEventSelected(event: Event) {
    // Use Angular date pipe for conversion
    let start = formatDate(event.startTime, 'medium', this.locale);
    let end = formatDate(event.endTime, 'medium', this.locale);

    const alert = await this.alertCtrl.create({
      header: event.title,
      subHeader: event.desc,
      message: 'From: ' + start + '<br><br>To: ' + end,
      buttons: ['OK'],
    });
    alert.present();
  }

  createRandomEvents() {
    var events: Event[] = [];
    this.eventSource = events;
  }

  removeEvents() {
    this.eventSource = [];
  }
}