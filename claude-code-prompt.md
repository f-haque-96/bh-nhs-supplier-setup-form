CRITICAL BUG: QuestionnaireModal.jsx line 240 - "isValid is not defined"

The submit button is using `isValid` but this variable was never defined. Fix it:

**In QuestionnaireModal.jsx, add the isValid logic or replace with existing validation:**

Option 1: Define isValid based on form validation
```jsx
// Add this near the top of the component, after state declarations
const isValid = useMemo(() => {
  // Check if required fields are filled
  const hasSupplierName = questionnaireData?.supplierName?.trim()?.length >= 2;
  
  // Add other validation as needed
  return hasSupplierName;
}, [questionnaireData]);
```

Option 2: If there's already a form validation method, use it:
```jsx
// Replace isValid with existing validation
disabled={isSubmitting || !formState.isValid}
// OR
disabled={isSubmitting || !isFormComplete}
// OR simply remove the isValid check:
disabled={isSubmitting}
```

**Search for the exact line and fix:**
```bash
grep -n "isValid" src/components/modals/QuestionnaireModal.jsx
```

Then fix the reference appropriately.

After fixing, commit and push:
```bash
git add .
git commit -m "Fix: isValid undefined error in QuestionnaireModal"
git push origin main
```