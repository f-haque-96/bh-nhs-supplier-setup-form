/**
 * OPW (Off-Payroll Working) Panel Review Page
 * Handles IR35 determination for sole trader suppliers
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button, NoticeBox, ApprovalStamp, Textarea, RadioGroup, SignatureSection, FileUpload, Input } from '../components/common';
import { formatDate } from '../utils/helpers';
import { formatYesNo, formatFieldValue, capitalizeWords, formatServiceCategory, formatUsageFrequency, formatServiceTypes } from '../utils/formatters';
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

const OPWReviewPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ir35Determination, setIr35Determination] = useState(''); // 'inside' | 'outside'
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractFile, setContractFile] = useState(null);
  const [contractUploadedBy, setContractUploadedBy] = useState('');
  const [isSavingContract, setIsSavingContract] = useState(false);

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

        // Pre-fill if already determined
        if (parsed.opwReview) {
          setIr35Determination(parsed.opwReview.ir35Status);
          setRationale(parsed.opwReview.rationale || '');
        }
      } catch (error) {
        console.error('Error parsing submission:', error);
      }
    }

    setLoading(false);
  }, [submissionId]);

  const handleSubmitDetermination = async () => {
    console.log('=== IR35 DETERMINATION SAVE ===');
    console.log('Selected IR35 Status:', ir35Determination);
    console.log('ir35Status value type:', typeof ir35Determination);

    if (!signatureName.trim()) {
      alert('Please provide your digital signature (full name)');
      return;
    }

    if (!signatureDate) {
      alert('Please select a date for your signature');
      return;
    }

    if (!ir35Determination) {
      alert('Please select an IR35 determination');
      return;
    }

    if (!rationale.trim()) {
      alert('Please provide a rationale for your determination');
      return;
    }

    setIsSubmitting(true);

    try {
      // Load fresh from localStorage to get any updates
      const currentSubmission = JSON.parse(localStorage.getItem(`submission_${submissionId}`)) || submission;

      // Update submission with OPW review
      const updatedSubmission = {
        ...currentSubmission, // Use fresh data from localStorage
        // Add OPW review
        opwReview: {
          ir35Status: ir35Determination,
          rationale,
          decision: 'approved', // OPW panel approved to proceed
          signature: signatureName,
          date: signatureDate,
          reviewedBy: 'OPW Panel Member', // In real app, this would come from auth
          reviewedAt: new Date().toISOString(),
        },
      };

      console.log('Saving OPW Review Data:', updatedSubmission.opwReview);
      console.log('ir35Status in saved data:', updatedSubmission.opwReview.ir35Status);
      console.log('OPW Review - Saving submission:', updatedSubmission);
      console.log('Has pbpReview:', !!updatedSubmission.pbpReview);
      console.log('Has procurementReview:', !!updatedSubmission.procurementReview);
      console.log('PBP Review preserved:', updatedSubmission.pbpReview);
      console.log('Procurement Review preserved:', updatedSubmission.procurementReview);
      console.log('OPW Review:', updatedSubmission.opwReview);

      // Save back to localStorage
      localStorage.setItem(`submission_${submissionId}`, JSON.stringify(updatedSubmission));

      // Update submissions list
      const submissions = JSON.parse(localStorage.getItem('all_submissions') || '[]');
      const index = submissions.findIndex(s => s.submissionId === submissionId);
      if (index !== -1) {
        submissions[index].ir35Status = ir35Determination;
        localStorage.setItem('all_submissions', JSON.stringify(submissions));
      }

      setSubmission(updatedSubmission);

      alert(`IR35 determination recorded: ${ir35Determination === 'inside' ? 'Inside IR35' : 'Outside IR35'}`);
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Failed to update submission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContractUpload = async (fileData) => {
    // FileUpload component passes an object with {name, size, type, file, base64}
    if (fileData) {
      console.log('Contract file uploaded:', fileData.name, 'Has base64:', !!fileData.base64);
      setContractFile(fileData);
    }
  };

  const handleSaveContract = async () => {
    if (!contractFile) {
      alert('Please upload a contract document');
      return;
    }

    if (!contractUploadedBy.trim()) {
      alert('Please enter the name of the person uploading the contract');
      return;
    }

    setIsSavingContract(true);

    try {
      // Load fresh from localStorage to get any updates
      const currentSubmission = JSON.parse(localStorage.getItem(`submission_${submissionId}`)) || submission;

      // Update submission with contract upload
      const updatedSubmission = {
        ...currentSubmission, // Use fresh data from localStorage
        // Add contract drafter info
        contractDrafter: {
          contract: contractFile,
          uploadedBy: contractUploadedBy,
          signature: contractUploadedBy,
          date: new Date().toISOString().split('T')[0],
          submittedAt: new Date().toISOString(),
        },
      };

      console.log('Contract Upload - Saving submission:', updatedSubmission);
      console.log('Has pbpReview:', !!updatedSubmission.pbpReview);
      console.log('Has procurementReview:', !!updatedSubmission.procurementReview);
      console.log('Has opwReview:', !!updatedSubmission.opwReview);
      console.log('PBP Review preserved:', updatedSubmission.pbpReview);
      console.log('Procurement Review preserved:', updatedSubmission.procurementReview);
      console.log('OPW Review preserved:', updatedSubmission.opwReview);
      console.log('Contract Drafter:', updatedSubmission.contractDrafter);

      // Save back to localStorage
      localStorage.setItem(`submission_${submissionId}`, JSON.stringify(updatedSubmission));

      // Update submissions list
      const submissions = JSON.parse(localStorage.getItem('all_submissions') || '[]');
      const index = submissions.findIndex(s => s.submissionId === submissionId);
      if (index !== -1) {
        submissions[index].contractUploaded = true;
        localStorage.setItem('all_submissions', JSON.stringify(submissions));
      }

      setSubmission(updatedSubmission);

      alert('Contract uploaded successfully! This will now be sent to AP Control for final review.');
    } catch (error) {
      console.error('Error uploading contract:', error);
      alert('Failed to upload contract. Please try again.');
    } finally {
      setIsSavingContract(false);
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
  const opwReview = submission.opwReview;
  const isSoleTrader = formData.soleTraderStatus === 'yes';

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
            OPW Panel Review: IR35 Determination
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

        {/* Determination Badge & Actions */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', alignItems: 'flex-end' }}>
          {opwReview && (
            <div style={{
              padding: 'var(--space-16)',
              borderRadius: 'var(--radius-base)',
              border: `3px solid ${opwReview.ir35Status === 'outside' ? 'var(--color-success)' : 'var(--color-danger)'}`,
              backgroundColor: opwReview.ir35Status === 'outside' ? '#d1fae5' : '#fee2e2',
              textAlign: 'center',
              minWidth: '180px',
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                IR35 Status
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: opwReview.ir35Status === 'outside' ? '#065f46' : '#991b1b' }}>
                {opwReview.ir35Status === 'outside' ? 'OUTSIDE IR35' : 'INSIDE IR35'}
              </div>
            </div>
          )}
                  </div>
      </div>

      {/* Warning if not sole trader */}
      {!isSoleTrader && (
        <NoticeBox type="warning" style={{ marginBottom: 'var(--space-24)' }}>
          <strong>Note:</strong> This supplier is not marked as a sole trader. IR35 determination may not be required.
          Sole Trader Status: <strong>{formData.soleTraderStatus || 'Not specified'}</strong>
        </NoticeBox>
      )}

      {/* OPW Review Status */}
      {opwReview && (
        <NoticeBox
          type={opwReview.ir35Status === 'outside' ? 'success' : 'error'}
          style={{ marginBottom: 'var(--space-24)' }}
        >
          <strong>IR35 Determination: {opwReview.ir35Status === 'outside' ? 'Outside IR35' : 'Inside IR35'}</strong>
          <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>
            <strong>Rationale:</strong> {opwReview.rationale}
          </p>
          <p style={{ marginTop: 'var(--space-8)', marginBottom: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            Reviewed by {opwReview.reviewedBy} on {formatDate(opwReview.reviewedAt)}
          </p>
        </NoticeBox>
      )}

      {/* Requester Information */}
      <ReviewCard title="Requester Information">
        <ReviewItem label="Name" value={`${formData.firstName || ''} ${formData.lastName || ''}`} />
        <ReviewItem label="Department" value={formData.department} />
        <ReviewItem label="NHS Email" value={formData.nhsEmail} />
      </ReviewCard>

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

      {/* Sole Trader Status & Evidence */}
      <ReviewCard title="Sole Trader Status & Evidence" highlight={isSoleTrader}>
        <ReviewItem label="Sole Trader Status" value={formData.soleTraderStatus} />

        {isSoleTrader && (
          <>
            <div style={{ marginTop: 'var(--space-16)', padding: 'var(--space-12)', backgroundColor: '#FFF', borderRadius: 'var(--radius-base)', border: '1px solid var(--color-border)' }}>
              <strong>Required Documents:</strong>
              <ul style={{ marginTop: 'var(--space-8)', marginBottom: 0, paddingLeft: '20px' }}>
                <li>CEST Form: {submission.uploadedFiles?.cestForm ? '✓ Uploaded' : '✗ Missing'}</li>
              </ul>
            </div>
          </>
        )}
      </ReviewCard>

      {/* Service Details */}
      <ReviewCard title="Service Details">
        <ReviewItem label="Service Category" value={formatServiceCategory(formData.serviceCategory)} raw />
        <ReviewItem label="Service Types" value={formatServiceTypes(formData.serviceType)} raw />
        <ReviewItem label="Usage Frequency" value={formatUsageFrequency(formData.usageFrequency)} raw />
        {formData.serviceDescription && (
          <div style={{ marginTop: 'var(--space-12)', padding: 'var(--space-12)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-base)' }}>
            <strong>Service Description:</strong>
            <p style={{ margin: 'var(--space-8) 0 0 0' }}>{formData.serviceDescription}</p>
          </div>
        )}
        {formData.justification && (
          <div style={{ marginTop: 'var(--space-12)', padding: 'var(--space-12)', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-base)' }}>
            <strong>Justification:</strong>
            <p style={{ margin: 'var(--space-8) 0 0 0' }}>{formData.justification}</p>
          </div>
        )}
      </ReviewCard>

      {/* Supplier Details */}
      <ReviewCard title="Supplier Details">
        <ReviewItem label="Company/Individual Name" value={formData.companyName} />
        <ReviewItem label="Contact Name" value={formData.contactName} />
        <ReviewItem label="Contact Email" value={formData.contactEmail} />
        <ReviewItem label="Contact Phone" value={formData.contactPhone} />
      </ReviewCard>

      {/* Uploaded Documents */}
      {submission.uploadedFiles && Object.keys(submission.uploadedFiles).length > 0 && (
        <ReviewCard title="Uploaded Documents">
          {Object.entries(submission.uploadedFiles).map(([fieldName, file]) => {
            const labels = {
              cestForm: 'CEST Form',
              passportPhoto: 'Passport Photo',
              licenceFront: 'Driving Licence (Front)',
              licenceBack: 'Driving Licence (Back)',
              opwContract: 'OPW/IR35 Agreement',
            };

            const isOPWRelated = ['cestForm'].includes(fieldName);

            return (
              <div key={fieldName} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-12)',
                padding: 'var(--space-12)',
                backgroundColor: isOPWRelated ? '#FFF9E6' : 'var(--color-background)',
                borderRadius: 'var(--radius-base)',
                border: isOPWRelated ? '1px solid var(--color-warning)' : '1px solid var(--color-border)',
                marginBottom: 'var(--space-8)',
              }}>
                <span style={{ fontSize: '24px' }}>{isOPWRelated ? '⚠️' : ''}</span>
                {!isOPWRelated && (
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
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                    {labels[fieldName] || fieldName}
                    {isOPWRelated && <span style={{ marginLeft: '8px', color: 'var(--color-warning)', fontSize: 'var(--font-size-sm)' }}>• IR35 Evidence</span>}
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

      {/* Previous Authorisations Section - Show before OPW decision */}
      <div className="previous-authorisations-section" style={{
        background: '#f0f7ff',
        border: '1px solid #005EB8',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        marginTop: '32px'
      }}>
        <h3 style={{ color: '#005EB8', marginTop: 0, marginBottom: '16px', fontSize: '1.25rem' }}>
          Previous Authorisations
        </h3>

        {/* PBP Review - if exists */}
        {submission?.pbpReview && (
          <div className="auth-card" style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px'
          }}>
            <h4 style={{ color: '#005EB8', marginTop: 0, marginBottom: '12px', fontSize: '1rem' }}>
              Procurement Business Partner
            </h4>
            <div className="auth-details">
              <p style={{ margin: '8px 0' }}>
                <strong>Decision:</strong>{' '}
                <span className={`status-badge ${submission.pbpReview.decision}`} style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background: submission.pbpReview.decision === 'approved' ? '#22c55e' : '#ef4444',
                  color: 'white'
                }}>
                  {submission.pbpReview.decision?.toUpperCase()}
                </span>
              </p>
              {submission.pbpReview.comments && (
                <p style={{ margin: '8px 0' }}><strong>Comments:</strong> {submission.pbpReview.comments}</p>
              )}
              <div className="signature-info" style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
                color: '#6b7280',
                fontSize: '0.9rem'
              }}>
                <span><strong>Signed by:</strong> {submission.pbpReview.signature || 'Not recorded'}</span>
                <span><strong>Date:</strong> {submission.pbpReview.date || 'Not recorded'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Procurement Review - should always exist if OPW is reviewing */}
        {submission?.procurementReview && (
          <div className="auth-card" style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px'
          }}>
            <h4 style={{ color: '#005EB8', marginTop: 0, marginBottom: '12px', fontSize: '1rem' }}>
              Procurement
            </h4>
            <div className="auth-details">
              <p style={{ margin: '8px 0' }}>
                <strong>Classification:</strong>{' '}
                {submission.procurementReview.supplierClassification === 'standard'
                  ? 'Standard Supplier'
                  : 'Potential OPW/IR35'}
              </p>
              <p style={{ margin: '8px 0' }}>
                <strong>Decision:</strong>{' '}
                <span className={`status-badge ${submission.procurementReview.decision}`} style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background: submission.procurementReview.decision === 'approved' ? '#22c55e' : '#ef4444',
                  color: 'white'
                }}>
                  {submission.procurementReview.decision?.toUpperCase()}
                </span>
              </p>
              {submission.procurementReview.comments && (
                <p style={{ margin: '8px 0' }}><strong>Comments:</strong> {submission.procurementReview.comments}</p>
              )}
              <div className="signature-info" style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #e5e7eb',
                color: '#6b7280',
                fontSize: '0.9rem'
              }}>
                <span><strong>Signed by:</strong> {submission.procurementReview.signature || 'Not recorded'}</span>
                <span><strong>Date:</strong> {submission.procurementReview.date || 'Not recorded'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* IR35 Determination Panel */}
      {!opwReview && (
        <div style={{
          marginTop: 'var(--space-32)',
          padding: 'var(--space-24)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-base)',
          border: '2px solid var(--color-border)',
        }}>
          <h4 style={{ margin: '0 0 var(--space-16) 0', color: 'var(--nhs-blue)' }}>
            IR35 Determination
          </h4>

          <NoticeBox type="info" style={{ marginBottom: 'var(--space-16)' }}>
            <strong>IR35 Guidance:</strong>
            <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>
              Based on the CEST form, determine whether this engagement falls inside or outside IR35.
              Consider factors such as control, substitution, mutuality of obligation, and the nature of the working relationship.
            </p>
          </NoticeBox>

          <div style={{ marginBottom: 'var(--space-16)' }}>
            <RadioGroup
              label="IR35 Determination"
              name="ir35Determination"
              options={[
                {
                  value: 'outside',
                  label: 'Outside IR35',
                  description: 'Worker is genuinely self-employed - operates own business with control, risk, and multiple clients'
                },
                {
                  value: 'inside',
                  label: 'Inside IR35',
                  description: 'Worker operates like an employee - subject to control, no business risk, single client relationship'
                },
              ]}
              value={ir35Determination}
              onChange={setIr35Determination}
              required
            />
          </div>

          <Textarea
            label="Rationale for Determination (Required)"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={6}
            placeholder="Provide a detailed rationale for your IR35 determination, referencing the CEST form and evidence provided. Explain key factors considered such as control, substitution rights, mutuality of obligation, and financial risk..."
            required
            maxLength={1000}
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
              onClick={handleSubmitDetermination}
              disabled={isSubmitting || !ir35Determination || !rationale.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Determination'}
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

      {/* Contract Upload Section - Show after determination is made */}
      {opwReview && (
        <div style={{
          marginTop: 'var(--space-32)',
          padding: 'var(--space-24)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-base)',
          border: '2px solid var(--color-border)',
        }}>
          <h4 style={{ margin: '0 0 var(--space-16) 0', color: 'var(--nhs-blue)' }}>
            Contract/Agreement
          </h4>

          {!submission.contractDrafter ? (
            <div>
              <NoticeBox type="info" style={{ marginBottom: 'var(--space-16)' }}>
                <strong>Contract Upload Required:</strong>
                <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>
                  Please upload the signed contract or agreement for this engagement. Once uploaded, this will be sent to AP Control for final approval.
                </p>
              </NoticeBox>

              <div style={{ marginBottom: 'var(--space-16)' }}>
                <FileUpload
                  name="opwContract"
                  label="Contract/Agreement (PDF)"
                  acceptedTypes={['application/pdf']}
                  onUpload={handleContractUpload}
                  required
                />
                {contractFile && (
                  <div style={{
                    marginTop: 'var(--space-8)',
                    padding: 'var(--space-12)',
                    backgroundColor: '#d1fae5',
                    borderRadius: 'var(--radius-base)',
                    fontSize: 'var(--font-size-sm)',
                  }}>
                    ✓ File selected: {contractFile.name}
                  </div>
                )}
              </div>

              <Input
                label="Uploaded by (Full Name)"
                type="text"
                value={contractUploadedBy}
                onChange={(e) => setContractUploadedBy(e.target.value)}
                placeholder="Enter your full name"
                required
                style={{ marginBottom: 'var(--space-16)' }}
              />

              <Button
                variant="primary"
                onClick={handleSaveContract}
                disabled={isSavingContract || !contractFile || !contractUploadedBy.trim()}
                style={{ backgroundColor: 'var(--color-success)' }}
              >
                {isSavingContract ? 'Uploading...' : 'Save Contract & Send to AP Control'}
              </Button>
            </div>
          ) : (
            <div>
              <NoticeBox type="success" style={{ marginBottom: 'var(--space-16)' }}>
                <strong>✓ Contract Uploaded Successfully</strong>
                <p style={{ marginTop: 'var(--space-8)', marginBottom: 0 }}>
                  Uploaded by: <strong>{submission.contractDrafter.uploadedBy}</strong>
                </p>
                <p style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
                  Upload date: {formatDate(submission.contractDrafter.submittedAt)}
                </p>
              </NoticeBox>

              {submission.contractDrafter.contract && (
                <Button
                  variant="outline"
                  onClick={() => handlePreviewDocument(submission.contractDrafter.contract)}
                >
                  Preview Contract
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Back Button & PDF Download */}
      <div style={{ marginTop: 'var(--space-32)', display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <Button variant="outline" onClick={() => window.close()}>
          Close Preview
        </Button>
        {opwReview?.decision && (
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
                  procurementReview: submission.procurementReview || null,
                  opwReview: opwReview,
                  contractDrafter: submission.contractDrafter || null,
                  apReview: null,
                }}
              />
            }
            fileName={`Supplier_Form_${submission?.alembaReference || submission?.submissionId || 'unknown'}_OPW.pdf`}
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

export default OPWReviewPage;
