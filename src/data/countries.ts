/**
 * PRD v2 §11A — negara (ISO 3166-1 alpha-2).
 *
 * Dataset referensi statis untuk layer frontend. Di produksi baris ini hidup
 * di tabel `countries` Supabase (seed R0) dan dibaca lewat RPC/facet; bentuk
 * di sini sengaja disamakan agar migrasi nanti hanya mengganti sumber data,
 * bukan konsumennya.
 *
 * `flagEmoji()` diturunkan dari kode ISO sehingga kita tidak menyimpan emoji
 * (hemat dan bebas inkonsistensi).
 */

export type CountryRegion =
  | 'Africa'
  | 'Americas'
  | 'Asia'
  | 'Europe'
  | 'Oceania';

export interface Country {
  iso2: string;
  name: string;
  region: CountryRegion;
  /** Nama alternatif untuk pencarian ("USA", "Deutschland", "UK", ...). */
  aliases?: string[];
}

/**
 * Daftar negara global (cakupan produk = GLOBAL, PRD v2 K10). Urutan bebas;
 * UI selalu mengurutkan berdasarkan `name`.
 */
export const COUNTRIES: Country[] = [
  { iso2: 'AF', name: 'Afghanistan', region: 'Asia' },
  { iso2: 'AL', name: 'Albania', region: 'Europe' },
  { iso2: 'DZ', name: 'Algeria', region: 'Africa' },
  { iso2: 'AD', name: 'Andorra', region: 'Europe' },
  { iso2: 'AO', name: 'Angola', region: 'Africa' },
  { iso2: 'AR', name: 'Argentina', region: 'Americas' },
  { iso2: 'AM', name: 'Armenia', region: 'Europe' },
  { iso2: 'AU', name: 'Australia', region: 'Oceania' },
  { iso2: 'AT', name: 'Austria', region: 'Europe', aliases: ['Österreich'] },
  { iso2: 'AZ', name: 'Azerbaijan', region: 'Asia' },
  { iso2: 'BS', name: 'Bahamas', region: 'Americas' },
  { iso2: 'BH', name: 'Bahrain', region: 'Asia' },
  { iso2: 'BD', name: 'Bangladesh', region: 'Asia' },
  { iso2: 'BB', name: 'Barbados', region: 'Americas' },
  { iso2: 'BY', name: 'Belarus', region: 'Europe' },
  { iso2: 'BE', name: 'Belgium', region: 'Europe' },
  { iso2: 'BZ', name: 'Belize', region: 'Americas' },
  { iso2: 'BJ', name: 'Benin', region: 'Africa' },
  { iso2: 'BT', name: 'Bhutan', region: 'Asia' },
  { iso2: 'BO', name: 'Bolivia', region: 'Americas' },
  { iso2: 'BA', name: 'Bosnia and Herzegovina', region: 'Europe' },
  { iso2: 'BW', name: 'Botswana', region: 'Africa' },
  { iso2: 'BR', name: 'Brazil', region: 'Americas', aliases: ['Brasil'] },
  { iso2: 'BN', name: 'Brunei', region: 'Asia' },
  { iso2: 'BG', name: 'Bulgaria', region: 'Europe' },
  { iso2: 'BF', name: 'Burkina Faso', region: 'Africa' },
  { iso2: 'BI', name: 'Burundi', region: 'Africa' },
  { iso2: 'KH', name: 'Cambodia', region: 'Asia' },
  { iso2: 'CM', name: 'Cameroon', region: 'Africa' },
  { iso2: 'CA', name: 'Canada', region: 'Americas' },
  { iso2: 'CF', name: 'Central African Republic', region: 'Africa' },
  { iso2: 'TD', name: 'Chad', region: 'Africa' },
  { iso2: 'CL', name: 'Chile', region: 'Americas' },
  { iso2: 'CN', name: 'China', region: 'Asia', aliases: ['PRC'] },
  { iso2: 'CO', name: 'Colombia', region: 'Americas' },
  { iso2: 'CR', name: 'Costa Rica', region: 'Americas' },
  { iso2: 'CI', name: "Côte d'Ivoire", region: 'Africa', aliases: ['Ivory Coast'] },
  { iso2: 'HR', name: 'Croatia', region: 'Europe' },
  { iso2: 'CU', name: 'Cuba', region: 'Americas' },
  { iso2: 'CY', name: 'Cyprus', region: 'Europe' },
  { iso2: 'CZ', name: 'Czechia', region: 'Europe', aliases: ['Czech Republic'] },
  { iso2: 'DK', name: 'Denmark', region: 'Europe' },
  { iso2: 'DO', name: 'Dominican Republic', region: 'Americas' },
  { iso2: 'EC', name: 'Ecuador', region: 'Americas' },
  { iso2: 'EG', name: 'Egypt', region: 'Africa' },
  { iso2: 'SV', name: 'El Salvador', region: 'Americas' },
  { iso2: 'EE', name: 'Estonia', region: 'Europe' },
  { iso2: 'ET', name: 'Ethiopia', region: 'Africa' },
  { iso2: 'FI', name: 'Finland', region: 'Europe' },
  { iso2: 'FR', name: 'France', region: 'Europe' },
  { iso2: 'GA', name: 'Gabon', region: 'Africa' },
  { iso2: 'GE', name: 'Georgia', region: 'Europe' },
  { iso2: 'DE', name: 'Germany', region: 'Europe', aliases: ['Deutschland'] },
  { iso2: 'GH', name: 'Ghana', region: 'Africa' },
  { iso2: 'GR', name: 'Greece', region: 'Europe' },
  { iso2: 'GT', name: 'Guatemala', region: 'Americas' },
  { iso2: 'GN', name: 'Guinea', region: 'Africa' },
  { iso2: 'GY', name: 'Guyana', region: 'Americas' },
  { iso2: 'HT', name: 'Haiti', region: 'Americas' },
  { iso2: 'HN', name: 'Honduras', region: 'Americas' },
  { iso2: 'HK', name: 'Hong Kong', region: 'Asia' },
  { iso2: 'HU', name: 'Hungary', region: 'Europe' },
  { iso2: 'IS', name: 'Iceland', region: 'Europe' },
  { iso2: 'IN', name: 'India', region: 'Asia' },
  { iso2: 'ID', name: 'Indonesia', region: 'Asia' },
  { iso2: 'IR', name: 'Iran', region: 'Asia' },
  { iso2: 'IQ', name: 'Iraq', region: 'Asia' },
  { iso2: 'IE', name: 'Ireland', region: 'Europe' },
  { iso2: 'IL', name: 'Israel', region: 'Asia' },
  { iso2: 'IT', name: 'Italy', region: 'Europe', aliases: ['Italia'] },
  { iso2: 'JM', name: 'Jamaica', region: 'Americas' },
  { iso2: 'JP', name: 'Japan', region: 'Asia', aliases: ['Nippon'] },
  { iso2: 'JO', name: 'Jordan', region: 'Asia' },
  { iso2: 'KZ', name: 'Kazakhstan', region: 'Asia' },
  { iso2: 'KE', name: 'Kenya', region: 'Africa' },
  { iso2: 'KW', name: 'Kuwait', region: 'Asia' },
  { iso2: 'KG', name: 'Kyrgyzstan', region: 'Asia' },
  { iso2: 'LA', name: 'Laos', region: 'Asia' },
  { iso2: 'LV', name: 'Latvia', region: 'Europe' },
  { iso2: 'LB', name: 'Lebanon', region: 'Asia' },
  { iso2: 'LY', name: 'Libya', region: 'Africa' },
  { iso2: 'LT', name: 'Lithuania', region: 'Europe' },
  { iso2: 'LU', name: 'Luxembourg', region: 'Europe' },
  { iso2: 'MO', name: 'Macau', region: 'Asia' },
  { iso2: 'MG', name: 'Madagascar', region: 'Africa' },
  { iso2: 'MW', name: 'Malawi', region: 'Africa' },
  { iso2: 'MY', name: 'Malaysia', region: 'Asia' },
  { iso2: 'ML', name: 'Mali', region: 'Africa' },
  { iso2: 'MT', name: 'Malta', region: 'Europe' },
  { iso2: 'MU', name: 'Mauritius', region: 'Africa' },
  { iso2: 'MX', name: 'Mexico', region: 'Americas' },
  { iso2: 'MD', name: 'Moldova', region: 'Europe' },
  { iso2: 'MC', name: 'Monaco', region: 'Europe' },
  { iso2: 'MN', name: 'Mongolia', region: 'Asia' },
  { iso2: 'ME', name: 'Montenegro', region: 'Europe' },
  { iso2: 'MA', name: 'Morocco', region: 'Africa' },
  { iso2: 'MZ', name: 'Mozambique', region: 'Africa' },
  { iso2: 'MM', name: 'Myanmar', region: 'Asia' },
  { iso2: 'NA', name: 'Namibia', region: 'Africa' },
  { iso2: 'NP', name: 'Nepal', region: 'Asia' },
  { iso2: 'NL', name: 'Netherlands', region: 'Europe', aliases: ['Holland'] },
  { iso2: 'NZ', name: 'New Zealand', region: 'Oceania' },
  { iso2: 'NI', name: 'Nicaragua', region: 'Americas' },
  { iso2: 'NG', name: 'Nigeria', region: 'Africa' },
  { iso2: 'MK', name: 'North Macedonia', region: 'Europe' },
  { iso2: 'NO', name: 'Norway', region: 'Europe' },
  { iso2: 'OM', name: 'Oman', region: 'Asia' },
  { iso2: 'PK', name: 'Pakistan', region: 'Asia' },
  { iso2: 'PA', name: 'Panama', region: 'Americas' },
  { iso2: 'PG', name: 'Papua New Guinea', region: 'Oceania' },
  { iso2: 'PY', name: 'Paraguay', region: 'Americas' },
  { iso2: 'PE', name: 'Peru', region: 'Americas' },
  { iso2: 'PH', name: 'Philippines', region: 'Asia' },
  { iso2: 'PL', name: 'Poland', region: 'Europe' },
  { iso2: 'PT', name: 'Portugal', region: 'Europe' },
  { iso2: 'PR', name: 'Puerto Rico', region: 'Americas' },
  { iso2: 'QA', name: 'Qatar', region: 'Asia' },
  { iso2: 'RO', name: 'Romania', region: 'Europe' },
  { iso2: 'RU', name: 'Russia', region: 'Europe', aliases: ['Russian Federation'] },
  { iso2: 'RW', name: 'Rwanda', region: 'Africa' },
  { iso2: 'SA', name: 'Saudi Arabia', region: 'Asia' },
  { iso2: 'SN', name: 'Senegal', region: 'Africa' },
  { iso2: 'RS', name: 'Serbia', region: 'Europe' },
  { iso2: 'SG', name: 'Singapore', region: 'Asia' },
  { iso2: 'SK', name: 'Slovakia', region: 'Europe' },
  { iso2: 'SI', name: 'Slovenia', region: 'Europe' },
  { iso2: 'SO', name: 'Somalia', region: 'Africa' },
  { iso2: 'ZA', name: 'South Africa', region: 'Africa' },
  { iso2: 'KR', name: 'South Korea', region: 'Asia', aliases: ['Korea', 'Republic of Korea'] },
  { iso2: 'SS', name: 'South Sudan', region: 'Africa' },
  { iso2: 'ES', name: 'Spain', region: 'Europe', aliases: ['España'] },
  { iso2: 'LK', name: 'Sri Lanka', region: 'Asia' },
  { iso2: 'SD', name: 'Sudan', region: 'Africa' },
  { iso2: 'SR', name: 'Suriname', region: 'Americas' },
  { iso2: 'SE', name: 'Sweden', region: 'Europe', aliases: ['Sverige'] },
  { iso2: 'CH', name: 'Switzerland', region: 'Europe', aliases: ['Schweiz', 'Suisse'] },
  { iso2: 'SY', name: 'Syria', region: 'Asia' },
  { iso2: 'TW', name: 'Taiwan', region: 'Asia' },
  { iso2: 'TZ', name: 'Tanzania', region: 'Africa' },
  { iso2: 'TH', name: 'Thailand', region: 'Asia' },
  { iso2: 'TN', name: 'Tunisia', region: 'Africa' },
  { iso2: 'TR', name: 'Turkey', region: 'Asia', aliases: ['Türkiye'] },
  { iso2: 'UG', name: 'Uganda', region: 'Africa' },
  { iso2: 'UA', name: 'Ukraine', region: 'Europe' },
  { iso2: 'AE', name: 'United Arab Emirates', region: 'Asia', aliases: ['UAE'] },
  { iso2: 'GB', name: 'United Kingdom', region: 'Europe', aliases: ['UK', 'Great Britain', 'England'] },
  { iso2: 'US', name: 'United States', region: 'Americas', aliases: ['USA', 'America', 'United States of America'] },
  { iso2: 'UY', name: 'Uruguay', region: 'Americas' },
  { iso2: 'UZ', name: 'Uzbekistan', region: 'Asia' },
  { iso2: 'VE', name: 'Venezuela', region: 'Americas' },
  { iso2: 'VN', name: 'Vietnam', region: 'Asia', aliases: ['Việt Nam'] },
  { iso2: 'ZM', name: 'Zambia', region: 'Africa' },
  { iso2: 'ZW', name: 'Zimbabwe', region: 'Africa' },
];

