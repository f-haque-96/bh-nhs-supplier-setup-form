Please continue implementing the remaining fixes. Here are the details:

## FIX 4: Sole Trader ID Upload Consent Box

Find where passport/ID upload is handled (likely Section2PreScreening.jsx or Section3SupplierClassification.jsx) and add consent:
```jsx
// Add state for consent
const [idConsentGiven, setIdConsentGiven] = useState(false);

// Find where sole trader ID upload is and wrap it:
{supplierType === 'sole_trader' && (
  <div className="id-upload-section">
    <div className="consent-notice" style={{
      background: '#fef3c7',
      border: '1px solid #f59e0b',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <h4 style={{ margin: '0 0 8px 0', color: '#92400e' }}>
        🔒 Identification Upload Required
      </h4>
      <p style={{ margin: '0 0 8px 0', color: '#78350f' }}>
        As a sole trader, you are required to provide a copy of your passport or driving licence for verification purposes.
      </p>
      <p style={{
        background: '#fef9c3',
        padding: '12px',
        borderRadius: '6px',
        fontSize: '0.9rem',
        margin: '0'
      }}>
        <strong>Data Security:</strong> Your identification document will be securely stored only during the approval process. 
        Once your supplier setup is complete, this sensitive document will be <strong>automatically deleted</strong> from our systems.
      </p>
    </div>
    
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={idConsentGiven}
        onChange={(e) => setIdConsentGiven(e.target.checked)}
        style={{ width: '24px', height: '24px', marginTop: '4px' }}
      />
      <span>
        I consent to uploading my identification document. I understand that my ID will be used solely for verification purposes, 
        stored securely during the approval process, and automatically deleted once my supplier setup is complete.
      </span>
    </label>
    
    {idConsentGiven && (
      <FileUpload
        label="Passport or Driving Licence"
        name="passportPhoto"
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={5}
        required
      />
    )}
  </div>
)}
```

---

## FIX 5: Remove Duplicate Helpdesk Links

Search for HelpModal, HelpButton, or FAQ components:
```bash
grep -rn "Contact Procurement\|helpdesk\|Helpdesk" src/
```

Then update to keep only ONE helpdesk link with the correct URL:
```jsx
// REMOVE any duplicate "Contact Procurement" mailto link
// KEEP and rename to "Procurement Helpdesk":
<a 
  href="https://servicedeskbartshealth.alembacloud.com/production/Portal.aspx?Form=Dashboard&DATABASE=Production&JAVA_FLAG=1&PORTAL=procurement&HTML_TYPE=LITE"
  target="_blank"
  rel="noopener noreferrer"
  className="help-link"
>
  🎫 Procurement Helpdesk
</a>
```

---

## FIX 6: PBP Rejection Audit Trail

Find PBPReviewPage.jsx and update the rejection handler:
```jsx
const handleRejection = () => {
  // ... existing rejection logic ...
  
  // Add audit trail entry for flagged requester
  const auditEntry = {
    submissionId: submissionId,
    timestamp: new Date().toISOString(),
    action: 'PBP_REJECTED',
    user: reviewerName,
    userEmail: '', // Add if available
    requesterFlagged: true,
    requesterName: `${submission?.formData?.section1?.firstName || submission?.formData?.firstName} ${submission?.formData?.section1?.lastName || submission?.formData?.lastName}`,
    requesterEmail: submission?.submittedBy || submission?.formData?.section1?.nhsEmail || submission?.formData?.nhsEmail,
    companyName: submission?.formData?.section4?.companyName || submission?.formData?.companyName,
    rejectionReason: comments,
    details: `PBP REJECTED - Requester flagged for review`
  };
  
  // Store in audit trail
  const auditTrail = JSON.parse(localStorage.getItem('auditTrail') || '[]');
  auditTrail.push(auditEntry);
  localStorage.setItem('auditTrail', JSON.stringify(auditTrail));
  
  console.log('AUDIT: Requester flagged for PBP rejection:', auditEntry);
};
```

---

## FIX 7: Enlarge Questionnaire Submit Button

Find the questionnaire submit button and update:
```bash
grep -rn "Submit.*Questionnaire\|questionnaire.*submit" src/
```

Update the button styling:
```jsx
<button 
  type="submit" 
  className="btn-submit-questionnaire"
  disabled={!isComplete}
  style={{
    width: '100%',
    padding: '16px 32px',
    fontSize: '1.1rem',
    fontWeight: '600',
    background: '#005EB8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '24px'
  }}
>
  Submit Questionnaire for PBP Review
</button>
```

