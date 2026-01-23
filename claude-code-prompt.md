CRITICAL FIXES NEEDED:

## FIX 1: CRITICAL - Section 2 Validation Logic

Currently, completing the questionnaire unlocks the next step. This is WRONG.

**CORRECT LOGIC:**
- If user selects "Yes" for Q2.7 (Procurement Engaged) → Must upload Procurement Approval document → THEN next step unlocks
- If user selects "No" for Q2.7 → Must complete questionnaire → THEN must STILL upload some form of approval OR acknowledgement → THEN next step unlocks

**Actually, let me clarify the REAL logic based on the workflow:**

When Q2.7 "Have you engaged with the Procurement team?" is answered:
- **YES** → User must upload Procurement Approval Document → Next step unlocks
- **NO** → Questionnaire opens → User completes questionnaire → Questionnaire submission = acknowledgement → Next step unlocks

**BUT the current issue is:** When "No" is selected and questionnaire is completed, the next step unlocks immediately. 

**WAIT - Re-reading your requirement:** You want the next step to ONLY unlock when the approval document is uploaded, regardless of questionnaire completion.

**Let me confirm the correct logic:**
- Q2.7 = "Yes" → Upload Procurement Approval → Next unlocks
- Q2.7 = "No" → Complete Questionnaire → STILL need to upload something? Or is questionnaire enough?

**Based on your message, the fix should be:**

The acknowledgement/next section should ONLY unlock when:
1. Q2.7 = "Yes" AND Procurement Approval document is uploaded, OR
2. Q2.7 = "No" AND Questionnaire is completed AND some acknowledgement is given

**In Section2PreScreening.jsx, fix the unlock logic:**
```jsx
// State tracking
const [procurementEngaged, setProcurementEngaged] = useState('');
const [procurementApprovalUploaded, setProcurementApprovalUploaded] = useState(false);
const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);

// Function to check if next section can be unlocked
const canProceedToNextSection = () => {
  if (procurementEngaged === 'yes') {
    // Must have uploaded procurement approval document
    return procurementApprovalUploaded === true;
  } else if (procurementEngaged === 'no') {
    // Must have completed questionnaire
    return questionnaireCompleted === true;
  }
  return false;
};

// Handle procurement approval upload
const handleProcurementApprovalUpload = (file) => {
  if (file) {
    setProcurementApprovalUploaded(true);
    // Save to uploads
    setUploadedFile('procurementApproval', file);
    updateFormData('section2', {
      ...formData.section2,
      procurementApprovalUploaded: true,
    });
  }
};

// Handle questionnaire completion
const handleQuestionnaireComplete = () => {
  setQuestionnaireCompleted(true);
  setShowQuestionnaire(false);
  updateFormData('section2', {
    ...formData.section2,
    questionnaireCompleted: true,
  });
};

// In the JSX - Q2.7 Procurement Engagement
{serviceCategory && (
  <div className="form-group">
    <QuestionLabel section={2} question={7} label="Have you engaged with the Procurement team?" required />
    
    <div className="radio-group">
      <label className="radio-option">
        <input
          type="radio"
          name="procurementEngaged"
          value="yes"
          checked={procurementEngaged === 'yes'}
          onChange={(e) => {
            setProcurementEngaged('yes');
            updateFormData('section2', { ...formData.section2, procurementEngaged: 'yes' });
          }}
        />
        <span>Yes - I have procurement approval</span>
      </label>
      <label className="radio-option">
        <input
          type="radio"
          name="procurementEngaged"
          value="no"
          checked={procurementEngaged === 'no'}
          onChange={(e) => {
            setProcurementEngaged('no');
            updateFormData('section2', { ...formData.section2, procurementEngaged: 'no' });
            // Open questionnaire
            if (serviceCategory) {
              setShowQuestionnaire(true);
            }
          }}
        />
        <span>No - I need to complete the questionnaire</span>
      </label>
    </div>
    
    {/* If YES - Show upload requirement */}
    {procurementEngaged === 'yes' && (
      <div className="upload-section" style={{ marginTop: '16px' }}>
        <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>
          Please upload your Procurement approval document
          <span style={{ color: '#dc2626' }}> *</span>
        </label>
        
        <input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={(e) => handleProcurementApprovalUpload(e.target.files[0])}
        />
        
        {procurementApprovalUploaded && (
          <div style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: '#f0fdf4',
            border: '1px solid #22c55e',
            borderRadius: '6px',
            color: '#166534'
          }}>
            ✓ Procurement Approval Document Uploaded
          </div>
        )}
        
        {!procurementApprovalUploaded && (
          <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '8px' }}>
            ⚠ You must upload your procurement approval document to proceed
          </p>
        )}
      </div>
    )}
    
    {/* If NO - Show questionnaire status */}
    {procurementEngaged === 'no' && (
      <div style={{ marginTop: '16px' }}>
        {questionnaireCompleted ? (
          <div style={{
            padding: '12px 16px',
            background: '#f0fdf4',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            color: '#166534'
          }}>
            ✓ {serviceCategory === 'clinical' ? 'Clinical' : 'Non-Clinical'} Questionnaire Completed
          </div>
        ) : (
          <div style={{
            padding: '12px 16px',
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            color: '#92400e'
          }}>
            ⚠ Please complete the {serviceCategory === 'clinical' ? 'Clinical' : 'Non-Clinical'} questionnaire to proceed
            <button
              onClick={() => setShowQuestionnaire(true)}
              style={{
                marginLeft: '12px',
                padding: '6px 12px',
                background: '#005EB8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Open Questionnaire
            </button>
          </div>
        )}
      </div>
    )}
  </div>
)}

{/* Acknowledgement - ONLY shows when canProceedToNextSection() is true */}
{canProceedToNextSection() && (
  <div className="form-group">
    <QuestionLabel section={2} question={8} label="Acknowledgement" required />
    {/* ... acknowledgement checkbox ... */}
  </div>
)}

{/* Questionnaire Modal */}
<QuestionnaireModal
  isOpen={showQuestionnaire}
  onClose={() => setShowQuestionnaire(false)}
  onComplete={handleQuestionnaireComplete}
  type={serviceCategory}
  section2Data={formData.section2}
/>
```

