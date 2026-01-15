The previous fixes created new problems. Please fix these issues:

## PROBLEM 1: Input Field Shrinks When Error Appears

The input field becomes thinner/smaller when the error message appears below it. The input should maintain its full size regardless of error state.

**Fix in index.css:**
```css
/* CRITICAL FIX: Input fields should NOT shrink when errors appear */

/* Ensure input fields maintain consistent size */
input[type="text"],
input[type="email"],
input[type="tel"],
input[type="number"],
input[type="password"],
input[type="date"],
select,
textarea,
.form-control {
  width: 100% !important;
  box-sizing: border-box !important;
  min-height: 44px;
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

/* Input with error state - only change border color, NOT size */
input.error,
input.has-error,
input:invalid:not(:placeholder-shown),
select.error,
textarea.error,
.form-control.error {
  border-color: #dc2626 !important;
  /* DO NOT change width, padding, or any sizing properties */
}

/* Error message styling - should NOT affect input size */
.error-message,
.field-error,
.validation-error {
  display: block;
  color: #dc2626;
  font-size: 0.85rem;
  margin-top: 4px;
  margin-bottom: 0;
  padding: 0;
  /* These should not affect the input above */
  position: relative;
  width: auto;
}

/* Form group container - maintain consistent layout */
.form-group,
.form-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
  width: 100%;
}

/* Ensure the input wrapper doesn't change size */
.input-wrapper,
.field-wrapper {
  width: 100%;
}

/* REMOVE any CSS that might be causing the input to shrink */
/* Check for flex-shrink, flex-grow issues */
.form-group input,
.form-field input {
  flex-shrink: 0 !important;
  flex-grow: 0 !important;
}
```

**Also check the component - the input might be in a flex container causing issues:**
```jsx
// In the form component, ensure input is not affected by flex
<div className="form-group" style={{ width: '100%' }}>
  <label>1.1 First Name *</label>
  <input
    type="text"
    style={{ width: '100%', boxSizing: 'border-box' }}
    // ... other props
  />
  {error && <span className="error-message">{error}</span>}
</div>
```

---

## PROBLEM 2: Submit Questionnaire Button Design Changed

The button now has a grey background and different styling. Restore the proper NHS blue button design:

**Fix in QuestionnaireModal.jsx:**

Find the submit button and update:
```jsx
<button 
  type="submit"
  className="btn-primary"
  disabled={isSubmitting || !isValid}
  style={{
    backgroundColor: '#005EB8',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    minWidth: '180px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    opacity: (isSubmitting || !isValid) ? 0.7 : 1,
  }}
>
  {isSubmitting ? (
    <>
      <span className="spinner-small" style={{
        width: '16px',
        height: '16px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        display: 'inline-block'
      }}></span>
      Submitting...
    </>
  ) : (
    'Submit Questionnaire'
  )}
</button>
```

**Fix in index.css - ensure btn-primary has correct styling:**
```css
/* Primary Button Styling */
.btn-primary,
button[type="submit"].btn-primary {
  background-color: #005EB8 !important;
  color: white !important;
  padding: 12px 24px;
  border: none !important;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  min-width: 150px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background-color 0.2s, opacity 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background-color: #003d7a !important;
}

.btn-primary:disabled {
  background-color: #005EB8 !important;
  opacity: 0.7;
  cursor: not-allowed;
}

/* Remove any grey button styling that might be overriding */
.btn-primary:not(:hover):not(:active):not(:focus) {
  background-color: #005EB8 !important;
}

/* Modal specific button fix */
.modal-footer .btn-primary,
.questionnaire-modal .btn-primary,
.modal-actions .btn-primary {
  background-color: #005EB8 !important;
  color: white !important;
}

/* Spinner animation */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
```

---

## NOW CONTINUE WITH REMAINING FIXES:

### FIX 4: AP Control Uploaded Documents Viewer

