/**
 * Formatters for capitalisation and display values
 * Used across review pages and PDF generation
 */

/**
 * Capitalise first letter of a string
 */
export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Capitalise first letter of each word
 * Handles hyphenated, underscored, and space-separated words
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Format yes/no values consistently
 */
export const formatYesNo = (value) => {
  if (value === null || value === undefined || value === '') return 'Not specified';
  const lower = value.toString().toLowerCase();
  if (lower === 'yes' || lower === 'true') return 'Yes';
  if (lower === 'no' || lower === 'false') return 'No';
  return capitalizeFirst(value);
};

/**
 * Format any field value with appropriate capitalisation
 * Handles various patterns: yes/no, hyphenated, underscored, etc.
 */
export const formatFieldValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Not specified';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  const str = value.toString();

  // Handle common yes/no patterns
  const lower = str.toLowerCase();
  if (lower === 'yes' || lower === 'true') return 'Yes';
  if (lower === 'no' || lower === 'false') return 'No';

  // Handle hyphenated or underscored values (e.g., "public-sector", "sole_trader")
  if (str.includes('-') || str.includes('_')) {
    return capitalizeWords(str);
  }

  // For simple strings, just capitalise first letter
  return capitalizeFirst(str);
};

/**
 * Format supplier type for display
 * Converts values like "sole_trader", "public-sector" to "Sole Trader", "Public Sector"
 */
export const formatSupplierType = (value) => {
  if (!value) return 'Not specified';
  return capitalizeWords(value);
};

/**
 * Format service category for display
 */
export const formatServiceCategory = (value) => {
  if (!value) return 'Not specified';
  // Handle special cases
  const mappings = {
    'clinical': 'Clinical',
    'non-clinical': 'Non-Clinical',
    'non_clinical': 'Non-Clinical',
    'nonclinical': 'Non-Clinical',
  };
  const lower = value.toLowerCase();
  return mappings[lower] || capitalizeWords(value);
};

/**
 * Format usage frequency for display
 */
export const formatUsageFrequency = (value) => {
  if (!value) return 'Not specified';
  const mappings = {
    'one_time': 'One Time',
    'one-time': 'One Time',
    'onetime': 'One Time',
    'occasional': 'Occasional',
    'regular': 'Regular',
    'ongoing': 'Ongoing',
  };
  const lower = value.toLowerCase();
  return mappings[lower] || capitalizeWords(value);
};

/**
 * Format service types array for display
 * Takes an array of service types and capitalises each one
 * e.g., ["goods", "services", "consultancy"] → "Goods, Services, Consultancy"
 */
export const formatServiceTypes = (types) => {
  if (!types || !Array.isArray(types) || types.length === 0) return 'Not specified';
  return types.map(type => capitalizeFirst(type)).join(', ');
};