**CRITICAL: Ensure the "Next" or "Continue to Section 3" button checks this:**
```jsx
// The continue/next button should be disabled until conditions are met
<button
  onClick={handleContinueToSection3}
  disabled={!canProceedToNextSection() || !acknowledgementChecked}
  style={{
    // ... styles ...
    opacity: (!canProceedToNextSection() || !acknowledgementChecked) ? 0.5 : 1,
    cursor: (!canProceedToNextSection() || !acknowledgementChecked) ? 'not-allowed' : 'pointer',
  }}
>
  Continue to Section 3
</button>
```

---

## FIX 2: AP Control Signature Missing on Downloaded PDF

The PDF downloaded after AP verification doesn't show the AP staff signature. This is because the download button at the top uses the old submission data without the AP review.

**In APControlReviewPage.jsx:**

The issue is that the download button fetches submission data that doesn't include the AP review that was just submitted.
```jsx
// Store AP review data in state after verification
const [apReviewData, setApReviewData] = useState(null);

// When verification is completed
const handleCompleteVerification = () => {
  const newApReviewData = {
    decision: 'verified',
    verified: true,
    supplierName: supplierName,
    supplierNumber: supplierNumber,
    signature: signatureName, // The name entered by AP staff
    signatureName: signatureName,
    date: new Date().toISOString(),
    verificationChecklist: verificationChecklist,
  };
  
  // Store in state
  setApReviewData(newApReviewData);
  
  // Update submission
  const updatedSubmission = {
    ...submission,
    apReview: newApReviewData,
    status: 'Completed',
    supplierNumber: supplierNumber,
  };
  
  // Save to localStorage
  localStorage.setItem(`submission-${submission.id}`, JSON.stringify(updatedSubmission));
  
  // Update state
  setSubmission(updatedSubmission);
  setIsVerified(true);
};

// Function to get submission with AP signature for PDF
const getSubmissionForPDF = () => {
  // CRITICAL: Use the apReviewData from state, not from submission
  // This ensures the signature is included even if the page hasn't refreshed
  return {
    ...submission,
    pbpReview: submission?.pbpReview || null,
    procurementReview: submission?.procurementReview || null,
    opwReview: submission?.opwReview || null,
    contractDrafter: submission?.contractDrafter || null,
    // Use state data if available, otherwise use submission data
    apReview: apReviewData || submission?.apReview || {
      decision: 'verified',
      verified: true,
      supplierName: supplierName,
      supplierNumber: supplierNumber,
      signature: signatureName,
      signatureName: signatureName,
      date: new Date().toISOString(),
    },
    supplierNumber: supplierNumber,
  };
};

// The download button should use getSubmissionForPDF()
<PDFDownloadLink
  document={<SupplierFormPDF submission={getSubmissionForPDF()} />}
  fileName={`Supplier_Form_COMPLETE_${submission?.alembaReference || submission?.id}.pdf`}
>
  {({ loading }) => (
    <button disabled={loading}>
      {loading ? 'Generating PDF...' : '📥 Download Complete PDF with All Authorisations'}
    </button>
  )}
</PDFDownloadLink>
```

