import type { LocationSeedInput } from "@/lib/validation/location";

// Launch locations for the global events directory.
// Rows are validated by locationSeedSchema in the seed script — keep this
// file data-only. COUNTRY_FALLBACK rows are approximate country centroids
// for countries targeted before a specific city is known; they never carry
// a timezone and their name is the country name (a country is not a city).
export const LAUNCH_LOCATIONS: LocationSeedInput[] = [
  // --- United States ---
  { name: "Los Angeles", type: "CITY", stateProvince: "California", country: "United States", countryCode: "US", region: "North America", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { name: "Minneapolis", type: "CITY", stateProvince: "Minnesota", country: "United States", countryCode: "US", region: "North America", latitude: 44.9778, longitude: -93.265, timezone: "America/Chicago" },
  { name: "Austin", type: "CITY", stateProvince: "Texas", country: "United States", countryCode: "US", region: "North America", latitude: 30.2672, longitude: -97.7431, timezone: "America/Chicago" },
  { name: "Houston", type: "CITY", stateProvince: "Texas", country: "United States", countryCode: "US", region: "North America", latitude: 29.7604, longitude: -95.3698, timezone: "America/Chicago" },
  { name: "Oakland", type: "CITY", stateProvince: "California", country: "United States", countryCode: "US", region: "North America", latitude: 37.8044, longitude: -122.2712, timezone: "America/Los_Angeles" },
  { name: "New York City", type: "CITY", stateProvince: "New York", country: "United States", countryCode: "US", region: "North America", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  { name: "Boston", type: "CITY", stateProvince: "Massachusetts", country: "United States", countryCode: "US", region: "North America", latitude: 42.3601, longitude: -71.0589, timezone: "America/New_York" },

  // --- Africa ---
  { name: "Lagos", type: "CITY", stateProvince: "Lagos", country: "Nigeria", countryCode: "NG", region: "Africa", latitude: 6.5244, longitude: 3.3792, timezone: "Africa/Lagos" },
  { name: "Accra", type: "CITY", stateProvince: "Greater Accra", country: "Ghana", countryCode: "GH", region: "Africa", latitude: 5.6037, longitude: -0.187, timezone: "Africa/Accra" },
  { name: "Johannesburg", type: "CITY", stateProvince: "Gauteng", country: "South Africa", countryCode: "ZA", region: "Africa", latitude: -26.2041, longitude: 28.0473, timezone: "Africa/Johannesburg" },
  { name: "Nairobi", type: "CITY", stateProvince: "Nairobi", country: "Kenya", countryCode: "KE", region: "Africa", latitude: -1.2921, longitude: 36.8219, timezone: "Africa/Nairobi" },
  { name: "Kigali", type: "CITY", stateProvince: "Kigali", country: "Rwanda", countryCode: "RW", region: "Africa", latitude: -1.9441, longitude: 30.0619, timezone: "Africa/Kigali" },
  { name: "Addis Ababa", type: "CITY", stateProvince: "Addis Ababa", country: "Ethiopia", countryCode: "ET", region: "Africa", latitude: 8.9806, longitude: 38.7578, timezone: "Africa/Addis_Ababa" },
  { name: "Cairo", type: "CITY", stateProvince: "Cairo", country: "Egypt", countryCode: "EG", region: "Africa", latitude: 30.0444, longitude: 31.2357, timezone: "Africa/Cairo" },
  { name: "Ado-Ekiti", type: "CITY", stateProvince: "Ekiti", country: "Nigeria", countryCode: "NG", region: "Africa", latitude: 7.6233, longitude: 5.2209, timezone: "Africa/Lagos" },

  // --- Other specified cities ---
  { name: "Toronto", type: "CITY", stateProvince: "Ontario", country: "Canada", countryCode: "CA", region: "North America", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto" },
  { name: "Dubai", type: "CITY", stateProvince: "Dubai", country: "United Arab Emirates", countryCode: "AE", region: "Middle East", latitude: 25.2048, longitude: 55.2708, timezone: "Asia/Dubai" },
  { name: "Mexico City", type: "CITY", country: "Mexico", countryCode: "MX", region: "Latin America", latitude: 19.4326, longitude: -99.1332, timezone: "America/Mexico_City" },
  { name: "Cancun", type: "CITY", stateProvince: "Quintana Roo", country: "Mexico", countryCode: "MX", region: "Latin America", latitude: 21.1619, longitude: -86.8515, timezone: "America/Cancun" },

  // --- Country fallbacks (approximate centroids; no single timezone) ---
  { name: "Morocco", type: "COUNTRY_FALLBACK", country: "Morocco", countryCode: "MA", region: "Africa", latitude: 31.7917, longitude: -7.0926 },
  { name: "Colombia", type: "COUNTRY_FALLBACK", country: "Colombia", countryCode: "CO", region: "Latin America", latitude: 4.5709, longitude: -74.2973 },
  { name: "Germany", type: "COUNTRY_FALLBACK", country: "Germany", countryCode: "DE", region: "Europe", latitude: 51.1657, longitude: 10.4515 },
  { name: "France", type: "COUNTRY_FALLBACK", country: "France", countryCode: "FR", region: "Europe", latitude: 46.2276, longitude: 2.2137 },
  { name: "Norway", type: "COUNTRY_FALLBACK", country: "Norway", countryCode: "NO", region: "Europe", latitude: 60.472, longitude: 8.4689 },
  { name: "Estonia", type: "COUNTRY_FALLBACK", country: "Estonia", countryCode: "EE", region: "Europe", latitude: 58.5953, longitude: 25.0136 },
  { name: "United Kingdom", type: "COUNTRY_FALLBACK", country: "United Kingdom", countryCode: "GB", region: "Europe", latitude: 55.3781, longitude: -3.436 },
  { name: "Jamaica", type: "COUNTRY_FALLBACK", country: "Jamaica", countryCode: "JM", region: "Caribbean", latitude: 18.1096, longitude: -77.2975 },
  { name: "Brazil", type: "COUNTRY_FALLBACK", country: "Brazil", countryCode: "BR", region: "Latin America", latitude: -14.235, longitude: -51.9253 },
];
