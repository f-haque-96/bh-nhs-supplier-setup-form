/**
 * useCRNVerification Hook
 * Handles Companies House CRN verification with caching
 * Uses mock data for testing
 */

import { useState, useCallback } from 'react';
import useFormStore from '../stores/formStore';
import { formatCRN } from '../utils/helpers';

// Mock CRN data for testing
const MOCK_CRN_DATA = {
  '12345678': {
    company_name: 'Test Company Ltd',
    company_status: 'active',
    registered_office_address: {
      address_line_1: '123 Test Street',
      locality: 'London',
      postal_code: 'EC1A 1BB',
    },
    date_of_creation: '2020-01-15',
  },
  '00445790': {
    company_name: 'TESCO PLC',
    company_status: 'active',
    registered_office_address: {
      address_line_1: 'Tesco House, Shire Park',
      locality: 'Welwyn Garden City',
      postal_code: 'AL7 1GA',
    },
    date_of_creation: '1947-11-27',
  },
  '04234715': {
    company_name: "SAINSBURY'S SUPERMARKETS LTD",
    company_status: 'active',
    registered_office_address: {
      address_line_1: '33 Holborn',
      locality: 'London',
      postal_code: 'EC1N 2HT',
    },
    date_of_creation: '2001-05-23',
  },
  '01234567': {
    company_name: 'Dissolved Test Company Ltd',
    company_status: 'dissolved',
    registered_office_address: {
      address_line_1: '456 Old Street',
      locality: 'Manchester',
      postal_code: 'M1 1AA',
    },
    date_of_creation: '2010-03-20',
  },
};

const useCRNVerification = () => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'verifying' | 'valid' | 'invalid' | 'dissolved'
  const [companyData, setCompanyData] = useState(null);
  const [error, setError] = useState(null);
  const { getCRNData, setCRNData } = useFormStore();

  const verify = useCallback(
    async (crn) => {
      if (!crn || crn.length < 7) {
        setStatus('idle');
        setCompanyData(null);
        return null;
      }

      // Format and normalize CRN
      const cleanCRN = formatCRN(crn);

      if (cleanCRN.length !== 8) {
        setStatus('invalid');
        setError('CRN must be 7 or 8 digits');
        return null;
      }

      // Check cache first
      const cached = getCRNData(cleanCRN);
      if (cached) {
        setStatus(cached.valid ? (cached.company?.status === 'dissolved' ? 'dissolved' : 'valid') : 'invalid');
        setCompanyData(cached.company);
        return cached;
      }

      // Mock verification with simulated delay
      setStatus('verifying');
      setError(null);

      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Check mock data
        const mockCompany = MOCK_CRN_DATA[cleanCRN];

        if (mockCompany) {
          // Company found in mock data
          const data = {
            valid: true,
            company: {
              name: mockCompany.company_name,
              status: mockCompany.company_status,
              address: `${mockCompany.registered_office_address.address_line_1}, ${mockCompany.registered_office_address.locality}, ${mockCompany.registered_office_address.postal_code}`,
              dateOfCreation: mockCompany.date_of_creation,
            },
          };

          // Cache the result
          setCRNData(cleanCRN, data);

          if (mockCompany.company_status === 'dissolved') {
            setStatus('dissolved');
            setCompanyData(data.company);
            setError('This company is dissolved');
          } else {
            setStatus('valid');
            setCompanyData(data.company);
          }

          return data;
        } else {
          // Company not found
          const data = {
            valid: false,
            message: 'Company not found. Please check the CRN and try again.',
          };

          setCRNData(cleanCRN, data);
          setStatus('invalid');
          setCompanyData(null);
          setError(data.message);

          return data;
        }
      } catch (err) {
        console.error('CRN verification error:', err);
        setStatus('invalid');
        setError('Verification failed. Please try again or enter details manually.');
        return { valid: false, message: err.message };
      }
    },
    [getCRNData, setCRNData]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setCompanyData(null);
    setError(null);
  }, []);

  return {
    verify,
    reset,
    status,
    companyData,
    error,
    isVerifying: status === 'verifying',
    isValid: status === 'valid',
    isInvalid: status === 'invalid' || status === 'dissolved',
  };
};

export default useCRNVerification;
