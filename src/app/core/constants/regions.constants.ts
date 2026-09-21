import { Region } from '../../models/location.model';

/**
 * Standard reference regions for USA and Canada with unique compound IDs (e.g. 'US-CA', 'CA-AB').
 */
export const REGIONS: Region[] = [
  // United States (50 states + DC + Territories)
  { id: 'US-AL', countryId: 'US', code: 'AL', name: 'Alabama' },
  { id: 'US-AK', countryId: 'US', code: 'AK', name: 'Alaska' },
  { id: 'US-AZ', countryId: 'US', code: 'AZ', name: 'Arizona' },
  { id: 'US-AR', countryId: 'US', code: 'AR', name: 'Arkansas' },
  { id: 'US-CA', countryId: 'US', code: 'CA', name: 'California' },
  { id: 'US-CO', countryId: 'US', code: 'CO', name: 'Colorado' },
  { id: 'US-CT', countryId: 'US', code: 'CT', name: 'Connecticut' },
  { id: 'US-DE', countryId: 'US', code: 'DE', name: 'Delaware' },
  { id: 'US-FL', countryId: 'US', code: 'FL', name: 'Florida' },
  { id: 'US-GA', countryId: 'US', code: 'GA', name: 'Georgia' },
  { id: 'US-HI', countryId: 'US', code: 'HI', name: 'Hawaii' },
  { id: 'US-ID', countryId: 'US', code: 'ID', name: 'Idaho' },
  { id: 'US-IL', countryId: 'US', code: 'IL', name: 'Illinois' },
  { id: 'US-IN', countryId: 'US', code: 'IN', name: 'Indiana' },
  { id: 'US-IA', countryId: 'US', code: 'IA', name: 'Iowa' },
  { id: 'US-KS', countryId: 'US', code: 'KS', name: 'Kansas' },
  { id: 'US-KY', countryId: 'US', code: 'KY', name: 'Kentucky' },
  { id: 'US-LA', countryId: 'US', code: 'LA', name: 'Louisiana' },
  { id: 'US-ME', countryId: 'US', code: 'ME', name: 'Maine' },
  { id: 'US-MD', countryId: 'US', code: 'MD', name: 'Maryland' },
  { id: 'US-MA', countryId: 'US', code: 'MA', name: 'Massachusetts' },
  { id: 'US-MI', countryId: 'US', code: 'MI', name: 'Michigan' },
  { id: 'US-MN', countryId: 'US', code: 'MN', name: 'Minnesota' },
  { id: 'US-MS', countryId: 'US', code: 'MS', name: 'Mississippi' },
  { id: 'US-MO', countryId: 'US', code: 'MO', name: 'Missouri' },
  { id: 'US-MT', countryId: 'US', code: 'MT', name: 'Montana' },
  { id: 'US-NE', countryId: 'US', code: 'NE', name: 'Nebraska' },
  { id: 'US-NV', countryId: 'US', code: 'NV', name: 'Nevada' },
  { id: 'US-NH', countryId: 'US', code: 'NH', name: 'New Hampshire' },
  { id: 'US-NJ', countryId: 'US', code: 'NJ', name: 'New Jersey' },
  { id: 'US-NM', countryId: 'US', code: 'NM', name: 'New Mexico' },
  { id: 'US-NY', countryId: 'US', code: 'NY', name: 'New York' },
  { id: 'US-NC', countryId: 'US', code: 'NC', name: 'North Carolina' },
  { id: 'US-ND', countryId: 'US', code: 'ND', name: 'North Dakota' },
  { id: 'US-OH', countryId: 'US', code: 'OH', name: 'Ohio' },
  { id: 'US-OK', countryId: 'US', code: 'OK', name: 'Oklahoma' },
  { id: 'US-OR', countryId: 'US', code: 'OR', name: 'Oregon' },
  { id: 'US-PA', countryId: 'US', code: 'PA', name: 'Pennsylvania' },
  { id: 'US-RI', countryId: 'US', code: 'RI', name: 'Rhode Island' },
  { id: 'US-SC', countryId: 'US', code: 'SC', name: 'South Carolina' },
  { id: 'US-SD', countryId: 'US', code: 'SD', name: 'South Dakota' },
  { id: 'US-TN', countryId: 'US', code: 'TN', name: 'Tennessee' },
  { id: 'US-TX', countryId: 'US', code: 'TX', name: 'Texas' },
  { id: 'US-UT', countryId: 'US', code: 'UT', name: 'Utah' },
  { id: 'US-VT', countryId: 'US', code: 'VT', name: 'Vermont' },
  { id: 'US-VA', countryId: 'US', code: 'VA', name: 'Virginia' },
  { id: 'US-WA', countryId: 'US', code: 'WA', name: 'Washington' },
  { id: 'US-WV', countryId: 'US', code: 'WV', name: 'West Virginia' },
  { id: 'US-WI', countryId: 'US', code: 'WI', name: 'Wisconsin' },
  { id: 'US-WY', countryId: 'US', code: 'WY', name: 'Wyoming' },
  { id: 'US-DC', countryId: 'US', code: 'DC', name: 'District of Columbia' },
  { id: 'US-PR', countryId: 'US', code: 'PR', name: 'Puerto Rico' },
  { id: 'US-GU', countryId: 'US', code: 'GU', name: 'Guam' },
  { id: 'US-VI', countryId: 'US', code: 'VI', name: 'Virgin Islands' },

  // Canada (10 Provinces + 3 Territories)
  { id: 'CA-AB', countryId: 'CA', code: 'AB', name: 'Alberta' },
  { id: 'CA-BC', countryId: 'CA', code: 'BC', name: 'British Columbia' },
  { id: 'CA-MB', countryId: 'CA', code: 'MB', name: 'Manitoba' },
  { id: 'CA-NB', countryId: 'CA', code: 'NB', name: 'New Brunswick' },
  { id: 'CA-NL', countryId: 'CA', code: 'NL', name: 'Newfoundland and Labrador' },
  { id: 'CA-NS', countryId: 'CA', code: 'NS', name: 'Nova Scotia' },
  { id: 'CA-NT', countryId: 'CA', code: 'NT', name: 'Northwest Territories' },
  { id: 'CA-NU', countryId: 'CA', code: 'NU', name: 'Nunavut' },
  { id: 'CA-ON', countryId: 'CA', code: 'ON', name: 'Ontario' },
  { id: 'CA-PE', countryId: 'CA', code: 'PE', name: 'Prince Edward Island' },
  { id: 'CA-QC', countryId: 'CA', code: 'QC', name: 'Quebec' },
  { id: 'CA-SK', countryId: 'CA', code: 'SK', name: 'Saskatchewan' },
  { id: 'CA-YT', countryId: 'CA', code: 'YT', name: 'Yukon' },
];

export const REGIONS_MAP = new Map<string, Region>(REGIONS.map((r) => [r.id, r]));

export function getRegionsByCountry(countryId: string): Region[] {
  return REGIONS.filter((r) => r.countryId === countryId);
}
