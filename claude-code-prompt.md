CRITICAL BUG: SupplierFormPDF.jsx line 643 - "Cannot convert undefined or null to object"

The PDF is failing because Object.keys() is being called on undefined/null data.

## DEBUG AND FIX:

**Step 1: Find line 643 and surrounding code:**
```bash
sed -n '635,655p' src/components/pdf/SupplierFormPDF.jsx
```

**Step 2: Add null checks around Object.keys() usage:**

The error is likely from one of these patterns:
- `Object.keys(something)` where `something` is undefined
- `Object.entries(something)` where `something` is undefined

**Common fixes:**
```jsx
// WRONG:
Object.keys(uploads).map(...)

// CORRECT:
Object.keys(uploads || {}).map(...)

// WRONG:
Object.entries(section5?.serviceTypes).map(...)

// CORRECT:
Object.entries(section5?.serviceTypes || {}).map(...)
```

**Step 3: Find and fix ALL Object.keys/Object.entries calls:**
```bash
grep -n "Object.keys\|Object.entries" src/components/pdf/SupplierFormPDF.jsx
```

For EVERY occurrence, add `|| {}` fallback:
```jsx
// Example fixes:
Object.keys(formData || {})
Object.keys(uploads || {})
Object.keys(section5?.serviceTypes || {})
Object.keys(verificationChecklist || {})
Object.entries(questionnaireData || {})
```

**Step 4: Specifically fix line 643 area:**

If it's related to uploads or service types, the fix is:
```jsx
// If it's uploads:
{Object.keys(submission?.uploads || submission?.uploadedFiles || {}).length > 0 && (
  // ... render uploads
)}

// If it's service types:
{Object.keys(section5?.serviceTypes || {}).filter(key => section5?.serviceTypes?.[key]).map(type => (
  // ... render service type
))}

// If it's verification checklist:
{Object.entries(submission?.apReview?.verificationChecklist || {}).map(([key, value]) => (
  // ... render checklist item
))}
```

**Step 5: Also, since we don't need AP signature on this PDF, remove or skip the AP review section:**

The button is for downloading the form WITH previous authorisations (PBP, Procurement, OPW, Contract) but NOT the current AP review (since AP is the one downloading it).
```jsx
// In the PDF authorisations section, either:
// Option A: Don't render AP review at all
{submission?.apReview && false && (  // Disabled - AP doesn't need to see their own signature
  // ... AP review section
)}

// Option B: Or just remove the AP section entirely from this PDF
// Only show:
// - PBP Review (if exists)
// - Procurement Review
// - OPW Review (if exists)
// - Contract Agreement (if exists)
```

**Step 6: Add defensive rendering for the entire PDF:**

At the start of the component, add early returns for missing data:
```jsx
const SupplierFormPDF = ({ submission, isAPControlPDF = false }) => {
  // Early return if no submission
  if (!submission) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>No submission data available</Text>
        </Page>
      </Document>
    );
  }

  // Safely extract all data with defaults
  const formData = submission?.formData || {};
  const section1 = formData?.section1 || {};
  const section2 = formData?.section2 || {};
  const section3 = formData?.section3 || {};
  const section4 = formData?.section4 || {};
  const section5 = formData?.section5 || {};
  const section6 = formData?.section6 || {};
  const uploads = submission?.uploads || submission?.uploadedFiles || {};
  
  // Reviews - all optional
  const pbpReview = submission?.pbpReview || null;
  const procurementReview = submission?.procurementReview || null;
  const opwReview = submission?.opwReview || null;
  const contractDrafter = submission?.contractDrafter || null;
  
  // Don't include AP review in this PDF (AP is downloading it)
  // const apReview = submission?.apReview || null;

  // ... rest of component
};
```

**Step 7: After fixing, test and push:**
```bash
git add .
git commit -m "Fix: Object.keys null error in SupplierFormPDF, remove AP signature from download"
git push origin main
```

---

## SUMMARY:

1. [ ] Find line 643 and see what Object.keys is being called on
2. [ ] Add `|| {}` fallback to ALL Object.keys/Object.entries calls
3. [ ] Remove AP review section from this PDF (AP is the one downloading)
4. [ ] Add early return for missing submission data
5. [ ] Test PDF download works
6. [ ] Push to GitHub

Please fix this error.