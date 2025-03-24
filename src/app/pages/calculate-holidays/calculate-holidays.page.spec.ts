import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalculateHolidaysPage } from './calculate-holidays.page';

describe('CalculateHolidaysPage', () => {
  let component: CalculateHolidaysPage;
  let fixture: ComponentFixture<CalculateHolidaysPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CalculateHolidaysPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
