Multiple fixes needed:

## FIX 1: Remove minCharWarning Prop Error

React doesn't recognize `minCharWarning` as a valid DOM attribute. Fix this:

**Search for minCharWarning:**
```bash
grep -rn "minCharWarning" src/
```

**Fix the issue - don't pass custom props to DOM elements:**
```jsx
// WRONG - passing custom prop to textarea:
<textarea
  minCharWarning={true}
  // ...
/>

// CORRECT - remove custom prop from DOM element:
// Use a wrapper or handle warning separately
const TextareaWithValidation = ({ minCharWarning, ...props }) => {
  // Don't pass minCharWarning to the actual textarea
  return (
    <div>
      <textarea {...props} />
      {minCharWarning && (
        <span className="warning">Minimum characters required</span>
      )}
    </div>
  );
};

// OR if using a custom Textarea component, filter out the prop:
const Textarea = ({ minCharWarning, mincharwarning, ...domProps }) => {
  // Destructure custom props so they don't go to DOM
  return <textarea {...domProps} />;
};
```

---

## FIX 2: Remove Q2.5 (Estimated Annual Value)

This question should not be in Section 2. Remove it completely.

**In Section2PreScreening.jsx:**

1. Remove the state for estimatedValue
2. Remove the form group for Q2.5
3. Update question numbering:
   - Q2.1 - Supplier Connection
   - Q2.2 - Letterhead with Bank Details
   - Q2.3 - Justification
   - Q2.4 - Usage Frequency
   - Q2.5 - Service Category (Clinical/Non-clinical) ← Was Q2.6
   - Q2.6 - Procurement Engagement ← Was Q2.7
   - Q2.7 - Acknowledgement ← Was Q2.8

**Find and remove:**
```jsx
// REMOVE THIS ENTIRE SECTION:
{/* Q2.5 - Estimated Annual Value */}
<div className="form-group">
  <QuestionLabel section={2} question={5} label="What is the estimated annual value?" required />
  {/* ... estimated value options ... */}
</div>
```

**Update the conditional logic for subsequent questions:**
```jsx
// Change from:
{estimatedValue && (
  // Q2.6 Service Category
)}

// Change to:
{usageFrequency && (
  // Q2.5 Service Category (renumbered)
)}
```

**Also update:**
- Section7ReviewSubmit.jsx - Remove estimated value from review
- SupplierFormPDF.jsx - Remove estimated value from PDF
- formStore.js - Remove estimatedValue from initial state if present

---

## FIX 3: CRN Auto-populate Address Fields

Currently only company name is populated. Fix to also populate address.

**In Section3Classification.jsx or wherever CRN verification is handled:**
```jsx
const handleCRNVerificationSuccess = (companyData) => {
  console.log('Company data received:', companyData);
  
  // Update Section 3 with CRN
  updateFormData('section3', {
    ...formData.section3,
    crn: companyData.companyNumber,
    crnVerified: true,
  });
  
  // ALSO update Section 4 with company details including ADDRESS
  updateFormData('section4', {
    ...formData.section4,
    companyName: companyData.companyName,
    // Address fields
    registeredAddress: companyData.registeredAddress?.addressLine1 || '',
    addressLine2: companyData.registeredAddress?.addressLine2 || '',
    city: companyData.registeredAddress?.city || companyData.registeredAddress?.locality || '',
    county: companyData.registeredAddress?.county || companyData.registeredAddress?.region || '',
    postcode: companyData.registeredAddress?.postcode || companyData.registeredAddress?.postal_code || '',
    country: companyData.registeredAddress?.country || 'United Kingdom',
  });
  
  // Show success message
  setVerificationSuccess(true);
  setVerificationMessage(`Company verified: ${companyData.companyName}`);
};
```

**Also check the Companies House response structure in companiesHouse.js:**
```javascript
// Ensure the return object has the correct structure:
return {
  success: true,
  companyName: data.company_name,
  companyNumber: data.company_number,
  companyStatus: data.company_status,
  companyType: data.type,
  registeredAddress: {
    addressLine1: data.registered_office_address?.address_line_1 || '',
    addressLine2: data.registered_office_address?.address_line_2 || '',
    city: data.registered_office_address?.locality || '',
    county: data.registered_office_address?.region || '',
    postcode: data.registered_office_address?.postal_code || '',
    country: data.registered_office_address?.country || 'United Kingdom',
  },
  verified: true,
};
```

**In Section4SupplierDetails.jsx, ensure fields are pre-filled:**
```jsx
// Use formData values as defaults
const [companyName, setCompanyName] = useState(formData?.section4?.companyName || '');
const [registeredAddress, setRegisteredAddress] = useState(formData?.section4?.registeredAddress || '');
const [city, setCity] = useState(formData?.section4?.city || '');
const [postcode, setPostcode] = useState(formData?.section4?.postcode || '');

// Update when formData changes (e.g., after CRN verification)
useEffect(() => {
  if (formData?.section4?.companyName) {
    setCompanyName(formData.section4.companyName);
  }
  if (formData?.section4?.registeredAddress) {
    setRegisteredAddress(formData.section4.registeredAddress);
  }
  if (formData?.section4?.city) {
    setCity(formData.section4.city);
  }
  if (formData?.section4?.postcode) {
    setPostcode(formData.section4.postcode);
  }
}, [formData?.section4]);
```

---

## SUMMARY:

1. [ ] Fix minCharWarning prop - don't pass to DOM element
2. [ ] Remove Q2.5 (Estimated Annual Value) completely
3. [ ] Renumber Q2.6 → Q2.5, Q2.7 → Q2.6, Q2.8 → Q2.7
4. [ ] Update Section7ReviewSubmit and PDF
5. [ ] Fix CRN to auto-populate ALL address fields in Section 4
6. [ ] Ensure Section 4 fields update when CRN data arrives

After fixing:
```bash
git add .
git commit -m "Fix: Remove minCharWarning error, remove Q2.5, fix CRN address population"
git push origin main
```

Please implement all fixes.