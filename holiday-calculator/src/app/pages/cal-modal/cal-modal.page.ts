import { Component, AfterViewInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

interface Event {
  title: string;
  desc: string;
  startTime: Date | null;
  endTime: string;
  allDay: boolean;
}

@Component({
  selector: 'app-cal-modal',
  templateUrl: './cal-modal.page.html',
  styleUrls: ['./cal-modal.page.scss'],
})
export class CalModalPage implements AfterViewInit {
  calendar = {
    mode: 'month',
    currentDate: new Date()
  };
  viewTitle: string = '';

  event: Event = {
    title: '',
    desc: '',
    startTime: null,
    endTime: '',
    allDay: true
  };

  modalReady = false;

  constructor(private modalCtrl: ModalController) { }

  ngAfterViewInit() {
    setTimeout(() => {
      this.modalReady = true;
    }, 0);
  }

  save() {
    this.modalCtrl.dismiss({event: this.event})
  }

  onViewTitleChanged(title: string) {
    this.viewTitle = title;
  }

  onTimeSelected(ev: {selectedTime: string}) {
    this.event.startTime = new Date(ev.selectedTime);
  }

  close() {
    this.modalCtrl.dismiss();
  }
}