Add to APControlReviewPage.jsx after the Previous Authorisations section:
```jsx
{/* Uploaded Documents Section */}
<div className="section-card" style={{ marginTop: '24px' }}>
  <h3 style={{ color: '#005EB8', marginBottom: '16px' }}>📎 Uploaded Documents</h3>
  <p style={{ color: '#6b7280', marginBottom: '16px' }}>
    All documents uploaded during the submission process:
  </p>
  
  <div style={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
    gap: '16px' 
  }}>
    {/* Letterhead */}
    {(submission?.uploads?.letterhead || submission?.uploadedFiles?.letterhead) && (
      <DocumentCard 
        title="Letterhead with Bank Details"
        file={submission?.uploads?.letterhead || submission?.uploadedFiles?.letterhead}
        section="Section 2: Pre-screening"
        onPreview={handlePreviewDocument}
      />
    )}
    
    {/* Procurement Approval */}
    {(submission?.uploads?.procurementApproval || submission?.uploadedFiles?.procurementApproval) && (
      <DocumentCard 
        title="Procurement Approval Document"
        file={submission?.uploads?.procurementApproval || submission?.uploadedFiles?.procurementApproval}
        section="Section 2: Pre-screening"
        onPreview={handlePreviewDocument}
      />
    )}
    
    {/* CEST Form */}
    {(submission?.uploads?.cestForm || submission?.uploadedFiles?.cestForm) && (
      <DocumentCard 
        title="CEST Form"
        file={submission?.uploads?.cestForm || submission?.uploadedFiles?.cestForm}
        section="Section 2: Pre-screening"
        onPreview={handlePreviewDocument}
      />
    )}
    
    {/* Contract Agreement */}
    {(submission?.contractDrafter?.contract) && (
      <DocumentCard 
        title="Contract Agreement"
        file={submission?.contractDrafter?.contract}
        section={`Uploaded by: ${submission?.contractDrafter?.uploadedBy || 'Contract Drafter'}`}
        onPreview={handlePreviewDocument}
      />
    )}
    
    {/* Identity Document - Restricted */}
    {(submission?.uploads?.passportPhoto || submission?.uploadedFiles?.passportPhoto) && (
      <div style={{
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔒</div>
        <h4 style={{ margin: '0 0 4px 0' }}>Identity Document</h4>
        <p style={{ fontSize: '0.85rem', color: '#d97706', margin: 0 }}>
          ⚠️ Sensitive document - View restricted
        </p>
        <span style={{
          display: 'inline-block',
          background: '#22c55e',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '0.85rem',
          marginTop: '12px'
        }}>✓ Verified</span>
      </div>
    )}
  </div>
  
  {/* No documents */}
  {!submission?.uploads && !submission?.uploadedFiles && !submission?.contractDrafter?.contract && (
    <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
      No documents were uploaded with this submission.
    </p>
  )}
</div>
```

**Add DocumentCard component (inline or separate):**
```jsx
const DocumentCard = ({ title, file, section, onPreview }) => (
  <div style={{
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px'
  }}>
    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📄</div>
    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{title}</h4>
    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 4px 0', wordBreak: 'break-all' }}>
      {file?.name || 'document.pdf'}
    </p>
    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0 0 12px 0' }}>
      {section}
    </p>
    <button
      onClick={() => onPreview(file)}
      style={{
        padding: '8px 16px',
        background: '#005EB8',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem'
      }}
    >
      Preview
    </button>
  </div>
);
```

**Add handlePreviewDocument function:**
```jsx
const handlePreviewDocument = (file) => {
  if (!file) {
    alert('Document not available');
    return;
  }
  
  const base64Data = file.base64 || file.data || file.content;
  
  if (base64Data) {
    const newWindow = window.open();
    if (newWindow) {
      const isPDF = file.type?.includes('pdf') || file.name?.toLowerCase().endsWith('.pdf');
      
      if (isPDF) {
        newWindow.document.write(`
          <html>
            <head><title>${file.name || 'Document Preview'}</title></head>
            <body style="margin:0;">
              <iframe src="${base64Data}" style="width:100%;height:100vh;border:none;"></iframe>
            </body>
          </html>
        `);
      } else {
        newWindow.document.write(`
          <html>
            <head><title>${file.name || 'Image Preview'}</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f3f4f6;">
              <img src="${base64Data}" style="max-width:100%;max-height:100vh;" />
            </body>
          </html>
        `);
      }
    }
  } else {
    alert('Document preview not available');
  }
};
```

---

### FIX 6: Swap Questions 2.2 and 2.3

In Section2PreScreening.jsx, find and swap these questions:

**Current order:**
- 2.2: Do you have a letterhead with bank details?
- 2.3: Have you engaged with the Procurement team?

