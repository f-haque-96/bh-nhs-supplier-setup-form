/**
 * AP (Accounts Payable) Control Review Page
 * Verifies supplier banking and financial details before system setup
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button, NoticeBox, Checkbox, Textarea, SignatureSection, Input } from '../components/common';
import { formatDate, formatCurrency } from '../utils/helpers';
import { formatYesNo, formatFieldValue, capitalizeWords, formatSupplierType, formatServiceCategory, formatUsageFrequency } from '../utils/formatters';
import SupplierFormPDF from '../components/pdf/SupplierFormPDF';

const ReviewItem = ({ label, value, highlight, raw = false }) => {
  if (!value && value !== 0) return null;

  // Format the value unless raw is true (for pre-formatted values)
  const displayValue = raw ? value : formatFieldValue(value);

  return (
    <div style={{ display: 'flex', marginBottom: 'var(--space-8)' }}>
      <div style={{ fontWeight: 'var(--font-weight-medium)', minWidth: '200px', color: 'var(--color-text-secondary)' }}>
        {label}:
      </div>
      <div style={{
        color: 'var(--color-text)',
        fontWeight: highlight ? 'var(--font-weight-semibold)' : 'normal',
        backgroundColor: highlight ? '#FFF9E6' : 'transparent',
        padding: highlight ? '2px 8px' : '0',
        paddingLeft: highlight ? '8px' : '16px',
        borderRadius: highlight ? 'var(--radius-sm)' : '0',
      }}>
        {displayValue}
      </div>
    </div>
  );
};

const ReviewCard = ({ title, children, highlight }) => {
  return (
    <div
      style={{
        padding: 'var(--space-24)',
        borderRadius: 'var(--radius-base)',
        border: highlight ? '2px solid var(--color-warning)' : '2px solid var(--color-border)',
        marginBottom: 'var(--space-16)',
        backgroundColor: highlight ? '#FFF9E6' : 'var(--color-surface)',
      }}
    >
      <h4 style={{ margin: '0 0 var(--space-16) 0', color: 'var(--nhs-blue)' }}>
        {title}
      </h4>
      <div>{children}</div>
    </div>
  );
};

const APControlReviewPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankDetailsVerified, setBankDetailsVerified] = useState(false);
  const [companyDetailsVerified, setCompanyDetailsVerified] = useState(false);
  const [vatVerified, setVatVerified] = useState(false);
  const [insuranceVerified, setInsuranceVerified] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('');
  const [supplierNumber, setSupplierNumber] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Function to get full submission with ALL authorisations for PDF
  const getFullSubmissionForPDF = () => {
    // Try different localStorage key formats
    let storedSubmission = localStorage.getItem(`submission_${submissionId}`);

    if (!storedSubmission) {
      storedSubmission = localStorage.getItem(`submission-${submissionId}`);
    }

    if (!storedSubmission) {
      storedSubmission = localStorage.getItem(submissionId);
    }

    const currentSubmission = storedSubmission ? JSON.parse(storedSubmission) : submission;

    console.log('=== GET FULL SUBMISSION DEBUG ===');
    console.log('Submission ID:', submissionId);
    console.log('Found in localStorage:', !!storedSubmission);
    console.log('Current submission:', currentSubmission);
    console.log('Local submission state:', submission);

    // Ensure formData structure exists with proper fallbacks
    const formData = currentSubmission?.formData || {};
    const companyNameFallback = formData?.section4?.companyName
      || formData?.companyName
      || currentSubmission?.companyName
      || supplierName
      || 'Unknown Company';

    const fullSubmission = {
      ...currentSubmission,
      formData: {
        ...formData,
        // Ensure all section data is present
        section1: formData?.section1 || {},
        section2: formData?.section2 || {},
        section3: formData?.section3 || {},
        section4: {
          ...(formData?.section4 || {}),
          companyName: companyNameFallback,
        },
        section5: formData?.section5 || {},
        section6: formData?.section6 || {},
        section7: formData?.section7 || {},
      },
      // Preserve all authorisation reviews
      pbpReview: currentSubmission?.pbpReview || null,
      procurementReview: currentSubmission?.procurementReview || null,
      opwReview: currentSubmission?.opwReview || null,
      contractDrafter: currentSubmission?.contractDrafter || null,
      // Include current AP review
      apReview: {
        supplierName: supplierName || companyNameFallback,
        supplierNumber: supplierNumber || '',
        decision: 'approved',
        signature: signatureName || '',
        date: signatureDate || new Date().toISOString().split('T')[0],
        bankDetailsVerified,
        companyDetailsVerified,
        vatVerified,
        insuranceVerified,
        notes,
        submittedAt: new Date().toISOString()
      },
      // Uploads
      uploadedFiles: currentSubmission?.uploadedFiles || currentSubmission?.uploads || {},
    };

    console.log('Full submission for PDF:', fullSubmission);
    console.log('formData.section4.companyName:', fullSubmission.formData.section4.companyName);

    return fullSubmission;
  };

  // Handle document preview
  const handlePreviewDocument = (file) => {
    console.log('Preview file:', file); // Debug log

    if (!file) {
      alert('No document available to preview');
      return;
    }

    // Check multiple possible locations for the base64 data
    const base64Data = file.base64 || file.data || file.content;

    if (!base64Data) {
      console.error('No base64 data found in file:', file);
      alert('Document data not available for preview. The file may need to be re-uploaded.');
      return;
    }

    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Please allow popups to preview documents');
      return;
    }

    // Determine file type from MIME type or name
    const isPDF = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    const isImage = file.type?.startsWith('image/') || file.name?.match(/\.(png|jpg|jpeg|gif)$/i);

    if (isPDF) {
      // For PDFs, create an iframe
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${file.name || 'Document Preview'}</title>
            <style>
              body { margin: 0; padding: 0; height: 100vh; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${base64Data}"></iframe>
          </body>
        </html>
      `);
    } else if (isImage) {
      // For images, display directly
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${file.name || 'Image Preview'}</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #f3f4f6;
              }
              img {
                max-width: 95%;
                max-height: 95vh;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              }
            </style>
          </head>
          <body>
            <img src="${base64Data}" alt="${file.name || 'Preview'}" />
          </body>
        </html>
      `);
    } else {
      newWindow.close();
      alert('Preview not available for this file type');
    }

    newWindow.document.close();
  };

  useEffect(() => {
    // Load submission from localStorage
    const submissionData = localStorage.getItem(`submission_${submissionId}`);

    if (submissionData) {
      try {
        const parsed = JSON.parse(submissionData);
        setSubmission(parsed);

        console.log('=== AP CONTROL - PREVIOUS AUTH DEBUG ===');
        console.log('Full submission:', parsed);
        console.log('Procurement Review:', parsed.procurementReview);
        if (parsed.procurementReview) {
          console.log('Procurement signature:', parsed.procurementReview.signature);
          console.log('Procurement signatureName:', parsed.procurementReview.signatureName);
          console.log('Procurement date:', parsed.procurementReview.date);
          console.log('Procurement signatureDate:', parsed.procurementReview.signatureDate);
        }
        console.log('OPW Review:', parsed.opwReview);
        if (parsed.opwReview) {
          console.log('OPW signature:', parsed.opwReview.signature);
          console.log('OPW signatureName:', parsed.opwReview.signatureName);
          console.log('OPW date:', parsed.opwReview.date);
          console.log('OPW signatureDate:', parsed.opwReview.signatureDate);
        }
        console.log('PBP Review:', parsed.pbpReview);
        console.log('Contract Drafter:', parsed.contractDrafter);

        // Pre-fill supplier name from form data
        if (parsed.formData?.companyName) {
          setSupplierName(parsed.formData.companyName);
        }

        // Pre-fill if already verified
        if (parsed.apReview) {
          setBankDetailsVerified(parsed.apReview.bankDetailsVerified);
          setCompanyDetailsVerified(parsed.apReview.companyDetailsVerified);
          setVatVerified(parsed.apReview.vatVerified);
          setInsuranceVerified(parsed.apReview.insuranceVerified);
          setNotes(parsed.apReview.notes || '');
          setSupplierName(parsed.apReview.supplierName || parsed.formData?.companyName || '');
          setSupplierNumber(parsed.apReview.supplierNumber || '');
          setAdditionalInfo(parsed.apReview.additionalInfo || '');
        }
      } catch (error) {
        console.error('Error parsing submission:', error);
      }
    }

    setLoading(false);
  }, [submissionId]);

  const handleSubmitVerification = async () => {
    if (!signatureName.trim()) {
      alert('Please provide your digital signature (full name)');
      return;
    }

    if (!signatureDate) {
      alert('Please select a date for your signature');
      return;
    }

    if (!bankDetailsVerified) {
      alert('Bank details verification is required');
      return;
    }

    if (!companyDetailsVerified) {
      alert('Company details verification is required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Load fresh from localStorage to get any updates
      const currentSubmission = JSON.parse(localStorage.getItem(`submission_${submissionId}`)) || submission;

      // Update submission with AP review
      const updatedSubmission = {
        ...currentSubmission, // Use fresh data from localStorage
        // Add AP review
        apReview: {
          bankDetailsVerified,
          companyDetailsVerified,
          vatVerified,
          insuranceVerified,
          notes,
          supplierName,
          supplierNumber,
          signature: signatureName,
          date: signatureDate,
          decision: 'approved',
          reviewedBy: 'AP Control Team', // In real app, this would come from auth
          reviewedAt: new Date().toISOString(),
          status: 'verified',
        },
      };

      console.log('=== AP CONTROL FINAL SUBMISSION ===');
      console.log('Has pbpReview:', !!updatedSubmission.pbpReview);
      console.log('Has procurementReview:', !!updatedSubmission.procurementReview);
      console.log('Has opwReview:', !!updatedSubmission.opwReview);
      console.log('Has contractDrafter:', !!updatedSubmission.contractDrafter);
      console.log('pbpReview:', updatedSubmission.pbpReview);
      console.log('procurementReview:', updatedSubmission.procurementReview);
      console.log('opwReview:', updatedSubmission.opwReview);
      console.log('contractDrafter:', updatedSubmission.contractDrafter);
      console.log('apReview:', updatedSubmission.apReview);

      // Save back to localStorage
      localStorage.setItem(`submission_${submissionId}`, JSON.stringify(updatedSubmission));

      // Update submissions list
      const submissions = JSON.parse(localStorage.getItem('all_submissions') || '[]');
      const index = submissions.findIndex(s => s.submissionId === submissionId);
      if (index !== -1) {
        submissions[index].apStatus = 'verified';
        localStorage.setItem('all_submissions', JSON.stringify(submissions));
      }

      setSubmission(updatedSubmission);

      // Auto-download complete PDF after a short delay to ensure state is updated
      setTimeout(() => {
        const downloadLink = document.getElementById('ap-complete-pdf-download');
        if (downloadLink) {
          downloadLink.click();
        }
      }, 1000);

      alert('AP Verification Complete! The complete PDF has been downloaded. In production, this will also be emailed to the requester.');
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Failed to update submission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-32)', textAlign: 'center' }}>
        <div className="loading" style={{ width: '48px', height: '48px', margin: '0 auto' }} />
        <p style={{ marginTop: 'var(--space-16)', color: 'var(--color-text-secondary)' }}>
          Loading submission...
        </p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div style={{ padding: 'var(--space-32)' }}>
        <NoticeBox type="error">
          <h3>Submission Not Found</h3>
          <p>The submission ID "{submissionId}" could not be found.</p>
          <Button onClick={() => navigate('/')} style={{ marginTop: 'var(--space-16)' }}>
            Return to Form
          </Button>
        </NoticeBox>
      </div>
    );
  }

  const formData = submission.formData;
  const isPreview = submission.isPreview === true;
  const apReview = submission.apReview;

  return (
    <div style={{ padding: 'var(--space-32)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 'var(--space-32)',
        gap: 'var(--space-24)',
      }}>
        <div>
          <h1 style={{ margin: '0 0 var(--space-8) 0', color: 'var(--nhs-blue)' }}>
            AP Control Review: Banking & Financial Verification
          </h1>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            <div>Submission ID: <strong>{submission.submissionId}</strong></div>
            <div>Submitted: {formatDate(submission.submissionDate)}</div>
            <div>Submitted by: {submission.submittedBy}</div>
            {isPreview && (
              <div style={{ color: 'var(--color-warning)', fontWeight: 'var(--font-weight-semibold)' }}>
                PREVIEW MODE - This is not a real submission
              </div>
            )}
          </div>
        </div>

        {/* Verification Status Badge & Actions */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', alignItems: 'flex-end' }}>
          {apReview && (
            <div style={{
              padding: 'var(--space-16)',
              borderRadius: 'var(--radius-base)',
              border: '3px solid var(--color-success)',
              backgroundColor: '#d1fae5',
              textAlign: 'center',
              minWidth: '180px',
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                AP Status
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#065f46' }}>
                ✓ VERIFIED
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AP Review Status */}
      {apReview && (
        <NoticeBox type="success" style={{ marginBottom: 'var(--space-24)' }}>
          <strong>AP Verification Complete</strong>
          <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>
            Verified by {apReview.reviewedBy} on {formatDate(apReview.reviewedAt)}
          </p>
          {apReview.supplierName && (
            <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>
              <strong>Supplier Name:</strong> {apReview.supplierName}
            </p>
          )}
          {apReview.supplierNumber && (
            <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>
              <strong>Supplier Number:</strong> {apReview.supplierNumber}
            </p>
          )}
          {apReview.notes && (
            <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>
              <strong>Notes:</strong> {apReview.notes}
            </p>
          )}
        </NoticeBox>
      )}

      {/* Download Complete PDF Section - Only show if AP review exists */}
      {apReview && (
        <div className="ap-download-section">
          <div className="download-card">
            <div className="download-info">
              <h4>Complete Supplier Form with All Authorisations</h4>
              <p>Download the full supplier form PDF including all authorisation signatures from PBP, Procurement, OPW Panel (if applicable), and AP Control.</p>
            </div>
            <PDFDownloadLink
              document={<SupplierFormPDF submission={getFullSubmissionForPDF()} isAPControlPDF={true} />}
              fileName={`NHS-Supplier-Form-${submission?.formData?.companyName?.replace(/\s+/g, '_') || 'Supplier'}-COMPLETE-${new Date().toISOString().split('T')[0]}.pdf`}
            >
              {({ loading, error }) => (
                <button className="btn-download-complete" disabled={loading}>
                  {loading ? (
                    <>⏳ Generating PDF...</>
                  ) : (
                    <>📥 Download Complete PDF with All Authorisations</>
                  )}
                </button>
              )}
            </PDFDownloadLink>
          </div>
        </div>
      )}

      {/* Conflict of Interest Warning */}
      {formData.supplierConnection === 'yes' && formData.connectionDetails && (
        <div style={{
          marginBottom: 'var(--space-16)',
          padding: 'var(--space-16)',
          backgroundColor: '#fef3c7',
          borderRadius: 'var(--radius-base)',
          border: '2px solid #f59e0b',
        }}>
          <h4 style={{ margin: '0 0 var(--space-8) 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Conflict of Interest Declared
          </h4>
          <p style={{ margin: '0 0 var(--space-8) 0', color: '#92400e', fontWeight: 'var(--font-weight-medium)' }}>
            The requester has declared a connection to this supplier:
          </p>
          <p style={{ margin: 0, color: '#92400e', backgroundColor: '#fffbeb', padding: 'var(--space-12)', borderRadius: 'var(--radius-sm)' }}>
            {formData.connectionDetails}
          </p>
        </div>
      )}

      {/* Supplier Details */}
      <ReviewCard title="Supplier Details" highlight>
        <ReviewItem label="Company Name" value={formData.companyName?.toUpperCase()} highlight raw />
        {formData.tradingName && <ReviewItem label="Trading Name" value={formData.tradingName?.toUpperCase()} raw />}
        <ReviewItem label="Supplier Type" value={formatSupplierType(formData.supplierType)} raw />
        {formData.crn && <ReviewItem label="CRN" value={formData.crn} highlight />}
        {formData.charityNumber && <ReviewItem label="Charity Number" value={formData.charityNumber} />}
        <ReviewItem label="Registered Address" value={formData.registeredAddress?.toUpperCase()} />
        <ReviewItem label="City" value={formData.city?.toUpperCase()} />
        <ReviewItem label="Postcode" value={formData.postcode?.toUpperCase()} />
        <ReviewItem label="Contact Name" value={formData.contactName?.toUpperCase()} />
        <ReviewItem label="Contact Email" value={formData.contactEmail} highlight />
        <ReviewItem label="Contact Phone" value={formData.contactPhone} />
        {formData.website && <ReviewItem label="Website" value={formData.website} />}
      </ReviewCard>

      {/* Bank Details */}
      <ReviewCard title="Bank Details & Payment Information" highlight>
        <ReviewItem label="Overseas Supplier" value={formData.overseasSupplier} />

        {formData.overseasSupplier === 'yes' ? (
          <>
            {formData.iban && <ReviewItem label="IBAN" value={formData.iban} highlight />}
            {formData.swiftCode && <ReviewItem label="SWIFT Code" value={formData.swiftCode} highlight />}
            {formData.bankRouting && <ReviewItem label="Bank Routing Number" value={formData.bankRouting} />}
          </>
        ) : (
          <>
            {formData.sortCode && <ReviewItem label="Sort Code" value={formData.sortCode} highlight />}
            {formData.accountNumber && <ReviewItem label="Account Number" value={formData.accountNumber} highlight />}
          </>
        )}

        <ReviewItem label="Letterhead Available" value={formData.letterheadAvailable} />

        {formData.letterheadAvailable === 'yes' && submission.uploadedFiles?.letterhead && (
          <div style={{
            marginTop: 'var(--space-12)',
            padding: 'var(--space-12)',
            backgroundColor: '#d1fae5',
            borderRadius: 'var(--radius-base)',
            border: '1px solid var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-12)',
          }}>
            <div style={{ flex: 1 }}>
              <strong>✓ Letterhead with Bank Details:</strong> {submission.uploadedFiles.letterhead.name}
            </div>
            <Button
              variant="outline"
              onClick={() => handlePreviewDocument(submission.uploadedFiles.letterhead)}
              style={{ fontSize: 'var(--font-size-sm)', padding: '6px 12px' }}
            >
              Preview
            </Button>
          </div>
        )}
      </ReviewCard>

      {/* Accounts Contact Details */}
      {formData.accountsAddressSame === 'no' && (
        <ReviewCard title="Accounts Department Contact">
          <ReviewItem label="Accounts Address" value={formData.accountsAddress} />
          <ReviewItem label="City" value={formData.accountsCity} />
          <ReviewItem label="Postcode" value={formData.accountsPostcode} />
          <ReviewItem label="Phone" value={formData.accountsPhone} />
          <ReviewItem label="Email" value={formData.accountsEmail} />
        </ReviewCard>
      )}

      {/* VAT & Tax Information */}
      <ReviewCard title="VAT & Tax Information" highlight>
        <ReviewItem label="VAT Registered" value={formData.vatRegistered} />
        {formData.vatRegistered === 'yes' && formData.vatNumber && (
          <ReviewItem label="VAT Number" value={formData.vatNumber} highlight />
        )}

        <ReviewItem label="CIS Registered" value={formData.cisRegistered} />
        {formData.cisRegistered === 'yes' && formData.utrNumber && (
          <ReviewItem label="UTR Number" value={formData.utrNumber} highlight />
        )}

        <ReviewItem label="GHX/DUNS Known" value={formData.ghxDunsKnown} />
        {formData.ghxDunsKnown === 'yes' && formData.ghxDunsNumber && (
          <ReviewItem label="GHX/DUNS Number" value={formData.ghxDunsNumber} />
        )}
      </ReviewCard>

      {/* Insurance Information */}
      <ReviewCard title="Insurance Information" highlight>
        <ReviewItem label="Public Liability Insurance" value={formData.publicLiability} />
        {formData.publicLiability === 'yes' && (
          <>
            {formData.plCoverage && <ReviewItem label="Coverage Amount" value={formatCurrency(formData.plCoverage)} highlight />}
            {formData.plExpiry && <ReviewItem label="Expiry Date" value={formatDate(formData.plExpiry)} highlight />}
          </>
        )}

        {formData.professionalIndemnity === 'yes' && (
          <>
            {formData.piCoverage && <ReviewItem label="PI Coverage" value={formatCurrency(formData.piCoverage)} />}
            {formData.piExpiry && <ReviewItem label="PI Expiry" value={formatDate(formData.piExpiry)} />}
          </>
        )}
      </ReviewCard>

      {/* Financial Context */}
      <ReviewCard title="Financial Context">
        <ReviewItem label="Annual Value" value={formData.annualValue ? formatCurrency(formData.annualValue) : ''} />
        <ReviewItem label="Employee Count" value={formData.employeeCount} />
        <ReviewItem label="Service Types" value={formData.serviceType?.join(', ')} />
      </ReviewCard>

      {/* Previous Authorisations Section */}
      {(submission.procurementReview || submission.opwReview) && (
        <div style={{
          marginTop: 'var(--space-32)',
          padding: 'var(--space-24)',
          backgroundColor: '#f0f7ff',
          borderRadius: 'var(--radius-base)',
          border: '2px solid var(--nhs-blue)',
        }}>
          <h3 style={{ margin: '0 0 var(--space-16) 0', color: 'var(--nhs-blue)' }}>
            Previous Authorisations
          </h3>

          {/* PBP Review */}
          {submission.pbpReview && (
            <div style={{
              padding: 'var(--space-16)',
              backgroundColor: 'white',
              borderRadius: 'var(--radius-base)',
              marginBottom: 'var(--space-16)',
              border: '1px solid var(--color-border)',
            }}>
              <h4 style={{ margin: '0 0 var(--space-12) 0', color: 'var(--nhs-blue)', fontSize: 'var(--font-size-base)' }}>
                Procurement Business Partner
              </h4>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                <p style={{ marginBottom: 'var(--space-8)' }}>
                  <strong>Decision:</strong>{' '}
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: submission.pbpReview.decision === 'approved' ? '#22c55e' : submission.pbpReview.decision === 'rejected' ? '#ef4444' : '#f59e0b',
                    color: 'white',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--font-size-xs)',
                  }}>
                    {submission.pbpReview.decision?.toUpperCase()}
                  </span>
                </p>
                {submission.pbpReview.comments && (
                  <p style={{ marginBottom: 'var(--space-8)' }}>
                    <strong>Comments:</strong> {submission.pbpReview.comments}
                  </p>
                )}
                <div style={{
                  marginTop: 'var(--space-12)',
                  paddingTop: 'var(--space-12)',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                }}>
                  <span>
                    <strong>Signed by:</strong>{' '}
                    {submission.pbpReview.signature ||
                     submission.pbpReview.signatureName ||
                     submission.pbpReview.approver ||
                     submission.pbpReview.reviewerName ||
                     'Not recorded'}
                  </span>
                  <span>
                    <strong>Date:</strong>{' '}
                    {formatDate(submission.pbpReview.date ||
                     submission.pbpReview.signatureDate ||
                     submission.pbpReview.approvalDate ||
                     submission.pbpReview.reviewDate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Procurement Review */}
          {submission.procurementReview && (
            <div style={{
              padding: 'var(--space-16)',
              backgroundColor: 'white',
              borderRadius: 'var(--radius-base)',
              marginBottom: 'var(--space-16)',
              border: '1px solid var(--color-border)',
            }}>
              <h4 style={{ margin: '0 0 var(--space-12) 0', color: 'var(--nhs-blue)', fontSize: 'var(--font-size-base)' }}>
                Procurement
              </h4>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                <p style={{ marginBottom: 'var(--space-8)' }}>
                  <strong>Classification:</strong>{' '}
                  {submission.procurementReview.supplierClassification === 'standard' ? 'Standard Supplier' : 'Potential OPW/IR35'}
                </p>
                <p style={{ marginBottom: 'var(--space-8)' }}>
                  <strong>Decision:</strong>{' '}
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: submission.procurementReview.decision === 'approved' ? '#22c55e' : submission.procurementReview.decision === 'rejected' ? '#ef4444' : '#f59e0b',
                    color: 'white',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--font-size-xs)',
                  }}>
                    {submission.procurementReview.decision?.toUpperCase()}
                  </span>
                </p>
                {submission.procurementReview.comments && (
                  <p style={{ marginBottom: 'var(--space-8)' }}>
                    <strong>Comments:</strong> {submission.procurementReview.comments}
                  </p>
                )}
                <div style={{
                  marginTop: 'var(--space-12)',
                  paddingTop: 'var(--space-12)',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                }}>
                  <span>
                    <strong>Signed by:</strong>{' '}
                    {submission.procurementReview.signature ||
                     submission.procurementReview.signatureName ||
                     submission.procurementReview.approver ||
                     'Not recorded'}
                  </span>
                  <span>
                    <strong>Date:</strong>{' '}
                    {formatDate(submission.procurementReview.date ||
                     submission.procurementReview.signatureDate ||
                     submission.procurementReview.approvalDate)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* OPW Review - if OPW/IR35 classification */}
          {submission.procurementReview?.supplierClassification === 'opw_ir35' && submission.opwReview && (
            <div style={{
              padding: 'var(--space-16)',
              backgroundColor: 'white',
              borderRadius: 'var(--radius-base)',
              border: '1px solid var(--color-border)',
            }}>
              <h4 style={{ margin: '0 0 var(--space-12) 0', color: 'var(--nhs-blue)', fontSize: 'var(--font-size-base)' }}>
                OPW Panel / IR35
              </h4>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                <p style={{ marginBottom: 'var(--space-8)' }}>
                  <strong>IR35 Status:</strong>{' '}
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: submission.opwReview.ir35Status === 'outside' ? '#22c55e' : '#ef4444',
                    color: 'white',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--font-size-xs)',
                  }}>
                    {submission.opwReview.ir35Status === 'inside' ? 'INSIDE IR35' : 'OUTSIDE IR35'}
                  </span>
                </p>
                {submission.opwReview.rationale && (
                  <p style={{ marginBottom: 'var(--space-8)' }}>
                    <strong>Rationale:</strong> {submission.opwReview.rationale}
                  </p>
                )}
                <div style={{
                  marginTop: 'var(--space-12)',
                  paddingTop: 'var(--space-12)',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                }}>
                  <span>
                    <strong>Signed by:</strong>{' '}
                    {submission.opwReview.signature ||
                     submission.opwReview.signatureName ||
                     submission.opwReview.approver ||
                     'Not recorded'}
                  </span>
                  <span>
                    <strong>Date:</strong>{' '}
                    {formatDate(submission.opwReview.date ||
                     submission.opwReview.signatureDate ||
                     submission.opwReview.approvalDate)}
                  </span>
                </div>
                {submission.opwReview.contractUploaded && (
                  <div style={{
                    marginTop: 'var(--space-12)',
                    padding: 'var(--space-12)',
                    backgroundColor: '#e7f3ff',
                    borderRadius: 'var(--radius-base)',
                    border: '1px solid var(--nhs-blue)',
                  }}>
                    <p style={{ margin: '0 0 var(--space-8) 0', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
                      <strong>Contract uploaded by:</strong> {submission.opwReview.contractUploadedBy}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreviewDocument(submission.opwReview.contract)}
                      style={{ fontSize: 'var(--font-size-sm)' }}
                    >
                      Preview Contract
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contract Drafter - if contract uploaded */}
          {submission.contractDrafter && (
            <div style={{
              padding: 'var(--space-16)',
              backgroundColor: 'white',
              borderRadius: 'var(--radius-base)',
              marginBottom: 'var(--space-16)',
              border: '1px solid var(--color-border)',
            }}>
              <h4 style={{ margin: '0 0 var(--space-12) 0', color: 'var(--nhs-blue)', fontSize: 'var(--font-size-base)' }}>
                Contract Agreement
              </h4>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                <p style={{ marginBottom: 'var(--space-8)' }}>
                  <strong>Status:</strong>{' '}
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: '#22c55e',
                    color: 'white',
                    fontWeight: 'var(--font-weight-semibold)',
                    fontSize: 'var(--font-size-xs)',
                  }}>
                    UPLOADED
                  </span>
                </p>
                <p style={{ marginBottom: 'var(--space-8)' }}>
                  <strong>Uploaded by:</strong> {submission.contractDrafter.uploadedBy || 'Not recorded'}
                </p>
                <div style={{
                  marginTop: 'var(--space-12)',
                  paddingTop: 'var(--space-12)',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                }}>
                  <span>
                    <strong>Signed by:</strong>{' '}
                    {submission.contractDrafter.signature ||
                     submission.contractDrafter.uploadedBy ||
                     'Not recorded'}
                  </span>
                  <span>
                    <strong>Date:</strong>{' '}
                    {formatDate(submission.contractDrafter.date ||
                     submission.contractDrafter.uploadDate ||
                     submission.contractDrafter.submittedAt)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Uploaded Documents Section */}
      <div className="section-card" style={{ marginTop: 'var(--space-32)' }}>
        <h3 style={{ margin: '0 0 var(--space-8) 0', color: 'var(--nhs-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#005EB8" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
          Uploaded Documents
        </h3>
        <p className="section-description" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-16)' }}>
          All documents uploaded during the submission process:
        </p>

        <div className="documents-grid">
          {/* Letterhead with Bank Details */}
          {(submission?.uploads?.letterhead || submission?.uploadedFiles?.letterhead) && (
            <div className="document-card">
              <div className="document-icon" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                background: '#eff6ff',
                borderRadius: '8px',
                color: '#005EB8',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>PDF</div>
              <div className="document-info">
                <h4>Letterhead with Bank Details</h4>
                <p className="file-name">
                  {submission?.uploads?.letterhead?.name ||
                   submission?.uploadedFiles?.letterhead?.name ||
                   'letterhead.pdf'}
                </p>
                <p className="upload-date">Section 2: Pre-screening</p>
              </div>
              <div className="document-actions">
                <button
                  className="btn-preview"
                  onClick={() => handlePreviewDocument(
                    submission?.uploads?.letterhead || submission?.uploadedFiles?.letterhead
                  )}
                >
                  Preview
                </button>
              </div>
            </div>
          )}

          {/* Procurement Approval Document */}
          {(submission?.uploads?.procurementApproval || submission?.uploadedFiles?.procurementApproval) && (
            <div className="document-card">
              <div className="document-icon" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                background: '#eff6ff',
                borderRadius: '8px',
                color: '#005EB8',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>PDF</div>
              <div className="document-info">
                <h4>Procurement Approval Document</h4>
                <p className="file-name">
                  {submission?.uploads?.procurementApproval?.name ||
                   submission?.uploadedFiles?.procurementApproval?.name ||
                   'procurement-approval.pdf'}
                </p>
                <p className="upload-date">Section 2: Pre-screening</p>
              </div>
              <div className="document-actions">
                <button
                  className="btn-preview"
                  onClick={() => handlePreviewDocument(
                    submission?.uploads?.procurementApproval || submission?.uploadedFiles?.procurementApproval
                  )}
                >
                  Preview
                </button>
              </div>
            </div>
          )}

          {/* CEST Form */}
          {(submission?.uploads?.cestForm || submission?.uploadedFiles?.cestForm) && (
            <div className="document-card">
              <div className="document-icon" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                background: '#eff6ff',
                borderRadius: '8px',
                color: '#005EB8',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>PDF</div>
              <div className="document-info">
                <h4>CEST Form</h4>
                <p className="file-name">
                  {submission?.uploads?.cestForm?.name ||
                   submission?.uploadedFiles?.cestForm?.name ||
                   'cest-form.pdf'}
                </p>
                <p className="upload-date">Section 2: Pre-screening</p>
              </div>
              <div className="document-actions">
                <button
                  className="btn-preview"
                  onClick={() => handlePreviewDocument(
                    submission?.uploads?.cestForm || submission?.uploadedFiles?.cestForm
                  )}
                >
                  Preview
                </button>
              </div>
            </div>
          )}

          {/* Contract Agreement */}
          {(submission?.contractDrafter?.contract || submission?.uploads?.contract) && (
            <div className="document-card">
              <div className="document-icon" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                background: '#eff6ff',
                borderRadius: '8px',
                color: '#005EB8',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>PDF</div>
              <div className="document-info">
                <h4>Contract Agreement</h4>
                <p className="file-name">
                  {submission?.contractDrafter?.contract?.name ||
                   submission?.uploads?.contract?.name ||
                   'contract.pdf'}
                </p>
                <p className="upload-date">
                  Uploaded by: {submission?.contractDrafter?.uploadedBy || 'Contract Drafter'}
                </p>
              </div>
              <div className="document-actions">
                <button
                  className="btn-preview"
                  onClick={() => handlePreviewDocument(
                    submission?.contractDrafter?.contract || submission?.uploads?.contract
                  )}
                >
                  Preview
                </button>
              </div>
            </div>
          )}

          {/* Passport/ID - Sensitive Document */}
          {(submission?.uploads?.passportPhoto || submission?.uploadedFiles?.passportPhoto) && (
            <div className="document-card document-sensitive">
              <div className="document-icon">🔒</div>
              <div className="document-info">
                <h4>Identity Document</h4>
                <p className="file-name">Passport/Driving Licence</p>
                <p className="upload-date sensitive-note">
                  ⚠️ Sensitive document - View restricted
                </p>
              </div>
              <div className="document-actions">
                <span className="verified-badge">✓ Verified</span>
              </div>
            </div>
          )}

          {/* No documents message */}
          {!submission?.uploads && !submission?.uploadedFiles && (
            <p className="no-documents">No documents were uploaded with this submission.</p>
          )}
        </div>
      </div>

      {/* AP Verification Checklist */}
      {!apReview && (
        <div style={{
          marginTop: 'var(--space-32)',
          padding: 'var(--space-24)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-base)',
          border: '2px solid var(--color-border)',
        }}>
          <h4 style={{ margin: '0 0 var(--space-16) 0', color: 'var(--nhs-blue)' }}>
            AP Verification Checklist
          </h4>

          <NoticeBox type="warning" style={{ marginBottom: 'var(--space-16)' }}>
            <strong>Verification Required:</strong>
            <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>
              Please verify all banking and financial details against supporting documentation before approving this supplier for system setup.
              All mandatory items must be checked before submission.
            </p>
          </NoticeBox>

          {/* Supplier Details Fields */}
          <div style={{
            padding: 'var(--space-16)',
            backgroundColor: '#f0f7ff',
            borderRadius: 'var(--radius-base)',
            border: '1px solid var(--nhs-blue)',
            marginBottom: 'var(--space-24)',
          }}>
            <h4 style={{ margin: '0 0 var(--space-16) 0', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--nhs-blue)' }}>
              Supplier Setup Information
            </h4>

            <Input
              label="Supplier Name"
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Verify and edit supplier name if needed"
              required
              style={{ marginBottom: 'var(--space-16)' }}
            />

            <Input
              label="Supplier Number (assigned by AP)"
              type="text"
              value={supplierNumber}
              onChange={(e) => setSupplierNumber(e.target.value)}
              placeholder="e.g., SUP-12345"
              required
              style={{ marginBottom: 'var(--space-16)' }}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-24)' }}>
            <Checkbox
              label="Bank details verified against letterhead or bank statement"
              checked={bankDetailsVerified}
              onChange={setBankDetailsVerified}
              required
              style={{ marginBottom: 'var(--space-12)' }}
            />

            <Checkbox
              label="Company details verified (name, address, registration numbers)"
              checked={companyDetailsVerified}
              onChange={setCompanyDetailsVerified}
              required
              style={{ marginBottom: 'var(--space-12)' }}
            />

            <Checkbox
              label="VAT number verified (if applicable)"
              checked={vatVerified}
              onChange={setVatVerified}
              style={{ marginBottom: 'var(--space-12)' }}
            />

            <Checkbox
              label="Insurance details verified (coverage and expiry dates)"
              checked={insuranceVerified}
              onChange={setInsuranceVerified}
              style={{ marginBottom: 'var(--space-12)' }}
            />
          </div>

          <Textarea
            label="Additional Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add any notes about the verification process, discrepancies found, or special instructions..."
            maxLength={500}
            showCharCount
            style={{ marginBottom: 'var(--space-16)' }}
          />

          <SignatureSection
            signatureName={signatureName}
            signatureDate={signatureDate}
            onSignatureChange={({ signatureName: name, signatureDate: date }) => {
              setSignatureName(name);
              setSignatureDate(date);
            }}
          />

          <div style={{ display: 'flex', gap: 'var(--space-12)', marginTop: 'var(--space-16)' }}>
            <Button
              variant="primary"
              onClick={handleSubmitVerification}
              disabled={isSubmitting || !bankDetailsVerified || !companyDetailsVerified}
              style={{ backgroundColor: 'var(--color-success)' }}
            >
              {isSubmitting ? 'Submitting...' : 'Complete AP Verification'}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.close()}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Hidden PDF Download Link for auto-download after verification */}
      <PDFDownloadLink
        id="ap-complete-pdf-download"
        document={
          <SupplierFormPDF
            formData={submission?.formData}
            uploadedFiles={submission?.uploadedFiles || {}}
            submissionId={submission?.submissionId}
            submissionDate={submission?.submissionDate}
            submission={{
              ...submission,
              pbpReview: submission?.pbpReview || null,
              procurementReview: submission?.procurementReview || null,
              opwReview: submission?.opwReview || null,
              contractDrafter: submission?.contractDrafter || null,
              apReview: submission?.apReview || {
                decision: 'verified',
                supplierName: supplierName,
                supplierNumber: supplierNumber,
                signature: signatureName,
                date: signatureDate,
                bankDetailsVerified,
                companyDetailsVerified,
              },
            }}
          />
        }
        fileName={`Supplier_Form_COMPLETE_${submission?.alembaReference || submission?.submissionId || 'unknown'}.pdf`}
        style={{ display: 'none' }}
      >
        {({ loading }) => null}
      </PDFDownloadLink>

      {/* Back Button */}
      <div style={{ marginTop: 'var(--space-32)', textAlign: 'center' }}>
        <Button variant="outline" onClick={() => window.close()}>
          Close Preview
        </Button>
      </div>
    </div>
  );
};

export default APControlReviewPage;
