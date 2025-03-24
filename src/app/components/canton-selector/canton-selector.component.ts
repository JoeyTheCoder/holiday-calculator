import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-canton-selector',
  templateUrl: './canton-selector.component.html',
  styleUrls: ['./canton-selector.component.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class CantonSelectorComponent implements OnInit {
  @Output() cantonChanged = new EventEmitter<string>();
  
  cantons = [
    { code: 'ZH', name: 'Zürich' },
    { code: 'BE', name: 'Bern' },
    { code: 'LU', name: 'Luzern' },
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

  onCantonChange() {
    this.cantonChanged.emit(this.selectedCanton);
  }
}
