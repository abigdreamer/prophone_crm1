const KNOWN_CITIES = new Set([
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego',
  'Dallas',
  'San Jose',
  'Austin',
  'Jacksonville',
  'Fort Worth',
  'Columbus',
  'Charlotte',
  'San Francisco',
  'Indianapolis',
  'Seattle',
  'Denver',
  'Washington',
  'Boston',
  'El Paso',
  'Nashville',
  'Detroit',
  'Oklahoma City',
  'Portland',
  'Las Vegas',
  'Memphis',
  'Louisville',
  'Baltimore',
  'Milwaukee',
  'Albuquerque',
  'Tucson',
  'Fresno',
  'Sacramento',
  'Mesa',
  'Atlanta',
  'Kansas City',
  'Colorado Springs',
  'Miami',
  'Raleigh',
  'Omaha',
  'Long Beach',
  'Virginia Beach',
  'Oakland',
  'Minneapolis',
  'Tulsa',
  'Arlington',
  'Tampa',
  'New Orleans',
  'Cleveland',
  'Honolulu',
  'Anaheim',
  'Lexington',
  'Stockton',
  'Corpus Christi',
  'Henderson',
  'Riverside',
  'Newark',
  'St. Louis',
  'Pittsburgh',
  'Cincinnati',
  'Anchorage',
  'Orlando',
  'Buffalo',
  'Plano',
  'Irvine'
]);

const SKIP_PATTERNS = [
  /^\d/,
  /^(suite|ste|apt|unit|#|floor|fl|bldg|po\s*box)\b/i,
  /^[A-Z]{2}(\s+\d{5}(-\d{4})?)?$/,
  /^\d{5}(-\d{4})?$/,
  /^USA$/i,
  /^United States$/i
];

export function extractCity(address = '') {
  const parts = address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  const knownCity = parts.find(part => KNOWN_CITIES.has(part));

  if (knownCity) {
    return knownCity;
  }

  const fallbackCity = parts.find(
    part => !SKIP_PATTERNS.some(pattern => pattern.test(part))
  );

  return fallbackCity || '';
}