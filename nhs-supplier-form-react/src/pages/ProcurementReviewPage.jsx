/**
 * Procurement Review Page
 * Allows Procurement team to review and approve/request info/reject supplier setup forms
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button, NoticeBox, ApprovalStamp, Textarea, SignatureSection } from '../components/common';
import { formatDate, formatCurrency } from '../utils/helpers';
import { formatYesNo, formatFieldValue, capitalizeWords, formatSupplierType, formatServiceCategory, formatUsageFrequency } from '../utils/formatters';
import SupplierFormPDF from '../components/pdf/SupplierFormPDF';

const ReviewItem = ({ label, value, raw = false }) => {
  if (!value && value !== 0) return null;

  // Format the value unless raw is true
  const displayValue = raw ? value : formatFieldValue(value);

  return (
    <div style={{ display: 'flex', marginBottom: 'var(--space-8)' }}>
      <div style={{ fontWeight: 'var(--font-weight-medium)', minWidth: '200px', color: 'var(--color-text-secondary)' }}>
        {label}:
      </div>
      <div style={{ color: 'var(--color-text)', paddingLeft: '16px' }}>{displayValue}</div>
    </div>
  );
};

const ReviewCard = ({ title, children }) => {
  return (
    <div
      style={{
        padding: 'var(--space-24)',
        borderRadius: 'var(--radius-base)',
        border: '2px solid var(--color-border)',
        marginBottom: 'var(--space-16)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <h4 style={{ margin: '0 0 var(--space-16) 0', color: 'var(--nhs-blue)' }}>
        {title}
      </h4>
      <div>{children}</div>
    </div>
  );
};

const ProcurementReviewPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalAction, setApprovalAction] = useState(null); // 'approved' | 'rejected'
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierClassification, setSupplierClassification] = useState('standard'); // 'standard' | 'opw_ir35'
  const [alembaReference, setAlembaReference] = useState('');

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
      } catch (error) {
        console.error('Error parsing submission:', error);
      }
    }

    setLoading(false);
  }, [submissionId]);

  const handleDecision = async (action) => {
    if (!comments.trim() && action === 'rejected') {
      alert('Please provide comments explaining your decision');
      return;
    }

    if (action === 'approved' && !alembaReference.trim()) {
      alert('Please provide the Alemba Call Reference Number');
      return;
    }

    if (!signatureName.trim()) {
      alert('Please provide your digital signature (full name)');
      return;
    }

    if (!signatureDate) {
      alert('Please select a date for your signature');
      return;
    }

    setIsSubmitting(true);

    try {
      // Load fresh from localStorage to get any updates
      const currentSubmission = JSON.parse(localStorage.getItem(`submission_${submissionId}`)) || submission;

      // Update submission with procurement review
      const updatedSubmission = {
        ...currentSubmission, // Use fresh data from localStorage
        // Store Alemba reference at top level for easy access
        alembaReference: action === 'approved' ? alembaReference : currentSubmission.alembaReference,
        displayReference: action === 'approved' ? alembaReference : currentSubmission.displayReference,
        // Add procurement review
        procurementReview: {
          supplierClassification,
          decision: action,
          comments,
          alembaReference: action === 'approved' ? alembaReference : null,
          signature: signatureName,
          date: signatureDate,
          reviewedBy: 'Procurement Team', // In real app, this would come from auth
          reviewedAt: new Date().toISOString(),
        },
      };

      console.log('Procurement Review - Saving submission:', updatedSubmission);
      console.log('Has pbpReview:', !!updatedSubmission.pbpReview);
      console.log('PBP Review preserved:', updatedSubmission.pbpReview);
      console.log('Procurement Review:', updatedSubmission.procurementReview);

      // Save back to localStorage
      localStorage.setItem(`submission_${submissionId}`, JSON.stringify(updatedSubmission));

      // Update submissions list
      const submissions = JSON.parse(localStorage.getItem('all_submissions') || '[]');
      const index = submissions.findIndex(s => s.submissionId === submissionId);
      if (index !== -1) {
        submissions[index].procurementStatus = action;
        localStorage.setItem('all_submissions', JSON.stringify(submissions));
      }

      setSubmission(updatedSubmission);
      setApprovalAction(null);
      setComments('');

      const actionText = action === 'approved' ? 'approved' : 'rejected';
      alert(`Submission ${actionText} successfully!`);
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
  const procurementReview = submission.procurementReview;

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
            Procurement Review: Supplier Setup Form
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

        {/* Approval Stamp & Actions */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', alignItems: 'flex-end' }}>
          {procurementReview && (
            <ApprovalStamp
              status={procurementReview.decision === 'approved' ? 'approved' : procurementReview.decision === 'rejected' ? 'rejected' : 'pending'}
              date={procurementReview.reviewedAt}
              approver={procurementReview.reviewedBy}
              size="large"
            />
          )}
                  </div>
      </div>

      {/* Status Notice */}
      {procurementReview && (
        <NoticeBox
          type={procurementReview.decision === 'approved' ? 'success' : procurementReview.decision === 'rejected' ? 'error' : 'warning'}
          style={{ marginBottom: 'var(--space-24)' }}
        >
          <strong>Procurement Review Decision:</strong> {procurementReview.decision === 'approved' ? 'Approved' : procurementReview.decision === 'rejected' ? 'Rejected' : 'More Information Required'}
          <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>
            <strong>Classification:</strong> {procurementReview.supplierClassification === 'standard' ? 'Standard Supplier' : 'Potential OPW/IR35'}
          </p>
          <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>{procurementReview.comments}</p>
        </NoticeBox>
      )}

      {/* Section 1: Requester Information */}
      <ReviewCard title="Section 1: Requester Information">
        <ReviewItem label="Name" value={`${formData.firstName || ''} ${formData.lastName || ''}`} />
        <ReviewItem label="Job Title" value={formData.jobTitle} />
        <ReviewItem label="Department" value={formData.department} />
        <ReviewItem label="NHS Email" value={formData.nhsEmail} />
        <ReviewItem label="Phone" value={formData.phoneNumber} />
      </ReviewCard>

      {/* Section 2: Pre-screening */}
      <ReviewCard title="Section 2: Pre-screening & Authorisation">
        <ReviewItem label="Service Category" value={formatServiceCategory(formData.serviceCategory)} raw />
        <ReviewItem label="Procurement Engaged" value={formData.procurementEngaged} />
        <ReviewItem label="Letterhead Available" value={formData.letterheadAvailable} />
        <ReviewItem label="Sole Trader Status" value={formData.soleTraderStatus} />
        <ReviewItem label="Usage Frequency" value={formatUsageFrequency(formData.usageFrequency)} raw />
        <ReviewItem label="Supplier Connection" value={formData.supplierConnection} />
        {/* Conflict of Interest Warning */}
        {formData.supplierConnection === 'yes' && formData.connectionDetails && (
          <div style={{
            marginTop: 'var(--space-12)',
            padding: 'var(--space-12)',
            backgroundColor: '#fef3c7',
            borderRadius: 'var(--radius-base)',
            border: '2px solid #f59e0b'
          }}>
            <strong style={{ color: '#b45309' }}>⚠️ Conflict of Interest - Connection Details:</strong>
            <p style={{ margin: 'var(--space-8) 0 0 0', color: '#92400e' }}>{formData.connectionDetails}</p>
          </div>
        )}
        {formData.justification && (
          <div style={{ marginTop: 'var(--space-12)', padding: 'var(--space-12)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-base)' }}>
            <strong>Justification:</strong>
            <p style={{ margin: 'var(--space-8) 0 0 0' }}>{formData.justification}</p>
          </div>
        )}
      </ReviewCard>

      {/* Section 3: Supplier Classification */}
      <ReviewCard title="Section 3: Supplier Classification">
        <ReviewItem label="Companies House Registered" value={formData.companiesHouseRegistered} />
        <ReviewItem label="Supplier Type" value={formatSupplierType(formData.supplierType)} raw />
        {formData.crn && <ReviewItem label="CRN" value={formData.crn} />}
        {formData.charityNumber && <ReviewItem label="Charity Number" value={formData.charityNumber} />}
        <ReviewItem label="Annual Value" value={formData.annualValue ? formatCurrency(formData.annualValue) : ''} />
        <ReviewItem label="Employee Count" value={formData.employeeCount} />
      </ReviewCard>

      {/* Section 4: Supplier Details */}
      <ReviewCard title="Section 4: Supplier Details">
        <ReviewItem label="Company Name" value={formData.companyName} />
        {formData.tradingName && <ReviewItem label="Trading Name" value={formData.tradingName} />}
        <ReviewItem label="Address" value={formData.registeredAddress} />
        <ReviewItem label="City" value={formData.city} />
        <ReviewItem label="Postcode" value={formData.postcode} />
        <ReviewItem label="Contact Name" value={formData.contactName} />
        <ReviewItem label="Contact Email" value={formData.contactEmail} />
        <ReviewItem label="Contact Phone" value={formData.contactPhone} />
        {formData.website && <ReviewItem label="Website" value={formData.website} />}
      </ReviewCard>

      {/* Section 5: Service Description */}
      <ReviewCard title="Section 5: Service Description">
        <ReviewItem label="Service Types" value={formData.serviceType?.join(', ')} />
        {formData.serviceDescription && (
          <div style={{ marginTop: 'var(--space-12)', padding: 'var(--space-12)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-base)' }}>
            <strong>Service Description:</strong>
            <p style={{ margin: 'var(--space-8) 0 0 0' }}>{formData.serviceDescription}</p>
          </div>
        )}
      </ReviewCard>

      {/* Section 6: Financial Information */}
      <ReviewCard title="Section 6: Financial & Accounts">
        <ReviewItem label="Overseas Supplier" value={formData.overseasSupplier} />
        {formData.iban && <ReviewItem label="IBAN" value={formData.iban} />}
        <ReviewItem label="Accounts Address Same" value={formData.accountsAddressSame} />
        <ReviewItem label="VAT Registered" value={formData.vatRegistered} />
        {formData.vatNumber && <ReviewItem label="VAT Number" value={formData.vatNumber} />}
        <ReviewItem label="Public Liability Insurance" value={formData.publicLiability} />
        {formData.plCoverage && <ReviewItem label="Coverage" value={formatCurrency(formData.plCoverage)} />}
      </ReviewCard>

      {/* Section 7: Acknowledgement */}
      <ReviewCard title="Section 7: Acknowledgement">
        <ReviewItem label="Final Acknowledgement" value={formData.finalAcknowledgement ? 'Confirmed' : 'Not confirmed'} />
      </ReviewCard>

      {/* Uploaded Documents */}
      {submission.uploadedFiles && Object.keys(submission.uploadedFiles).length > 0 && (
        <ReviewCard title="Uploaded Documents">
          {Object.entries(submission.uploadedFiles).map(([fieldName, file]) => {
            const labels = {
              procurementApproval: 'Procurement Approval Document',
              letterhead: 'Letterhead with Bank Details',
              cestForm: 'CEST Form',
              passportPhoto: 'Passport Photo',
              licenceFront: 'Driving Licence (Front)',
              licenceBack: 'Driving Licence (Back)',
              drivingLicenceFront: 'Driving Licence (Front)',
              drivingLicenceBack: 'Driving Licence (Back)',
              opwContract: 'OPW/IR35 Agreement',
            };

            return (
              <div key={fieldName} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-12)',
                padding: 'var(--space-12)',
                backgroundColor: 'var(--color-background)',
                borderRadius: 'var(--radius-base)',
                marginBottom: 'var(--space-8)',
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  background: '#eff6ff',
                  borderRadius: '6px',
                  color: '#005EB8',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>PDF</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                    {labels[fieldName] || fieldName}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    {file.name} • {Math.round(file.size / 1024)} KB
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handlePreviewDocument(file)}
                  style={{ fontSize: 'var(--font-size-sm)', padding: '6px 12px' }}
                >
                  Preview
                </Button>
              </div>
            );
          })}
        </ReviewCard>
      )}

      {/* Procurement Decision Panel */}
      {!procurementReview && (
        <div style={{
          marginTop: 'var(--space-32)',
          padding: 'var(--space-24)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-base)',
          border: '2px solid var(--color-border)',
        }}>
          <h4 style={{ margin: '0 0 var(--space-16) 0', color: 'var(--nhs-blue)' }}>
            Procurement Review Decision
          </h4>

          {/* Supplier Classification */}
          <div style={{ marginBottom: 'var(--space-24)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-8)', color: 'var(--nhs-blue)' }}>
              Supplier Classification
            </h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-16)' }}>
              Please classify this supplier:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-12)' }}>
              <label style={{
                display: 'block',
                padding: 'var(--space-16)',
                border: supplierClassification === 'standard' ? '2px solid var(--nhs-blue)' : '2px solid var(--color-border)',
                borderRadius: 'var(--radius-base)',
                backgroundColor: supplierClassification === 'standard' ? '#e8f4fd' : 'var(--color-background)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}>
                <input
                  type="radio"
                  name="supplierClassification"
                  value="standard"
                  checked={supplierClassification === 'standard'}
                  onChange={(e) => setSupplierClassification(e.target.value)}
                  style={{ marginRight: 'var(--space-8)' }}
                />
                <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                  <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                    Standard Supplier
                  </h4>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    Regular supplier setup - will be sent to AP Control for final approval
                  </p>
                </div>
              </label>

              <label style={{
                display: 'block',
                padding: 'var(--space-16)',
                border: supplierClassification === 'opw_ir35' ? '2px solid var(--nhs-blue)' : '2px solid var(--color-border)',
                borderRadius: 'var(--radius-base)',
                backgroundColor: supplierClassification === 'opw_ir35' ? '#e8f4fd' : 'var(--color-background)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}>
                <input
                  type="radio"
                  name="supplierClassification"
                  value="opw_ir35"
                  checked={supplierClassification === 'opw_ir35'}
                  onChange={(e) => setSupplierClassification(e.target.value)}
                  style={{ marginRight: 'var(--space-8)' }}
                />
                <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                  <h4 style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
                    Potential OPW/IR35
                  </h4>
                  <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    Requires IR35 determination - will be sent to OPW Panel for review
                  </p>
                </div>
              </label>
            </div>
          </div>

          {!approvalAction ? (
            <div style={{ display: 'flex', gap: 'var(--space-12)', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={() => setApprovalAction('approved')}
                style={{ backgroundColor: 'var(--color-success)' }}
              >
                ✓ Approve
              </Button>
              <Button
                variant="danger"
                onClick={() => setApprovalAction('rejected')}
              >
                ✕ Reject
              </Button>
            </div>
          ) : (
            <div>
              <NoticeBox type={approvalAction === 'approved' ? 'success' : 'error'}>
                <strong>
                  You are about to {approvalAction === 'approved' ? 'approve' : 'reject'} this submission.
                </strong>
                <p>
                  {approvalAction === 'approved'
                    ? 'Please provide any approval comments or notes (optional).'
                    : 'Please provide detailed comments explaining your rejection (required).'}
                </p>
              </NoticeBox>

              <Textarea
                label={approvalAction === 'approved' ? 'Approval Comments (Optional)' : 'Comments (Required)'}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                placeholder={
                  approvalAction === 'approved'
                    ? 'Add any notes or conditions for this approval...'
                    : 'Explain why this submission is being rejected...'
                }
                required={approvalAction !== 'approved'}
                style={{ marginTop: 'var(--space-16)' }}
              />

              {approvalAction === 'approved' && (
                <div className="form-group" style={{ marginTop: 'var(--space-16)' }}>
                  <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Alemba Call Reference Number
                    <span style={{ color: '#dc2626' }}> *</span>
                  </label>
                  <div className="info-box" style={{ marginBottom: '12px' }}>
                    <span className="info-icon">ℹ️</span>
                    <span style={{ color: '#1e40af' }}>
                      Enter the Alemba call reference number for this supplier setup request.
                      This will become the primary reference for tracking this supplier.
                    </span>
                  </div>
                  <input
                    type="text"
                    value={alembaReference}
                    onChange={(e) => setAlembaReference(e.target.value)}
                    placeholder="e.g., 3000545"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              )}

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
                  variant={approvalAction === 'approved' ? 'primary' : 'danger'}
                  onClick={() => handleDecision(approvalAction)}
                  disabled={isSubmitting || (approvalAction !== 'approved' && !comments.trim()) || (approvalAction === 'approved' && !alembaReference.trim())}
                >
                  {isSubmitting ? 'Processing...' : `Confirm ${approvalAction === 'approved' ? 'Approval' : 'Rejection'}`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setApprovalAction(null);
                    setComments('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Back Button & PDF Download */}
      <div style={{ marginTop: 'var(--space-32)', display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <Button variant="outline" onClick={() => window.close()}>
          Close Preview
        </Button>
        {procurementReview?.decision && (
          <PDFDownloadLink
            document={
              <SupplierFormPDF
                formData={submission.formData}
                uploadedFiles={submission.uploadedFiles || {}}
                submissionId={submission.submissionId}
                submissionDate={submission.submissionDate}
                submission={{
                  ...submission,
                  pbpReview: submission.pbpReview || null,
                  procurementReview: procurementReview,
                  opwReview: null,
                  contractDrafter: null,
                  apReview: null,
                }}
              />
            }
            fileName={`Supplier_Form_${submission?.alembaReference || submission?.submissionId || 'unknown'}_Procurement.pdf`}
            style={{
              padding: '12px 24px',
              background: '#005EB8',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            {({ loading }) => loading ? 'Generating PDF...' : 'Download Supplier Form PDF'}
          </PDFDownloadLink>
        )}
      </div>
    </div>
  );
};

export default ProcurementReviewPage;
