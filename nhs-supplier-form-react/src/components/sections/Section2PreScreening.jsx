/**
 * Section 2: Pre-screening & Authorisation
 * Implements progressive disclosure - questions unlock sequentially
 */

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RadioGroup, Textarea, Checkbox, FileUpload, NoticeBox, Button, QuestionLabel } from '../common';
import { FormNavigation } from '../layout';
import { section2Schema } from '../../utils/validation';
import { FILE_UPLOAD_CONFIG } from '../../utils/constants';
import useFormStore from '../../stores/formStore';
import useFormNavigation from '../../hooks/useFormNavigation';
import QuestionnaireModal from '../modals/QuestionnaireModal';

const Section2PreScreening = () => {
  const {
    formData,
    updateFormData,
    updateMultipleFields,
    uploadedFiles,
    setUploadedFile,
    removeUploadedFile,
    prescreeningProgress,
    updatePrescreeningProgress
  } = useFormStore();
  const { handleNext, handlePrev } = useFormNavigation();
  const [isQuestionnaireModalOpen, setIsQuestionnaireModalOpen] = useState(false);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(
    formData.questionnaireCompleted || prescreeningProgress.questionnaireSubmitted || false
  );

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: zodResolver(section2Schema),
    defaultValues: {
      serviceCategory: formData.serviceCategory || '',
      procurementEngaged: formData.procurementEngaged || '',
      letterheadAvailable: formData.letterheadAvailable || '',
      justification: formData.justification || '',
      usageFrequency: formData.usageFrequency || '',
      supplierConnection: formData.supplierConnection || '',
      prescreeningAcknowledgement: formData.prescreeningAcknowledgement || false,
    },
  });

  // Watch fields for conditional rendering and progressive disclosure
  const serviceCategory = watch('serviceCategory');
  const procurementEngaged = watch('procurementEngaged');
  const letterheadAvailable = watch('letterheadAvailable');
  const justification = watch('justification');
  const usageFrequency = watch('usageFrequency');
  const supplierConnection = watch('supplierConnection');

  // Update prescreening progress when serviceCategory is answered
  useEffect(() => {
    if (serviceCategory && !prescreeningProgress.serviceCategoryAnswered) {
      updatePrescreeningProgress({ serviceCategoryAnswered: true });
    }
  }, [serviceCategory, prescreeningProgress.serviceCategoryAnswered, updatePrescreeningProgress]);

  // Update prescreening progress when procurementEngaged is answered
  useEffect(() => {
    if (procurementEngaged && procurementEngaged !== prescreeningProgress.procurementEngaged) {
      updatePrescreeningProgress({ procurementEngaged });
    }
  }, [procurementEngaged, prescreeningProgress.procurementEngaged, updatePrescreeningProgress]);

  // Check if procurement approval document is uploaded
  useEffect(() => {
    if (procurementEngaged === 'yes' && uploadedFiles.procurementApproval && !prescreeningProgress.procurementApproved) {
      updatePrescreeningProgress({ procurementApproved: true });
    }
  }, [procurementEngaged, uploadedFiles.procurementApproval, prescreeningProgress.procurementApproved, updatePrescreeningProgress]);

  // Check if questionnaire has been approved by PBP
  useEffect(() => {
    if (prescreeningProgress.questionnaireId && !prescreeningProgress.procurementApproved) {
      // Check localStorage for questionnaire approval status
      const questionnaireKey = `submission_${prescreeningProgress.questionnaireId}`;
      const questionnaireData = localStorage.getItem(questionnaireKey);

      if (questionnaireData) {
        try {
          const submission = JSON.parse(questionnaireData);
          if (submission.status === 'approved') {
            // Questionnaire has been approved by PBP - unlock remaining questions
            updatePrescreeningProgress({
              procurementApproved: true,
              approverName: submission.approver || 'PBP',
              approvalDate: submission.approvalDate,
            });
          }
        } catch (error) {
          console.error('Error checking questionnaire approval:', error);
        }
      }
    }
  }, [prescreeningProgress.questionnaireId, prescreeningProgress.procurementApproved, updatePrescreeningProgress]);

  // Determine which questions should be active/locked (strict one-by-one)
  // ORDER: Q2.1 Supplier Connection, Q2.2 Letterhead, Q2.3 Justification, Q2.4 Usage Frequency,
  // Q2.5 Service Category (Clinical/Non-clinical), Q2.6 Procurement, Q2.7 Acknowledgement

  const isBlockedByLetterhead = letterheadAvailable === 'no';

  // Check if connection details are required but not filled
  const connectionDetailsRequired = supplierConnection === 'yes';
  const connectionDetailsMissing = connectionDetailsRequired && (!formData.connectionDetails || formData.connectionDetails.trim() === '');

  // Check if justification meets minimum 10 character requirement
  const justificationText = formData.justification?.trim() || '';
  const isJustificationValid = justificationText.length >= 10;

  // Check if questionnaire has been completed (for procurement "no" path)
  const isQuestionnaireComplete = questionnaireCompleted || prescreeningProgress.questionnaireSubmitted;

  const questionStatus = {
    // Q2.1 - Supplier Connection (always unlocked, first question)
    q1_supplierConnection: {
      locked: false,
      reason: ''
    },
    // Q2.2 - Letterhead with Bank Details
    q2_letterhead: {
      locked: !supplierConnection || connectionDetailsMissing,
      reason: connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : 'Please answer the supplier connection question first'
    },
    // Q2.3 - Justification (moved from Q6)
    q3_justification: {
      locked: !supplierConnection || connectionDetailsMissing || isBlockedByLetterhead || !letterheadAvailable || (letterheadAvailable === 'yes' && !uploadedFiles.letterhead),
      reason: !supplierConnection
        ? 'Please answer the supplier connection question first'
        : connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : isBlockedByLetterhead
        ? 'You must select "Yes" and upload a letterhead to proceed'
        : letterheadAvailable === 'yes' && !uploadedFiles.letterhead
        ? 'Please upload the letterhead document'
        : 'Answer the letterhead question first'
    },
    // Q2.4 - Usage Frequency
    q4_usageFrequency: {
      locked: !supplierConnection ||
              connectionDetailsMissing ||
              isBlockedByLetterhead ||
              !letterheadAvailable ||
              (letterheadAvailable === 'yes' && !uploadedFiles.letterhead) ||
              !isJustificationValid,
      reason: !supplierConnection
        ? 'Please answer the supplier connection question first'
        : connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : isBlockedByLetterhead
        ? 'You must select "Yes" and upload a letterhead to proceed'
        : letterheadAvailable === 'yes' && !uploadedFiles.letterhead
        ? 'Please upload the letterhead document'
        : !isJustificationValid
        ? 'Please provide justification (minimum 10 characters)'
        : 'Answer the letterhead question first'
    },
    // Q2.5 - Service Category (Clinical/Non-clinical)
    q5_serviceCategory: {
      locked: !supplierConnection ||
              connectionDetailsMissing ||
              isBlockedByLetterhead ||
              !letterheadAvailable ||
              (letterheadAvailable === 'yes' && !uploadedFiles.letterhead) ||
              !isJustificationValid ||
              !usageFrequency,
      reason: !supplierConnection
        ? 'Please answer the supplier connection question first'
        : connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : isBlockedByLetterhead
        ? 'You must select "Yes" and upload a letterhead to proceed'
        : letterheadAvailable === 'yes' && !uploadedFiles.letterhead
        ? 'Please upload the letterhead document'
        : !isJustificationValid
        ? 'Please provide justification (minimum 10 characters)'
        : !usageFrequency
        ? 'Please select usage frequency first'
        : 'Please complete all previous questions'
    },
    // Q2.6 - Procurement Engagement
    q6_procurement: {
      locked: !supplierConnection ||
              connectionDetailsMissing ||
              isBlockedByLetterhead ||
              !letterheadAvailable ||
              (letterheadAvailable === 'yes' && !uploadedFiles.letterhead) ||
              !isJustificationValid ||
              !usageFrequency ||
              !serviceCategory,
      reason: !supplierConnection
        ? 'Please answer the supplier connection question first'
        : connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : isBlockedByLetterhead
        ? 'You must select "Yes" and upload a letterhead to proceed'
        : letterheadAvailable === 'yes' && !uploadedFiles.letterhead
        ? 'Please upload the letterhead document'
        : !isJustificationValid
        ? 'Please provide justification (minimum 10 characters)'
        : !usageFrequency
        ? 'Please select usage frequency first'
        : !serviceCategory
        ? 'Please select service category first'
        : 'Please complete all previous questions'
    },
    // Q2.7 - Acknowledgement
    // Unlocked when: procurement = "yes" AND approval uploaded, OR procurement = "no" AND questionnaire completed
    q7_acknowledgement: {
      locked: !supplierConnection ||
              connectionDetailsMissing ||
              isBlockedByLetterhead ||
              !procurementEngaged ||
              (procurementEngaged === 'yes' && !uploadedFiles.procurementApproval) ||
              (procurementEngaged === 'no' && !isQuestionnaireComplete),
      reason: !supplierConnection
        ? 'Please answer the supplier connection question first'
        : connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : isBlockedByLetterhead
        ? 'You must select "Yes" and upload a letterhead to proceed'
        : procurementEngaged === 'yes' && !uploadedFiles.procurementApproval
        ? 'Please upload the procurement approval document'
        : procurementEngaged === 'no' && !isQuestionnaireComplete
        ? 'Please complete the questionnaire for PBP review'
        : 'Please complete all previous questions'
    }
  };

  // Get question state class
  const getQuestionClass = (isLocked) => {
    if (isLocked) return 'question-block question-block--locked';
    return 'question-block question-block--active';
  };

  // Lock overlay component
  const LockOverlay = ({ reason }) => (
    <div className="locked-overlay">
      <div className="locked-overlay-content">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
        </svg>
        <p className="lock-reason">{reason}</p>
      </div>
    </div>
  );

  const onSubmit = (data) => {
    // Validate connection details if supplier connection is 'yes'
    if (data.supplierConnection === 'yes') {
      const connectionDetails = formData.connectionDetails?.trim();
      if (!connectionDetails) {
        alert('Please describe your connection to this supplier before proceeding.');
        return;
      }
    }

    // Validate justification minimum 10 characters
    const justificationValue = formData.justification?.trim() || '';
    if (justificationValue.length < 10) {
      alert('Please provide justification with at least 10 characters.');
      return;
    }

    // Validate based on procurement engagement answer
    if (data.procurementEngaged === 'no' && !isQuestionnaireComplete) {
      alert('Please complete the questionnaire for PBP review before proceeding.');
      return;
    }

    // Validate required files
    const requiredFiles = [];

    if (data.procurementEngaged === 'yes' && !uploadedFiles.procurementApproval) {
      requiredFiles.push('Procurement Approval Document');
    }
    if (data.letterheadAvailable === 'yes' && !uploadedFiles.letterhead) {
      requiredFiles.push('Letterhead Document');
    }

    if (requiredFiles.length > 0) {
      alert(`Please upload the following required documents:\n${requiredFiles.join('\n')}`);
      return;
    }

    // Update form store
    updateMultipleFields(data);

    // Move to next section
    handleNext();
  };

  // Update form store on field changes
  const handleFieldChange = (field, value) => {
    updateFormData(field, value);
  };

  // Handle questionnaire modal
  const handleOpenQuestionnaire = () => {
    if (!serviceCategory) {
      alert('Please select Clinical or Non-clinical service first (Q2.6)');
      return;
    }
    setIsQuestionnaireModalOpen(true);
  };

  const handleCloseQuestionnaire = (completed = false) => {
    setIsQuestionnaireModalOpen(false);
    if (completed) {
      setQuestionnaireCompleted(true);
      updateFormData('questionnaireCompleted', true);
    }
  };

  // Handle procurement engagement change - trigger questionnaire if "no"
  const handleProcurementEngagedChange = (value, fieldOnChange) => {
    fieldOnChange(value);
    handleFieldChange('procurementEngaged', value);

    // If "No" is selected, open the questionnaire modal
    if (value === 'no') {
      if (serviceCategory) {
        setIsQuestionnaireModalOpen(true);
      } else {
        alert('Please select Clinical or Non-clinical service first (Q2.6)');
      }
    }
  };

  return (
    <section className="form-section active" id="section-2">
      <h3>Pre-screening & Authorisation</h3>
      <p className="section-subtitle">
        Complete these questions in order. Each question unlocks after the previous one is answered.
      </p>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* QUESTION 1: Supplier Connection (CONFLICT OF INTEREST - NOW FIRST) */}
        <div className={getQuestionClass(questionStatus.q1_supplierConnection.locked)}>
          <div className="form-group">
            <QuestionLabel section="2" question="1">
              Do you have any personal or financial connection to this supplier?
            </QuestionLabel>

            {/* Declaration text BEFORE radio buttons */}
            <div className="declaration-notice" style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              marginTop: '12px'
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
            <Controller
              name="supplierConnection"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  label=""
                  name="supplierConnection"
                  options={[
                    { value: 'no', label: 'No - I have no connection to this supplier' },
                    { value: 'yes', label: 'Yes - I need to declare a connection' },
                  ]}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    handleFieldChange('supplierConnection', value);
                  }}
                  error={errors.supplierConnection?.message}
                  required
                />
              )}
            />

            {/* Show connection details if Yes selected */}
            {supplierConnection === 'yes' && (
              <div className="connection-details" style={{ marginTop: '16px' }}>
                <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                  Please describe your connection to this supplier{' '}
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <Controller
                  name="connectionDetails"
                  control={control}
                  defaultValue={formData.connectionDetails || ''}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleFieldChange('connectionDetails', e.target.value);
                      }}
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '12px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                      }}
                      placeholder="Provide details of your relationship with this supplier..."
                      required
                      rows={4}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* QUESTION 2: Letterhead with Bank Details */}
        <div className={getQuestionClass(questionStatus.q2_letterhead.locked)}>
          {questionStatus.q2_letterhead.locked && <LockOverlay reason={questionStatus.q2_letterhead.reason} />}

          <Controller
            name="letterheadAvailable"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label={<QuestionLabel section="2" question="2">Do you have a letterhead with bank details from the supplier?</QuestionLabel>}
                name="letterheadAvailable"
                options={[
                  { value: 'yes', label: 'Yes' },
                  {
                    value: 'no',
                    label: 'No',
                    tooltip: 'You will need to obtain a letterhead with bank details from the supplier before proceeding'
                  },
                ]}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  handleFieldChange('letterheadAvailable', value);
                }}
                error={errors.letterheadAvailable?.message}
                required
                horizontal
              />
            )}
          />

          {letterheadAvailable === 'no' && !questionStatus.q2_letterhead.locked && (
            <div className="blocking-warning">
              <span className="warning-icon">⚠</span>
              <p>You must upload bank details on supplier letterhead to proceed. Please select "Yes" and upload the document.</p>
            </div>
          )}

          {letterheadAvailable === 'yes' && !questionStatus.q2_letterhead.locked && (
            <FileUpload
              label="Upload Letterhead Document"
              name="letterhead"
              acceptedTypes={['application/pdf']}
              acceptedExtensions={['.pdf']}
              maxSize={FILE_UPLOAD_CONFIG.maxSize}
              errorMessage="Only PDF files are accepted"
              currentFile={uploadedFiles.letterhead}
              onUpload={(file) => setUploadedFile('letterhead', file)}
              onRemove={() => removeUploadedFile('letterhead')}
              required
            />
          )}
        </div>

        {/* QUESTION 3: Justification (moved from Q6) */}
        <div className={getQuestionClass(questionStatus.q3_justification.locked)}>
          {questionStatus.q3_justification.locked && <LockOverlay reason={questionStatus.q3_justification.reason} />}

          <Controller
            name="justification"
            control={control}
            render={({ field }) => (
              <Textarea
                label={<QuestionLabel section="2" question="3">Why do you need this supplier?</QuestionLabel>}
                name="justification"
                value={field.value}
                onChange={(e) => {
                  field.onChange(e);
                  handleFieldChange('justification', e.target.value);
                }}
                onBlur={field.onBlur}
                error={!isJustificationValid && justificationText.length > 0 ? 'Please provide more detail (minimum 10 characters)' : errors.justification?.message}
                required
                maxLength={350}
                showCharCount
                rows={5}
                placeholder="Explain why this supplier is needed and what service they will provide..."
                minCharWarning={10}
              />
            )}
          />
        </div>

        {/* QUESTION 4: Usage Frequency (moved from Q7) */}
        <div className={getQuestionClass(questionStatus.q4_usageFrequency.locked)}>
          {questionStatus.q4_usageFrequency.locked && <LockOverlay reason={questionStatus.q4_usageFrequency.reason} />}

          <Controller
            name="usageFrequency"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label={<QuestionLabel section="2" question="4">How often will you use this supplier?</QuestionLabel>}
                name="usageFrequency"
                options={[
                  {
                    value: 'one-off',
                    label: 'One-off',
                    tooltip: 'Select this if you only need to use this supplier once'
                  },
                  {
                    value: 'occasional',
                    label: 'Occasional',
                    tooltip: 'Select this if you plan to use this supplier a few times'
                  },
                  {
                    value: 'regular',
                    label: 'Regular',
                    tooltip: 'Select this if you plan to use this supplier regularly'
                  },
                ]}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  handleFieldChange('usageFrequency', value);
                }}
                error={errors.usageFrequency?.message}
                required
                horizontal
              />
            )}
          />

          {usageFrequency === 'one-off' && !questionStatus.q4_usageFrequency.locked && (
            <NoticeBox type="info">
              For one-off purchases, you may be able to use a purchase card instead of setting up a new supplier.
              Please check with your Procurement team.
            </NoticeBox>
          )}
        </div>

        {/* QUESTION 5: Service Category (Clinical/Non-clinical) */}
        <div className={getQuestionClass(questionStatus.q5_serviceCategory.locked)}>
          {questionStatus.q5_serviceCategory.locked && <LockOverlay reason={questionStatus.q5_serviceCategory.reason} />}

          <Controller
            name="serviceCategory"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label={<QuestionLabel section="2" question="5">Is this service Clinical or Non-clinical?</QuestionLabel>}
                name="serviceCategory"
                options={[
                  { value: 'clinical', label: 'Clinical' },
                  { value: 'non-clinical', label: 'Non-clinical' },
                ]}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  handleFieldChange('serviceCategory', value);
                }}
                error={errors.serviceCategory?.message}
                required
                horizontal
              />
            )}
          />
        </div>

        {/* QUESTION 6: Procurement Engagement */}
        <div className={getQuestionClass(questionStatus.q6_procurement.locked)}>
          {questionStatus.q6_procurement.locked && <LockOverlay reason={questionStatus.q6_procurement.reason} />}

          {/* Info box explaining the process */}
          {!questionStatus.q6_procurement.locked && (
            <div className="info-box" style={{ marginBottom: '16px' }}>
              <span>ℹ️</span>
              <span style={{ color: '#1e40af' }}>
                If you have not engaged with Procurement, you will need to complete a {serviceCategory === 'clinical' ? 'Clinical' : 'Non-Clinical'} questionnaire for PBP review.
              </span>
            </div>
          )}

          <Controller
            name="procurementEngaged"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label={<QuestionLabel section="2" question="6">Have you engaged with the Procurement team?</QuestionLabel>}
                name="procurementEngaged"
                options={[
                  { value: 'yes', label: 'Yes - I have procurement approval' },
                  { value: 'no', label: 'No - I need to complete the questionnaire' },
                ]}
                value={field.value}
                onChange={(value) => handleProcurementEngagedChange(value, field.onChange)}
                error={errors.procurementEngaged?.message}
                required
                horizontal
              />
            )}
          />

          {/* If Yes - show procurement approval upload */}
          {procurementEngaged === 'yes' && !questionStatus.q6_procurement.locked && (
            <FileUpload
              label="Upload Procurement Approval Document"
              name="procurementApproval"
              acceptedTypes={['application/pdf']}
              acceptedExtensions={['.pdf']}
              maxSize={FILE_UPLOAD_CONFIG.maxSize}
              errorMessage="Only PDF files are accepted"
              currentFile={uploadedFiles.procurementApproval}
              onUpload={(file) => setUploadedFile('procurementApproval', file)}
              onRemove={() => removeUploadedFile('procurementApproval')}
              required
            />
          )}

          {/* If No - show questionnaire status */}
          {procurementEngaged === 'no' && !questionStatus.q6_procurement.locked && (
            <>
              {isQuestionnaireComplete ? (
                <div className="success-badge" style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  border: '1px solid #22c55e',
                  borderRadius: '8px',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>✓</span>
                  <span style={{ fontWeight: '600' }}>
                    {serviceCategory === 'clinical' ? 'Clinical' : 'Non-Clinical'} Questionnaire Completed
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#15803d' }}>
                    Submitted for PBP review
                  </span>
                </div>
              ) : (
                <div style={{ marginTop: '16px' }}>
                  <Button
                    variant="primary"
                    onClick={handleOpenQuestionnaire}
                    style={{
                      backgroundColor: '#005EB8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>📋</span>
                    Complete {serviceCategory === 'clinical' ? 'Clinical' : 'Non-Clinical'} Questionnaire
                  </Button>
                  <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#6b7280' }}>
                    The questionnaire will be reviewed by a Procurement Business Partner (PBP).
                    You will receive an approval certificate to upload once reviewed.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* QUESTION 7: Pre-screening Acknowledgement */}
        <div className={getQuestionClass(questionStatus.q7_acknowledgement.locked)} style={{ marginTop: 'var(--space-32)', paddingTop: 'var(--space-24)', borderTop: '2px solid var(--color-border)' }}>
          {questionStatus.q7_acknowledgement.locked && <LockOverlay reason={questionStatus.q7_acknowledgement.reason} />}

          <Controller
            name="prescreeningAcknowledgement"
            control={control}
            render={({ field }) => (
              <Checkbox
                label={<QuestionLabel section="2" question="7">I confirm that all information provided is accurate and complete to the best of my knowledge</QuestionLabel>}
                name="prescreeningAcknowledgement"
                checked={field.value}
                onChange={(checked) => {
                  field.onChange(checked);
                  handleFieldChange('prescreeningAcknowledgement', checked);
                }}
                error={errors.prescreeningAcknowledgement?.message}
                required
              />
            )}
          />
        </div>

        {/* Navigation */}
        <FormNavigation
          onNext={handleSubmit(onSubmit)}
          onPrev={handlePrev}
        />
      </form>

      {/* Questionnaire Modal */}
      <QuestionnaireModal
        isOpen={isQuestionnaireModalOpen}
        onClose={() => handleCloseQuestionnaire(false)}
        onComplete={() => handleCloseQuestionnaire(true)}
        type={serviceCategory || 'clinical'}
        section2Data={{
          supplierConnection: supplierConnection,
          connectionDetails: formData.connectionDetails,
          letterheadAvailable: letterheadAvailable,
          justification: justification || formData.justification,
          usageFrequency: usageFrequency,
          serviceCategory: serviceCategory,
          procurementEngaged: procurementEngaged,
        }}
      />
    </section>
  );
};

export default Section2PreScreening;
