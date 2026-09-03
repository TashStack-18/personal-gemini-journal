import { AtmosphericContext } from '../types.js';

// WMO Weather Interpretation Codes (WW)
const WMO_WEATHER_MAP: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

// In-memory & session-storage cache with 20-minute validity
let cachedAtmosphere: { data: AtmosphericContext; timestamp: number } | null = null;
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

export async function fetchCurrentAtmosphere(forceRefresh = false): Promise<AtmosphericContext> {
  // Check memory cache first
  const now = Date.now();
  if (!forceRefresh && cachedAtmosphere && now - cachedAtmosphere.timestamp < CACHE_TTL_MS) {
    return cachedAtmosphere.data;
  }

  // Check sessionStorage cache
  if (!forceRefresh && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = sessionStorage.getItem('cached_atmosphere');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.timestamp && now - parsed.timestamp < CACHE_TTL_MS) {
          cachedAtmosphere = parsed;
          return parsed.data;
        }
      }
    } catch {
      // ignore
    }
  }

  // Default coordinates: Harohalli, Karnataka, India (from user's reference)
  let latitude = 12.6373;
  let longitude = 77.4589;
  let detectedCity = 'Harohalli, India';

  // 1. Try to obtain browser geolocation if permitted
  if (typeof window !== 'undefined' && 'geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4000,
          maximumAge: 300000,
          enableHighAccuracy: false,
        });
      });
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;

      // Reverse geocode to human readable locality
      try {
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const city = geoData.locality || geoData.city || geoData.principalSubdivision;
          const country = geoData.countryName || geoData.countryCode;
          if (city && country) {
            detectedCity = `${city}, ${country}`;
          } else if (city) {
            detectedCity = city;
          }
        }
      } catch {
        // Fallback silently if reverse geocoding is throttled
      }
    } catch {
      // Permission dismissed, timed out, or denied — keep peaceful default
    }
  }

  // 2. Fetch live Open-Meteo weather for the coordinates
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Weather fetch status: ${res.status}`);
    }
    const data = await res.json();
    const current = data.current;

    const weatherCode = current.weather_code ?? 2;
    const condition = WMO_WEATHER_MAP[weatherCode] || 'Partly cloudy';
    const temperature = Math.round(current.temperature_2m ?? 22);
    const feelsLike = Math.round(current.apparent_temperature ?? 26);
    const humidity = Math.round(current.relative_humidity_2m ?? 75);
    const windSpeed = Number((current.wind_speed_10m ?? 8.2).toFixed(1));

    const result: AtmosphericContext = {
      locationName: detectedCity,
      temperature,
      feelsLike,
      condition,
      humidity,
      windSpeed,
      weatherCode,
    };

    cachedAtmosphere = { data: result, timestamp: Date.now() };
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem('cached_atmosphere', JSON.stringify(cachedAtmosphere));
      } catch {
        // ignore
      }
    }

    return result;
  } catch (err) {
    console.warn('[Weather Service] Fallback to calm defaults:', err);
    const fallback: AtmosphericContext = {
      locationName: detectedCity,
      temperature: 22,
      feelsLike: 26,
      condition: 'Partly cloudy',
      humidity: 85,
      windSpeed: 8.2,
      weatherCode: 2,
    };
    cachedAtmosphere = { data: fallback, timestamp: Date.now() };
    return fallback;
  }
}