**New order:**
- 2.2: Have you engaged with the Procurement team?
- 2.3: Do you have a letterhead with bank details?

Search for these questions and swap their question numbers:
```jsx
{/* Question 2.2 - Procurement Engagement (MOVED UP) */}
<div className="form-group">
  <QuestionLabel 
    section={2} 
    question={2}  // Changed from 3
    label="Have you engaged with the Procurement team?" 
    required 
  />
  {/* ... radio buttons for procurement engagement ... */}
</div>

{/* Question 2.3 - Letterhead (MOVED DOWN) */}
<div className="form-group">
  <QuestionLabel 
    section={2} 
    question={3}  // Changed from 2
    label="Do you have a letterhead with bank details from the supplier?" 
    required 
  />
  {/* ... radio buttons and upload for letterhead ... */}
</div>
```

Also update in:
- Section7ReviewSubmit.jsx (review display)
- SupplierFormPDF.jsx (PDF output)

---

### FIX 7: Asterisk Alignment

Fix the red asterisk to align with the label text:
```css
/* Question Label with Asterisk - Proper Alignment */
.question-label,
.form-label,
label {
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #1f2937;
}

/* Question number */
.question-number {
  color: #005EB8;
  font-weight: 600;
}

/* Required asterisk - align with text baseline */
.required-asterisk,
.required,
label .required {
  color: #dc2626;
  font-size: 1rem;
  font-weight: normal;
  line-height: 1;
  vertical-align: baseline;
  margin-left: 2px;
}

/* If using a separate span for asterisk */
span.required::after,
.required-indicator::after {
  content: '*';
  color: #dc2626;
  margin-left: 2px;
}
```

---

### FIX 8: Supplier Connection Details on PDF/Review

**In Section7ReviewSubmit.jsx - find Section 2 review and add:**
```jsx
{/* Supplier Connection */}
<div className="review-row">
  <span className="label">Supplier Connection:</span>
  <span className="value">
    {section2?.supplierConnection === 'yes' ? 'Yes - Declaration Required' : 'No'}
  </span>
</div>

{section2?.supplierConnection === 'yes' && section2?.connectionDetails && (
  <div className="review-row">
    <span className="label">Connection Details:</span>
    <span className="value">{section2.connectionDetails}</span>
  </div>
)}
```

**In SupplierFormPDF.jsx - find Section 2 and add:**
```jsx
{/* Supplier Connection */}
<View style={styles.fieldRow}>
  <Text style={styles.fieldLabel}>Supplier Connection:</Text>
  <Text style={styles.fieldValue}>
    {section2?.supplierConnection === 'yes' ? 'Yes - Declaration Required' : 'No'}
  </Text>
</View>

{section2?.supplierConnection === 'yes' && section2?.connectionDetails && (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>Connection Details:</Text>
    <Text style={styles.fieldValue}>{section2.connectionDetails}</Text>
  </View>
)}
```

**Also ensure the data is being saved in Section2PreScreening.jsx:**
```jsx
// When user enters connection details
const handleConnectionDetailsChange = (e) => {
  const value = e.target.value;
  setConnectionDetails(value);
  
  // Update form store
  updateFormData('section2', {
    ...formData.section2,
    supplierConnection: 'yes',
    connectionDetails: value
  });
};
```

---

### FIX 9: CRN Verification with CORS Fallback

**Update src/utils/companiesHouse.js:**
```javascript
const API_KEY = '7ed689df-a9a5-456b-a5dd-b160465be531';

export const getCompanyDetails = async (companyNumber) => {
  try {
    const cleanNumber = companyNumber.toString().replace(/\s/g, '').padStart(8, '0');
    
    console.log('Attempting to fetch company:', cleanNumber);
    
    // Try direct API call first
    const response = await fetch(
      `https://api.company-information.service.gov.uk/company/${cleanNumber}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(API_KEY + ':')}`,
        },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return {
        companyName: data.company_name,
        companyNumber: data.company_number,
        companyStatus: data.company_status,
        companyType: data.type,
        registeredAddress: {
          addressLine1: data.registered_office_address?.address_line_1 || '',
          addressLine2: data.registered_office_address?.address_line_2 || '',
          city: data.registered_office_address?.locality || '',
          postcode: data.registered_office_address?.postal_code || '',
        },
        verified: true,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Companies House API error (likely CORS):', error);
    return null;
  }
};
```

**In Section3Classification.jsx, add fallback UI:**
```jsx
const [verificationStatus, setVerificationStatus] = useState('idle'); // idle, loading, success, failed

