import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'calculate-holidays',
    loadComponent: () => import('./pages/calculate-holidays/calculate-holidays.page').then( m => m.CalculateHolidaysPage)
  }
];