Or add CSS class in index.css:
```css
.btn-submit-questionnaire {
  width: 100%;
  padding: 16px 32px !important;
  font-size: 1.1rem !important;
  font-weight: 600;
  background: #005EB8;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 24px;
  transition: all 0.2s;
}

.btn-submit-questionnaire:hover:not(:disabled) {
  background: #003d7a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 94, 184, 0.3);
}

.btn-submit-questionnaire:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}
```

---

## FIX 8: Reduce Error Message Spacing

In index.css, find and update error message styles:
```css
/* Error message styling - reduced spacing */
.error-message,
.field-error,
.validation-error,
.error-text {
  color: #dc2626;
  font-size: 0.85rem;
  margin-top: 4px !important;
  margin-bottom: 0 !important;
  padding: 0;
}

/* Remove excessive margin from form fields before error */
.form-group input + .error-message,
.form-group select + .error-message,
.form-group textarea + .error-message,
.form-field input + .error-message,
.form-field select + .error-message {
  margin-top: 4px !important;
}

/* Ensure form groups have consistent spacing */
.form-group,
.form-field {
  margin-bottom: 20px;
}

.form-group input,
.form-group select,
.form-group textarea {
  margin-bottom: 2px;
}
```

---

## FIX 9: Declaration Before Radio Buttons (Question 2.7)

Find Section2PreScreening.jsx and update the supplier connection question:
```jsx
{/* Question 2.7 - Supplier Connection */}
<div className="form-group">
  <QuestionLabel 
    section={2} 
    question={7} 
    label="Do you have any personal or financial connection to this supplier?" 
    required 
  />
  
  {/* Declaration text BEFORE radio buttons */}
  <div className="declaration-notice" style={{
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px'
  }}>
    <p style={{ margin: '0 0 8px 0' }}>
      <strong>Declaration of Interest:</strong> You must declare if you, or any close family member, 
      have any personal, financial, or business relationship with this supplier. This includes:
    </p>
    <ul style={{ margin: '0 0 12px 0', paddingLeft: '24px' }}>
      <li>Ownership or shareholding in the supplier company</li>
      <li>Employment relationship (current or former)</li>
      <li>Family members who work for or own the supplier</li>
      <li>Any financial benefit from the supplier relationship</li>
    </ul>
    <p style={{ color: '#dc2626', fontWeight: '600', margin: '0' }}>
      ⚠️ Failure to declare a conflict of interest may result in disciplinary action.
    </p>
  </div>
  
  {/* Radio buttons AFTER declaration */}
  <div className="radio-group">
    {/* ... existing radio buttons ... */}
  </div>
</div>
```

---

## FIX 10: Companies House API Integration

Create new file: src/utils/companiesHouse.js
```javascript
// Companies House API Integration
const API_KEY = '7ed689df-a9a5-456b-a5dd-b160465be531';
const API_BASE = 'https://api.company-information.service.gov.uk';

export const getCompanyDetails = async (companyNumber) => {
  try {
    const paddedNumber = companyNumber.toString().padStart(8, '0');
    
    const response = await fetch(`${API_BASE}/company/${paddedNumber}`, {
      headers: {
        'Authorization': `Basic ${btoa(API_KEY + ':')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Company not found');
    }
    
    const data = await response.json();
    
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
      },
      verified: true,
    };
  } catch (error) {
    console.error('Companies House API error:', error);
    return null;
  }
};
```

Then in Section3SupplierClassification.jsx, add the verify button handler:
```jsx
import { getCompanyDetails } from '../utils/companiesHouse';

const [isVerifying, setIsVerifying] = useState(false);
const [verificationResult, setVerificationResult] = useState(null);

const handleVerifyCRN = async () => {
  if (!crn || crn.length < 6) return;
  
  setIsVerifying(true);
  const result = await getCompanyDetails(crn);
  
  if (result) {
    setVerificationResult(result);
    
    // Auto-populate Section 3
    updateFormData('section3', {
      ...formData.section3,
      crn: result.companyNumber,
      crnVerified: true,
      crnCompanyName: result.companyName,
    });
    
    // Auto-populate Section 4
    updateFormData('section4', {
      ...formData.section4,
      companyName: result.companyName,
      registeredAddress: result.registeredAddress.addressLine1,
      addressLine2: result.registeredAddress.addressLine2,
      city: result.registeredAddress.city,
      postcode: result.registeredAddress.postcode,
    });
  }
  
  setIsVerifying(false);
};
```

---

## SUMMARY - Implement in this order:

1. [ ] Fix 8: Error message spacing (CSS - quick fix)
2. [ ] Fix 5: Remove duplicate helpdesk links
3. [ ] Fix 7: Enlarge questionnaire submit button
4. [ ] Fix 9: Declaration before radio buttons
5. [ ] Fix 6: PBP rejection audit trail
6. [ ] Fix 4: Sole trader ID consent box
7. [ ] Fix 10: Companies House API integration

Please implement all remaining fixes.