const handleVerifyCRN = async () => {
  if (!crn || crn.length < 6) {
    setVerificationStatus('failed');
    setVerificationError('Please enter a valid CRN (minimum 6 characters)');
    return;
  }
  
  setVerificationStatus('loading');
  
  const result = await getCompanyDetails(crn);
  
  if (result) {
    setVerificationStatus('success');
    setCompanyData(result);
    // Auto-populate fields...
  } else {
    setVerificationStatus('failed');
    setVerificationError(
      'Unable to verify automatically. This may be due to browser security restrictions. ' +
      'Please verify manually on Companies House and enter details below.'
    );
  }
};

// In JSX:
{verificationStatus === 'failed' && (
  <div style={{ 
    background: '#fef3c7', 
    border: '1px solid #f59e0b', 
    borderRadius: '8px', 
    padding: '16px', 
    marginTop: '12px' 
  }}>
    <p style={{ margin: '0 0 8px 0', color: '#92400e' }}>{verificationError}</p>
    
      href={`https://find-and-update.company-information.service.gov.uk/company/${crn.padStart(8, '0')}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#005EB8', fontWeight: '600' }}
    >
      → Verify on Companies House website
    </a>
  </div>
)}
```

---

### FIX 10: Questionnaire Uploads on PBP Page

**In QuestionnaireModal.jsx, ensure uploads are saved:**
```jsx
const handleSubmit = () => {
  const questionnaireSubmission = {
    ...questionnaireData,
    type: isClinical ? 'clinical' : 'non-clinical',
    uploads: uploadedFiles,
    submittedAt: new Date().toISOString(),
  };
  
  // Save to localStorage
  localStorage.setItem('questionnaireSubmission', JSON.stringify(questionnaireSubmission));
  
  // Update form store
  updateFormData('section2', {
    ...formData.section2,
    questionnaireCompleted: true,
    questionnaireData: questionnaireSubmission,
  });
  
  console.log('Questionnaire saved with uploads:', questionnaireSubmission);
};
```

**In PBPReviewPage.jsx, retrieve and display uploads:**
```jsx
// In useEffect or data loading
useEffect(() => {
  // Try to get questionnaire data
  const questionnaireData = localStorage.getItem('questionnaireSubmission');
  if (questionnaireData) {
    const parsed = JSON.parse(questionnaireData);
    setQuestionnaireUploads(parsed.uploads || {});
  }
}, []);

// In render - show uploads
{Object.keys(questionnaireUploads).length > 0 && (
  <div className="section-card">
    <h4>Questionnaire Uploads</h4>
    {Object.entries(questionnaireUploads).map(([key, file]) => (
      file && (
        <div key={key} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '6px',
          marginBottom: '8px'
        }}>
          <span>📄</span>
          <span style={{ flex: 1 }}>{file.name || key}</span>
          <button
            onClick={() => handlePreviewDocument(file)}
            style={{
              padding: '6px 12px',
              background: '#005EB8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Preview
          </button>
        </div>
      )
    ))}
  </div>
)}
```

---

## AFTER ALL FIXES - Push to GitHub:
```bash
git add .
git commit -m "Fixed input shrinking, button styling, and completed remaining fixes

- Fixed input field shrinking when error appears
- Restored NHS blue submit button styling
- Added documents viewer to AP Control
- Swapped Q2.2 and Q2.3 order
- Fixed asterisk alignment
- Added supplier connection to PDF/review
- Added CRN verification fallback
- Fixed questionnaire uploads on PBP page"

git push origin main
```

---

## SUMMARY - All Fixes:

1. [x] Input field shrinking - FIXED
2. [x] Submit button grey - FIXED  
3. [ ] AP Control documents viewer
4. [ ] Swap Q2.2 and Q2.3
5. [ ] Asterisk alignment
6. [ ] Supplier connection on PDF
7. [ ] CRN fallback
8. [ ] Questionnaire uploads on PBP

Please implement all fixes and push to GitHub.