**Also update SupplierFormPDF.jsx to properly display AP signature:**
```jsx
{/* AP Control Verification Section */}
{submission?.apReview && (
  <View style={styles.signatureBlock}>
    <Text style={styles.signatureTitle}>AP Control Verification</Text>
    
    <View style={styles.signatureRow}>
      <Text style={styles.signatureLabel}>Status:</Text>
      <Text style={[styles.signatureValue, { color: '#22c55e' }]}>VERIFIED ✓</Text>
    </View>
    
    <View style={styles.signatureRow}>
      <Text style={styles.signatureLabel}>Supplier Number:</Text>
      <Text style={[styles.signatureValue, { fontWeight: 'bold' }]}>
        {submission.apReview.supplierNumber || submission.supplierNumber || 'Not assigned'}
      </Text>
    </View>
    
    <View style={styles.signatureRow}>
      <Text style={styles.signatureLabel}>Verified By:</Text>
      <Text style={styles.signatureValue}>
        {submission.apReview.signature || 
         submission.apReview.signatureName || 
         'AP Control Team'}
      </Text>
    </View>
    
    <View style={styles.signatureRow}>
      <Text style={styles.signatureLabel}>Date:</Text>
      <Text style={styles.signatureValue}>
        {submission.apReview.date 
          ? new Date(submission.apReview.date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long', 
              year: 'numeric'
            })
          : new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long', 
              year: 'numeric'
            })}
      </Text>
    </View>
  </View>
)}
```

---

## FIX 3: Remove "Generated" Line from PDF First Page

**In SupplierFormPDF.jsx, find and remove the "Generated" line:**
```jsx
// FIND AND REMOVE this (or similar):
<Text style={styles.generated}>
  Generated: {new Date().toLocaleDateString('en-GB')}
</Text>

// OR:
<Text>Generated on {formatDate(new Date())}</Text>

// DELETE IT COMPLETELY
```

Search for any occurrence of "Generated" or "generated" in the PDF component and remove it.

---

## FIX 4: Add Supplier Number to First Page of AP Control PDF

On the first page, the supplier line should show:
`Supplier: Test Company Ltd - 12345`

**In SupplierFormPDF.jsx, update the cover page:**
```jsx
{/* Cover Page - Supplier Name with Number */}
<View style={styles.coverInfo}>
  <Text style={styles.coverLabel}>Supplier:</Text>
  <Text style={styles.coverValue}>
    {submission?.formData?.section4?.companyName || 'Unknown'}
    {submission?.supplierNumber || submission?.apReview?.supplierNumber ? (
      ` - ${submission?.supplierNumber || submission?.apReview?.supplierNumber}`
    ) : ''}
  </Text>
</View>

{/* Alternative format if you prefer it on one line */}
<View style={styles.coverInfo}>
  <Text style={styles.coverValue}>
    <Text style={{ fontWeight: 'bold' }}>Supplier: </Text>
    {submission?.formData?.section4?.companyName || 'Unknown'}
    {(submission?.supplierNumber || submission?.apReview?.supplierNumber) && (
      <Text> - {submission?.supplierNumber || submission?.apReview?.supplierNumber}</Text>
    )}
  </Text>
</View>
```

**Ensure the supplier number is passed correctly:**
```jsx
// When generating PDF at AP stage, ensure supplierNumber is included:
const submissionForPDF = {
  ...submission,
  supplierNumber: supplierNumber, // From the AP form input
  apReview: {
    ...apReviewData,
    supplierNumber: supplierNumber,
  },
};
```

---

## SUMMARY OF FIXES:

1. [ ] **CRITICAL:** Fix Section 2 validation - Next step only unlocks when:
   - Q2.7 = "Yes" AND Procurement Approval uploaded, OR
   - Q2.7 = "No" AND Questionnaire completed
   
2. [ ] **AP Signature on PDF:** Store AP review data in state and use it for PDF generation

3. [ ] **Remove "Generated" line** from PDF first page

4. [ ] **Add Supplier Number** to first page: "Supplier: Company Name - 12345"

After implementing all fixes:
```bash
git add .
git commit -m "Critical Fix: Section 2 validation, AP signature on PDF, remove Generated line, add supplier number to PDF"
git push origin main
```

Please implement and test carefully. The Section 2 validation fix is CRITICAL for proper workflow.