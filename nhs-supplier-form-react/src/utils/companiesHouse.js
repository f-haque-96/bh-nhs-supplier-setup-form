// Companies House API Integration
const COMPANIES_HOUSE_API_KEY = '7ed689df-a9a5-456b-a5dd-b160465be531';
const API_BASE_URL = 'https://api.company-information.service.gov.uk';

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
    return data.items || [];
  } catch (error) {
    console.error('Companies House search error:', error);
    return [];
  }
};

export const getCompanyDetails = async (companyNumber) => {
  try {
    // Pad company number to 8 digits
    const paddedNumber = companyNumber.toString().padStart(8, '0');

    const response = await fetch(
      `${API_BASE_URL}/company/${paddedNumber}`,
      {
        headers: {
          'Authorization': `Basic ${btoa(COMPANIES_HOUSE_API_KEY + ':')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Company not found');
    }

    const data = await response.json();

    // Extract and format relevant data
    return {
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
    };
  } catch (error) {
    console.error('Companies House fetch error:', error);
    return null;
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
