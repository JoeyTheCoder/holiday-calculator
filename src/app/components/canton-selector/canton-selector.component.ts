import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
         IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/angular/standalone';

interface Canton {
  code: string;
  name: string;
}

@Component({
  selector: 'app-canton-selector',
  templateUrl: './canton-selector.component.html',
  styleUrls: ['./canton-selector.component.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, TranslateModule,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
    IonItem, IonLabel, IonSelect, IonSelectOption
  ]
})
export class CantonSelectorComponent implements OnInit {
  @Output() cantonChanged = new EventEmitter<string>();
  
  cantons: Canton[] = [
    { code: 'ZH', name: 'Zürich' },
    { code: 'BE', name: 'Bern' },
    { code: 'LU', name: 'Lucerne' },
    { code: 'UR', name: 'Uri' },
    { code: 'SZ', name: 'Schwyz' },
    { code: 'OW', name: 'Obwalden' },
    { code: 'NW', name: 'Nidwalden' },
    { code: 'GL', name: 'Glarus' },
    { code: 'ZG', name: 'Zug' },
    { code: 'FR', name: 'Fribourg' },
    { code: 'SO', name: 'Solothurn' },
    { code: 'BS', name: 'Basel-Stadt' },
    { code: 'BL', name: 'Basel-Landschaft' },
    { code: 'SH', name: 'Schaffhausen' },
    { code: 'AR', name: 'Appenzell Ausserrhoden' },
    { code: 'AI', name: 'Appenzell Innerrhoden' },
    { code: 'SG', name: 'St. Gallen' },
    { code: 'GR', name: 'Graubünden' },
    { code: 'AG', name: 'Aargau' },
    { code: 'TG', name: 'Thurgau' },
    { code: 'TI', name: 'Ticino' },
    { code: 'VD', name: 'Vaud' },
    { code: 'VS', name: 'Valais' },
    { code: 'NE', name: 'Neuchâtel' },
    { code: 'GE', name: 'Geneva' },
    { code: 'JU', name: 'Jura' }
  ];
  
  selectedCanton: string = 'ZH'; // Default to Zürich

  constructor() { }

  ngOnInit() {
    // Emit default canton on initialization
    setTimeout(() => {
      this.cantonChanged.emit(this.selectedCanton);
    }, 0);
  }

  onCantonChange(event: any) {
    const canton = event.detail.value;
    this.selectedCanton = canton;
    this.cantonChanged.emit(canton);
  }
}
