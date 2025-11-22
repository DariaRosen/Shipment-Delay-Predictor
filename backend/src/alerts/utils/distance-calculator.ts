/**
 * Calculate the great circle distance between two geographic coordinates
 * using the Haversine formula
 * 
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * City coordinates database
 * This is a simplified version - in production, use a proper geocoding service
 */
const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  // Asia-Pacific
  'Shanghai': { lat: 31.2304, lon: 121.4737 },
  'Tokyo': { lat: 35.6762, lon: 139.6503 },
  'Singapore': { lat: 1.3521, lon: 103.8198 },
  'Hong Kong': { lat: 22.3193, lon: 114.1694 },
  'Seoul': { lat: 37.5665, lon: 126.9780 },
  'Bangkok': { lat: 13.7563, lon: 100.5018 },
  'Mumbai': { lat: 19.0760, lon: 72.8777 },
  'Ho Chi Minh': { lat: 10.8231, lon: 106.6297 },
  'Shenzhen': { lat: 22.5431, lon: 114.0579 },
  'Yokohama': { lat: 35.4437, lon: 139.6380 },
  
  // Europe
  'London': { lat: 51.5074, lon: -0.1278 },
  'Frankfurt': { lat: 50.1109, lon: 8.6821 },
  'Paris': { lat: 48.8566, lon: 2.3522 },
  'Amsterdam': { lat: 52.3676, lon: 4.9041 },
  'Barcelona': { lat: 41.3851, lon: 2.1734 },
  'Istanbul': { lat: 41.0082, lon: 28.9784 },
  'Berlin': { lat: 52.5200, lon: 13.4050 },
  'Rome': { lat: 41.9028, lon: 12.4964 },
  'Madrid': { lat: 40.4168, lon: -3.7038 },
  'Rotterdam': { lat: 51.9244, lon: 4.4777 },
  
  // North America
  'New York': { lat: 40.7128, lon: -74.0060 },
  'Los Angeles': { lat: 34.0522, lon: -118.2437 },
  'Chicago': { lat: 41.8781, lon: -87.6298 },
  'Miami': { lat: 25.7617, lon: -80.1918 },
  'Seattle': { lat: 47.6062, lon: -122.3321 },
  'Houston': { lat: 29.7604, lon: -95.3698 },
  'Toronto': { lat: 43.6532, lon: -79.3832 },
  'Vancouver': { lat: 49.2827, lon: -123.1207 },
  'Newark': { lat: 40.7357, lon: -74.1724 },
  
  // Middle East & Africa
  'Dubai': { lat: 25.2048, lon: 55.2708 },
  
  // South America
  'São Paulo': { lat: -23.5505, lon: -46.6333 },
  'Buenos Aires': { lat: -34.6037, lon: -58.3816 },
  'Mexico City': { lat: 19.4326, lon: -106.1332 },
  
  // Oceania
  'Sydney': { lat: -33.8688, lon: 151.2093 },
  'Melbourne': { lat: -37.8136, lon: 144.9631 },
};

/**
 * Get coordinates for a city
 * Returns null if city not found
 */
export function getCityCoordinates(cityName: string): { lat: number; lon: number } | null {
  // Try exact match first
  if (CITY_COORDINATES[cityName]) {
    return CITY_COORDINATES[cityName];
  }
  
  // Try case-insensitive match
  const cityKey = Object.keys(CITY_COORDINATES).find(
    (key) => key.toLowerCase() === cityName.toLowerCase(),
  );
  
  if (cityKey) {
    return CITY_COORDINATES[cityKey];
  }
  
  // Try partial match (e.g., "Ho Chi Minh City" -> "Ho Chi Minh")
  const partialMatch = Object.keys(CITY_COORDINATES).find(
    (key) =>
      cityName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(cityName.toLowerCase()),
  );
  
  if (partialMatch) {
    return CITY_COORDINATES[partialMatch];
  }
  
  return null;
}

/**
 * Calculate distance between two cities
 * Returns distance in kilometers, or null if cities not found
 */
export function calculateCityDistance(
  originCity: string,
  destinationCity: string,
): number | null {
  const originCoords = getCityCoordinates(originCity);
  const destCoords = getCityCoordinates(destinationCity);
  
  if (!originCoords || !destCoords) {
    return null;
  }
  
  return calculateDistance(
    originCoords.lat,
    originCoords.lon,
    destCoords.lat,
    destCoords.lon,
  );
}

