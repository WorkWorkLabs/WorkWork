/**
 * Simplified world map coordinates for rendering country outlines
 * Each country is represented as an array of [longitude, latitude] coordinate pairs
 * Data is simplified for performance while maintaining recognizable shapes
 */

export interface CountryOutline {
  name: string;
  coordinates: [number, number][][]; // Array of polygons, each polygon is array of [lng, lat]
}

// Simplified world map data - major countries and continents
export const worldOutlines: CountryOutline[] = [
  // North America
  {
    name: 'USA',
    coordinates: [
      [
        [-125, 48], [-123, 49], [-95, 49], [-82, 45], [-75, 45], [-67, 45],
        [-67, 41], [-74, 40], [-80, 32], [-81, 25], [-97, 26], [-97, 32],
        [-106, 32], [-117, 32], [-122, 37], [-124, 42], [-125, 48]
      ]
    ]
  },
  {
    name: 'Canada',
    coordinates: [
      [
        [-141, 60], [-141, 70], [-120, 70], [-100, 70], [-80, 70], [-60, 70],
        [-60, 52], [-67, 45], [-82, 45], [-95, 49], [-123, 49], [-141, 60]
      ]
    ]
  },
  {
    name: 'Mexico',
    coordinates: [
      [
        [-117, 32], [-106, 32], [-97, 32], [-97, 26], [-97, 22], [-87, 21],
        [-87, 18], [-92, 15], [-105, 20], [-110, 23], [-117, 32]
      ]
    ]
  },
  // South America
  {
    name: 'Brazil',
    coordinates: [
      [
        [-35, -5], [-35, -10], [-38, -15], [-43, -23], [-48, -28], [-53, -33],
        [-57, -30], [-58, -20], [-67, -10], [-70, -5], [-70, 0], [-60, 5],
        [-50, 0], [-35, -5]
      ]
    ]
  },
  {
    name: 'Argentina',
    coordinates: [
      [
        [-58, -22], [-58, -28], [-58, -35], [-62, -40], [-65, -45], [-68, -50],
        [-68, -55], [-73, -50], [-73, -40], [-70, -35], [-70, -28], [-67, -22],
        [-58, -22]
      ]
    ]
  },
  // Europe
  {
    name: 'UK',
    coordinates: [
      [
        [-5, 50], [-5, 54], [-3, 58], [0, 58], [2, 52], [0, 50], [-5, 50]
      ]
    ]
  },
  {
    name: 'France',
    coordinates: [
      [
        [-2, 48], [2, 51], [8, 49], [7, 44], [3, 43], [-2, 43], [-2, 48]
      ]
    ]
  },
  {
    name: 'Germany',
    coordinates: [
      [
        [6, 51], [6, 54], [14, 54], [15, 51], [13, 48], [10, 47], [6, 48], [6, 51]
      ]
    ]
  },
  {
    name: 'Spain',
    coordinates: [
      [
        [-9, 43], [-2, 43], [3, 42], [3, 37], [-5, 36], [-9, 37], [-9, 43]
      ]
    ]
  },
  {
    name: 'Italy',
    coordinates: [
      [
        [7, 44], [12, 46], [14, 46], [18, 40], [16, 38], [12, 37], [8, 39], [7, 44]
      ]
    ]
  },
  {
    name: 'Portugal',
    coordinates: [
      [
        [-9, 42], [-7, 42], [-7, 37], [-9, 37], [-9, 42]
      ]
    ]
  },
  // Africa
  {
    name: 'Africa',
    coordinates: [
      [
        [-17, 15], [-5, 36], [10, 37], [32, 32], [35, 30], [43, 12], [51, 12],
        [51, 0], [42, -12], [35, -25], [28, -33], [18, -35], [12, -17],
        [8, 5], [-8, 5], [-17, 15]
      ]
    ]
  },
  // Asia
  {
    name: 'Russia',
    coordinates: [
      [
        [30, 55], [30, 70], [60, 70], [90, 75], [120, 75], [150, 70], [180, 65],
        [180, 55], [150, 45], [130, 45], [120, 50], [90, 50], [60, 55], [30, 55]
      ]
    ]
  },
  {
    name: 'China',
    coordinates: [
      [
        [75, 40], [80, 45], [90, 45], [100, 40], [120, 45], [130, 45], [135, 40],
        [122, 30], [120, 22], [110, 18], [100, 22], [97, 28], [80, 30], [75, 35],
        [75, 40]
      ]
    ]
  },
  {
    name: 'India',
    coordinates: [
      [
        [68, 24], [77, 35], [88, 28], [92, 22], [88, 15], [80, 8], [77, 8],
        [72, 20], [68, 24]
      ]
    ]
  },
  {
    name: 'Japan',
    coordinates: [
      [
        [130, 32], [131, 34], [135, 35], [140, 36], [141, 40], [140, 43],
        [145, 44], [145, 42], [141, 38], [140, 35], [137, 34], [130, 32]
      ]
    ]
  },
  {
    name: 'Southeast Asia',
    coordinates: [
      [
        [100, 20], [105, 22], [110, 20], [110, 10], [105, 5], [100, 5],
        [98, 10], [100, 20]
      ]
    ]
  },
  {
    name: 'Indonesia',
    coordinates: [
      [
        [95, 5], [105, 5], [115, -5], [120, -8], [130, -5], [140, -5],
        [140, -10], [120, -10], [105, -8], [95, -5], [95, 5]
      ]
    ]
  },
  // Middle East
  {
    name: 'Middle East',
    coordinates: [
      [
        [35, 35], [45, 40], [55, 38], [60, 30], [55, 22], [45, 15], [35, 15],
        [35, 30], [35, 35]
      ]
    ]
  },
  // Oceania
  {
    name: 'Australia',
    coordinates: [
      [
        [115, -20], [115, -35], [130, -35], [140, -38], [150, -38], [153, -28],
        [145, -15], [135, -12], [125, -15], [115, -20]
      ]
    ]
  },
  {
    name: 'New Zealand',
    coordinates: [
      [
        [166, -35], [173, -35], [178, -38], [178, -45], [170, -47], [166, -45],
        [166, -35]
      ]
    ]
  }
];

// Major cities for highlighting
export const majorCities = [
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { name: 'Bali', lat: -8.4095, lng: 115.1889 },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332 },
  { name: 'Lisbon', lat: 38.7223, lng: -9.1393 },
  { name: 'Berlin', lat: 52.52, lng: 13.405 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737 },
  { name: 'Seoul', lat: 37.5665, lng: 126.978 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
];
