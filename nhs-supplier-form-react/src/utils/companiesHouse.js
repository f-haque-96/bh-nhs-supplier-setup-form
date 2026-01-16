// Companies House API Integration
const COMPANIES_HOUSE_API_KEY = '7ed689df-a9a5-456b-a5dd-b160465be531';
const API_BASE_URL = 'https://api.company-information.service.gov.uk';

// Error types for better handling
export const CRN_ERROR_TYPES = {
  CORS_BLOCKED: 'CORS_BLOCKED',
  NOT_FOUND: 'NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_CRN: 'INVALID_CRN',
  API_ERROR: 'API_ERROR',
};

export const searchCompany = async (query) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/search/companies?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Basic ${btoa(COMPANIES_HOUSE_API_KEY + ':')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Company search failed');
    }

    const data = await response.json();
    return { success: true, data: data.items || [] };
  } catch (error) {
    console.error('Companies House search error:', error);

    // Check if it's a CORS error
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      return {
        success: false,
        error: CRN_ERROR_TYPES.CORS_BLOCKED,
        message: 'Unable to verify CRN due to browser restrictions. Please enter company details manually.'
      };
    }

    return { success: false, error: CRN_ERROR_TYPES.API_ERROR, data: [] };
  }
};

export const getCompanyDetails = async (companyNumber) => {
  try {
    // Validate CRN format
    const cleanedNumber = companyNumber.toString().replace(/\s/g, '');
    if (!/^[A-Z0-9]{6,8}$/i.test(cleanedNumber)) {
      return {
        success: false,
        error: CRN_ERROR_TYPES.INVALID_CRN,
        message: 'Invalid CRN format. CRN should be 6-8 alphanumeric characters.'
      };
    }

    // Pad company number to 8 digits (only for numeric CRNs)
    const paddedNumber = /^\d+$/.test(cleanedNumber)
      ? cleanedNumber.padStart(8, '0')
      : cleanedNumber.toUpperCase();

    const response = await fetch(
      `${API_BASE_URL}/company/${paddedNumber}`,
      {
        headers: {
          'Authorization': `Basic ${btoa(COMPANIES_HOUSE_API_KEY + ':')}`,
        },
      }
    );

    if (response.status === 404) {
      return {
        success: false,
        error: CRN_ERROR_TYPES.NOT_FOUND,
        message: 'Company not found on Companies House. Please check the CRN or enter details manually.'
      };
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract and format relevant data
    return {
      success: true,
      data: {
        companyName: data.company_name,
        companyNumber: data.company_number,
        companyStatus: data.company_status,
        companyType: data.type,
        dateOfCreation: data.date_of_creation,
        registeredAddress: {
          addressLine1: data.registered_office_address?.address_line_1 || '',
          addressLine2: data.registered_office_address?.address_line_2 || '',
          city: data.registered_office_address?.locality || '',
          county: data.registered_office_address?.region || '',
          postcode: data.registered_office_address?.postal_code || '',
          country: data.registered_office_address?.country || 'United Kingdom',
        },
        sicCodes: data.sic_codes || [],
        accounts: {
          lastAccountsDate: data.accounts?.last_accounts?.made_up_to,
          nextAccountsDue: data.accounts?.next_due,
          accountingReferenceDate: data.accounts?.accounting_reference_date,
        },
        confirmationStatement: {
          lastMadeUpTo: data.confirmation_statement?.last_made_up_to,
          nextDue: data.confirmation_statement?.next_due,
        },
        hasCharges: data.has_charges,
        hasInsolvencyHistory: data.has_insolvency_history,
        jurisdiction: data.jurisdiction,
        verified: true,
      }
    };
  } catch (error) {
    console.error('Companies House fetch error:', error);

    // Check if it's a CORS error (browser blocks cross-origin requests)
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      return {
        success: false,
        error: CRN_ERROR_TYPES.CORS_BLOCKED,
        message: 'Unable to verify CRN due to browser restrictions. You can still proceed by entering company details manually in the next section.'
      };
    }

    return {
      success: false,
      error: CRN_ERROR_TYPES.NETWORK_ERROR,
      message: 'Network error occurred. Please check your connection or enter details manually.'
    };
  }
};

// Format company type for display
export const formatCompanyType = (type) => {
  const typeMap = {
    'ltd': 'Private Limited Company',
    'private-limited-guarant-nsc': 'Private Limited by Guarantee',
    'plc': 'Public Limited Company',
    'llp': 'Limited Liability Partnership',
    'private-unlimited': 'Private Unlimited Company',
    'old-public-company': 'Old Public Company',
    'private-limited-guarant-nsc-limited-exemption': 'Private Limited (Exempt)',
    'limited-partnership': 'Limited Partnership',
    'registered-society-non-jurisdictional': 'Registered Society',
    'charitable-incorporated-organisation': 'Charitable Incorporated Organisation',
  };

  return typeMap[type] || type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
};