/** Flag emoji diturunkan dari kode ISO (regional indicator symbols). */
export function flagEmoji(iso2: string | null | undefined): string {
  if (!iso2) return '🌐';
  const code = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '🌐';
  return String.fromCodePoint(
    ...code.split('').map((char) => char.charCodeAt(0) + 127397),
  );
}

/** Normalisasi untuk pencarian case-insensitive + diacritic-insensitive. */
export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function haystackFor(country: Country): string {
  return normalizeSearch(
    [country.name, country.iso2, ...(country.aliases ?? [])].join(' '),
  );
}

/** Cari negara berdasarkan nama, alias, atau kode ISO. Urut: nama > alias > ISO. */
export function searchCountries(query: string, source: Country[] = COUNTRIES): Country[] {
  const q = normalizeSearch(query);
  if (!q) return [...source].sort((a, b) => a.name.localeCompare(b.name));

  const exact: Country[] = [];
  const prefix: Country[] = [];
  const contains: Country[] = [];

  for (const country of source) {
    const name = normalizeSearch(country.name);
    const iso = country.iso2.toLowerCase();
    const aliases = (country.aliases ?? []).map(normalizeSearch);

    if (name === q || iso === q || aliases.includes(q)) exact.push(country);
    else if (name.startsWith(q) || iso.startsWith(q) || aliases.some((a) => a.startsWith(q)))
      prefix.push(country);
    else if (haystackFor(country).includes(q)) contains.push(country);
  }

  const byName = (a: Country, b: Country) => a.name.localeCompare(b.name);
  // Urut di dalam tiap bucket saja — sort global akan menghapus
  // prioritas exact > prefix > contains.
  return [
    ...exact.sort(byName),
    ...prefix.sort(byName),
    ...contains.sort(byName),
  ];
}

/** Lookup tunggal (dipakai onboarding & validasi store). */
export function findCountry(
  iso2: string | null | undefined,
  source: Country[] = COUNTRIES,
): Country | null {
  if (!iso2) return null;
  const code = iso2.trim().toUpperCase();
  return source.find((country) => country.iso2 === code) ?? null;
}

/** Opsi untuk SelectSheet/daftar: `"{iso2}"` → label berbendera. */
export function countryLabel(iso2: string): string {
  const country = findCountry(iso2);
  return country ? `${flagEmoji(country.iso2)} ${country.name}` : iso2;
}

/** "ID", "SG" → "🇮🇩 Indonesia +1", dsb. (chip quick-filter). */
export function formatCountrySelection(
  iso2List: string[],
  maxVisible = 1,
): string {
  if (iso2List.length === 0) return 'All countries';
  const visible = iso2List.slice(0, maxVisible).map(countryLabel);
  const rest = iso2List.length - visible.length;
  return rest > 0 ? `${visible.join(', ')} +${rest}` : visible.join(', ');
}
