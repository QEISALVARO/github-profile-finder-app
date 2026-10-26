import {
  COUNTRIES,
  countryLabel,
  findCountry,
  flagEmoji,
  formatCountrySelection,
  normalizeSearch,
  searchCountries,
} from '../countries';

/**
 * R1 (PRD v2 §11A) — dataset negara & helper pencarian yang dipakai
 * CountryPicker, onboarding developer, dan Settings recruiter.
 */
describe('countries dataset', () => {
  it('has unique ISO2 codes and a global spread of regions', () => {
    const codes = COUNTRIES.map((c) => c.iso2);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);

    const regions = new Set(COUNTRIES.map((c) => c.region));
    expect(regions).toContain('Asia');
    expect(regions).toContain('Europe');
    expect(regions).toContain('Americas');
    expect(regions).toContain('Africa');
    expect(regions).toContain('Oceania');

    // Kebutuhan demo filter v1 (§11A pemetaan: Indonesia → ID).
    expect(findCountry('ID')?.name).toBe('Indonesia');
    expect(findCountry('SG')?.name).toBe('Singapore');
  });

  it('derives flag emoji from ISO2 and falls back safely', () => {
    expect(flagEmoji('ID')).toBe('🇮🇩');
    expect(flagEmoji('us')).toBe('🇺🇸');
    expect(flagEmoji('')).toBe('🌐');
    expect(flagEmoji(null)).toBe('🌐');
    expect(flagEmoji('X')).toBe('🌐');
    expect(flagEmoji('TOOLONG')).toBe('🌐');
  });

  it('normalizes search input (case + diacritics)', () => {
    expect(normalizeSearch('  Côte d’IVOIRE ')).toBe("cote d’ivoire");
    expect(normalizeSearch('Deutschland')).toBe('deutschland');
  });

  it('finds countries by name, alias and code', () => {
    expect(searchCountries('indonesia')[0]?.iso2).toBe('ID');
    expect(searchCountries('usa')[0]?.iso2).toBe('US');
    expect(searchCountries('UK')[0]?.iso2).toBe('GB');
    expect(searchCountries('deutschland')[0]?.iso2).toBe('DE');
    expect(searchCountries('brasil')[0]?.iso2).toBe('BR');
    expect(searchCountries('')).toHaveLength(COUNTRIES.length);
    expect(searchCountries('negara-tidak-ada')).toEqual([]);
  });

  it('ranks exact matches before prefix and substring matches', () => {
    const results = searchCountries('guin');
    expect(results[0]?.name).toMatch(/Guinea/);
    // "Indonesia" vs "India" — prefix "india" harus memunculkan India lebih dulu.
    const india = searchCountries('india');
    expect(india[0]?.iso2).toBe('IN');
  });

  it('formats selection chips for the quick filter', () => {
    expect(formatCountrySelection([])).toBe('All countries');
    expect(formatCountrySelection(['ID'])).toBe('🇮🇩 Indonesia');
    expect(formatCountrySelection(['ID', 'SG'], 1)).toBe('🇮🇩 Indonesia +1');
    expect(countryLabel('SG')).toBe('🇸🇬 Singapore');
    expect(countryLabel('ZZ')).toBe('ZZ');
  });

  it('is case-insensitive for lookup', () => {
    expect(findCountry('id')?.iso2).toBe('ID');
    expect(findCountry(' sg ')?.iso2).toBe('SG');
    expect(findCountry('??')).toBeNull();
    expect(findCountry(null)).toBeNull();
  });
});
