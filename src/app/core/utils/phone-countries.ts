export interface PhoneCountry {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

/** Liste d’indicatifs (Afrique prioritaire + pays courants). */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: 'ML', name: 'Mali', dial: '223', flag: '🇲🇱' },
  { code: 'CI', name: 'Côte d’Ivoire', dial: '225', flag: '🇨🇮' },
  { code: 'SN', name: 'Sénégal', dial: '221', flag: '🇸🇳' },
  { code: 'BF', name: 'Burkina Faso', dial: '226', flag: '🇧🇫' },
  { code: 'NE', name: 'Niger', dial: '227', flag: '🇳🇪' },
  { code: 'GN', name: 'Guinée', dial: '224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinée-Bissau', dial: '245', flag: '🇬🇼' },
  { code: 'GM', name: 'Gambie', dial: '220', flag: '🇬🇲' },
  { code: 'MR', name: 'Mauritanie', dial: '222', flag: '🇲🇷' },
  { code: 'TG', name: 'Togo', dial: '228', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', dial: '229', flag: '🇧🇯' },
  { code: 'GH', name: 'Ghana', dial: '233', flag: '🇬🇭' },
  { code: 'NG', name: 'Nigeria', dial: '234', flag: '🇳🇬' },
  { code: 'CM', name: 'Cameroun', dial: '237', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', dial: '241', flag: '🇬🇦' },
  { code: 'CG', name: 'Congo', dial: '242', flag: '🇨🇬' },
  { code: 'CD', name: 'RD Congo', dial: '243', flag: '🇨🇩' },
  { code: 'TD', name: 'Tchad', dial: '235', flag: '🇹🇩' },
  { code: 'CF', name: 'Centrafrique', dial: '236', flag: '🇨🇫' },
  { code: 'GQ', name: 'Guinée équatoriale', dial: '240', flag: '🇬🇶' },
  { code: 'ST', name: 'Sao Tomé', dial: '239', flag: '🇸🇹' },
  { code: 'AO', name: 'Angola', dial: '244', flag: '🇦🇴' },
  { code: 'CV', name: 'Cap-Vert', dial: '238', flag: '🇨🇻' },
  { code: 'LR', name: 'Libéria', dial: '231', flag: '🇱🇷' },
  { code: 'SL', name: 'Sierra Leone', dial: '232', flag: '🇸🇱' },
  { code: 'MA', name: 'Maroc', dial: '212', flag: '🇲🇦' },
  { code: 'DZ', name: 'Algérie', dial: '213', flag: '🇩🇿' },
  { code: 'TN', name: 'Tunisie', dial: '216', flag: '🇹🇳' },
  { code: 'LY', name: 'Libye', dial: '218', flag: '🇱🇾' },
  { code: 'EG', name: 'Égypte', dial: '20', flag: '🇪🇬' },
  { code: 'SD', name: 'Soudan', dial: '249', flag: '🇸🇩' },
  { code: 'SS', name: 'Soudan du Sud', dial: '211', flag: '🇸🇸' },
  { code: 'ET', name: 'Éthiopie', dial: '251', flag: '🇪🇹' },
  { code: 'KE', name: 'Kenya', dial: '254', flag: '🇰🇪' },
  { code: 'UG', name: 'Ouganda', dial: '256', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzanie', dial: '255', flag: '🇹🇿' },
  { code: 'RW', name: 'Rwanda', dial: '250', flag: '🇷🇼' },
  { code: 'BI', name: 'Burundi', dial: '257', flag: '🇧🇮' },
  { code: 'DJ', name: 'Djibouti', dial: '253', flag: '🇩🇯' },
  { code: 'SO', name: 'Somalie', dial: '252', flag: '🇸🇴' },
  { code: 'ER', name: 'Érythrée', dial: '291', flag: '🇪🇷' },
  { code: 'MG', name: 'Madagascar', dial: '261', flag: '🇲🇬' },
  { code: 'MU', name: 'Maurice', dial: '230', flag: '🇲🇺' },
  { code: 'SC', name: 'Seychelles', dial: '248', flag: '🇸🇨' },
  { code: 'KM', name: 'Comores', dial: '269', flag: '🇰🇲' },
  { code: 'ZA', name: 'Afrique du Sud', dial: '27', flag: '🇿🇦' },
  { code: 'NA', name: 'Namibie', dial: '264', flag: '🇳🇦' },
  { code: 'BW', name: 'Botswana', dial: '267', flag: '🇧🇼' },
  { code: 'ZW', name: 'Zimbabwe', dial: '263', flag: '🇿🇼' },
  { code: 'ZM', name: 'Zambie', dial: '260', flag: '🇿🇲' },
  { code: 'MW', name: 'Malawi', dial: '265', flag: '🇲🇼' },
  { code: 'MZ', name: 'Mozambique', dial: '258', flag: '🇲🇿' },
  { code: 'FR', name: 'France', dial: '33', flag: '🇫🇷' },
  { code: 'BE', name: 'Belgique', dial: '32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', dial: '41', flag: '🇨🇭' },
  { code: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦' },
  { code: 'US', name: 'États-Unis', dial: '1', flag: '🇺🇸' },
  { code: 'GB', name: 'Royaume-Uni', dial: '44', flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne', dial: '49', flag: '🇩🇪' },
  { code: 'ES', name: 'Espagne', dial: '34', flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal', dial: '351', flag: '🇵🇹' },
  { code: 'IT', name: 'Italie', dial: '39', flag: '🇮🇹' },
  { code: 'AE', name: 'Émirats arabes unis', dial: '971', flag: '🇦🇪' },
  { code: 'SA', name: 'Arabie saoudite', dial: '966', flag: '🇸🇦' },
  { code: 'IN', name: 'Inde', dial: '91', flag: '🇮🇳' },
  { code: 'CN', name: 'Chine', dial: '86', flag: '🇨🇳' },
];

export const DEFAULT_PHONE_COUNTRY = 'ML';

export function phoneCountryOptions(): Array<{ label: string; value: string; dial: string }> {
  return PHONE_COUNTRIES.map((c) => ({
    label: `${c.flag} ${c.name} (+${c.dial})`,
    value: c.code,
    dial: c.dial,
  }));
}

export function findCountryByCode(code: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find((c) => c.code === code);
}

export function findCountryByDial(dial: string): PhoneCountry | undefined {
  const normalized = dial.replace(/\D/g, '');
  // Prefer longer dial codes first to avoid matching "1" before "212"
  return [...PHONE_COUNTRIES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => normalized.startsWith(c.dial));
}

export function splitPhone(value: string | null | undefined): { countryCode: string; national: string } {
  const raw = (value ?? '').trim();
  if (!raw) {
    return { countryCode: DEFAULT_PHONE_COUNTRY, national: '' };
  }
  const digits = raw.replace(/\D/g, '');
  const country = findCountryByDial(digits);
  if (country) {
    return {
      countryCode: country.code,
      national: digits.slice(country.dial.length),
    };
  }
  return { countryCode: DEFAULT_PHONE_COUNTRY, national: digits };
}

export function joinPhone(countryCode: string, national: string): string {
  const country = findCountryByCode(countryCode) ?? findCountryByCode(DEFAULT_PHONE_COUNTRY)!;
  const local = (national ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (!local) return '';
  return `+${country.dial}${local}`;
}
