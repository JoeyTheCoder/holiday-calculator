# Swiss Holiday Calendar

A responsive web application that displays Swiss public holidays by canton and year.

## Features

- View public holidays for all Swiss cantons
- Filter holidays by canton
- Navigate between different years
- Responsive design for mobile and desktop
- Multi-language support (German, French, Italian, English)

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/swiss-holiday-calendar.git
   cd swiss-holiday-calendar
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   ionic serve
   ```

4. Build for production:
   ```bash
   ionic build --prod
   ```

## Mobile Deployment

### Android

- ionic cap add android
- ionic build --prod
- ionic cap copy android
- ionic cap sync android
- ionic cap open android

### iOS

- ionic cap add ios
- ionic build --prod
- ionic cap copy ios
- ionic cap sync ios
- ionic cap open ios

## Configuration Options

### Environment Variables

Edit the environment files in `src/environments/` to configure:

- `production`: Set to `true` for production builds (disables console logs)
- `version`: Application version number

### Canton Codes

The application uses the following canton codes:

- AG: Aargau
- AR: Appenzell Ausserrhoden
- AI: Appenzell Innerrhoden
- BL: Basel-Landschaft
- BS: Basel-Stadt
- BE: Bern
- FR: Fribourg
- GE: Geneva
- GL: Glarus
- GR: Graubünden
- JU: Jura
- LU: Lucerne
- NE: Neuchâtel
- NW: Nidwalden
- OW: Obwalden
- SH: Schaffhausen
- SZ: Schwyz
- SO: Solothurn
- SG: St. Gallen
- TI: Ticino
- TG: Thurgau
- UR: Uri
- VD: Vaud
- VS: Valais
- ZG: Zug
- ZH: Zurich

## License

MIT License