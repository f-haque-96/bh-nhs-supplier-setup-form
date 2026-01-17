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
      soleTraderStatus: formData.soleTraderStatus || '',
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
  const soleTraderStatus = watch('soleTraderStatus');
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
  // Q2.1 Supplier Connection is now FIRST and always unlocked
  const isBlockedByLetterhead = letterheadAvailable === 'no';

  // Check if connection details are required but not filled
  const connectionDetailsRequired = supplierConnection === 'yes';
  const connectionDetailsMissing = connectionDetailsRequired && (!formData.connectionDetails || formData.connectionDetails.trim() === '');

  // Check if blocked by procurement - if "No" is selected, block all subsequent questions
  const isBlockedByProcurement = procurementEngaged === 'no';

  const questionStatus = {
    q1_supplierConnection: {
      locked: false,
      reason: ''
    },
    q2_letterhead: {
      locked: !supplierConnection || connectionDetailsMissing,
      reason: connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : 'Please answer the supplier connection question first'
    },
    q3_serviceCategory: {
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
    q4_procurement: {
      locked: !supplierConnection ||
              connectionDetailsMissing ||
              isBlockedByLetterhead ||
              !letterheadAvailable ||
              (letterheadAvailable === 'yes' && !uploadedFiles.letterhead) ||
              !serviceCategory,
      reason: !supplierConnection
        ? 'Please answer the supplier connection question first'
        : connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : isBlockedByLetterhead
        ? 'You must select "Yes" and upload a letterhead to proceed'
        : letterheadAvailable === 'yes' && !uploadedFiles.letterhead
        ? 'Please upload the letterhead document'
        : !serviceCategory
        ? 'Please select the service category first'
        : 'Answer the letterhead question first'
    },
    q5_soleTrader: {
      locked: !supplierConnection ||
              connectionDetailsMissing ||
              isBlockedByLetterhead ||
              isBlockedByProcurement ||
              !procurementEngaged ||
              (procurementEngaged === 'yes' && !uploadedFiles.procurementApproval),
      reason: !supplierConnection
        ? 'Please answer the supplier connection question first'
        : connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : isBlockedByLetterhead
        ? 'You must select "Yes" and upload a letterhead to proceed'
        : isBlockedByProcurement
        ? 'You must engage with Procurement before proceeding. Please select "Yes" and upload the approval document.'
        : procurementEngaged === 'yes' && !uploadedFiles.procurementApproval
        ? 'Please upload the procurement approval document'
        : 'Answer the procurement question first'
    },
    q6_justification: {
      locked: !supplierConnection ||
              connectionDetailsMissing ||
              isBlockedByLetterhead ||
              isBlockedByProcurement ||
              !soleTraderStatus ||
              (soleTraderStatus === 'yes' && !uploadedFiles.cestForm),
      reason: !supplierConnection
        ? 'Please answer the supplier connection question first'
        : connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : isBlockedByLetterhead
        ? 'You must select "Yes" and upload a letterhead to proceed'
        : isBlockedByProcurement
        ? 'You must engage with Procurement before proceeding. Please select "Yes" and upload the approval document.'
        : soleTraderStatus === 'yes' && !uploadedFiles.cestForm
        ? 'Please upload CEST form'
        : 'Answer the sole trader question first'
    },
    q7_usageFrequency: {
      locked: !supplierConnection ||
              connectionDetailsMissing ||
              isBlockedByLetterhead ||
              isBlockedByProcurement ||
              !formData.justification || formData.justification.trim() === '',
      reason: !supplierConnection
        ? 'Please answer the supplier connection question first'
        : connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : isBlockedByLetterhead
        ? 'You must select "Yes" and upload a letterhead to proceed'
        : isBlockedByProcurement
        ? 'You must engage with Procurement before proceeding. Please select "Yes" and upload the approval document.'
        : 'Please provide justification first'
    },
    q8_acknowledgement: {
      locked: !supplierConnection || connectionDetailsMissing || isBlockedByLetterhead || isBlockedByProcurement || !usageFrequency,
      reason: !supplierConnection
        ? 'Please answer the supplier connection question first'
        : connectionDetailsMissing
        ? 'Please describe your connection to this supplier first'
        : isBlockedByLetterhead
        ? 'You must select "Yes" and upload a letterhead to proceed'
        : isBlockedByProcurement
        ? 'You must engage with Procurement before proceeding. Please select "Yes" and upload the approval document.'
        : 'Please select usage frequency first'
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

    // Block submission if procurement engagement is 'no'
    if (data.procurementEngaged === 'no') {
      alert('You must engage with the Procurement team before proceeding. Please select "Yes" and upload the procurement approval document.');
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
    if (data.soleTraderStatus === 'yes') {
      if (!uploadedFiles.cestForm) requiredFiles.push('CEST Form');
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
    setIsQuestionnaireModalOpen(true);
  };

  const handleCloseQuestionnaire = () => {
    setIsQuestionnaireModalOpen(false);
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

        {/* QUESTION 3: Service Category */}
        <div className={getQuestionClass(questionStatus.q3_serviceCategory.locked)}>
          {questionStatus.q3_serviceCategory.locked && <LockOverlay reason={questionStatus.q3_serviceCategory.reason} />}

          <Controller
            name="serviceCategory"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label={<QuestionLabel section="2" question="3">Is this service Clinical or Non-clinical?</QuestionLabel>}
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

        {/* QUESTION 4: Procurement Engagement (was Q2.2) */}
        <div className={getQuestionClass(questionStatus.q4_procurement.locked)}>
          {questionStatus.q4_procurement.locked && <LockOverlay reason={questionStatus.q4_procurement.reason} />}

          <Controller
            name="procurementEngaged"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label={<QuestionLabel section="2" question="4">Have you engaged with the Procurement team?</QuestionLabel>}
                name="procurementEngaged"
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ]}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  handleFieldChange('procurementEngaged', value);
                }}
                error={errors.procurementEngaged?.message}
                required
                horizontal
              />
            )}
          />

          {procurementEngaged === 'no' && !questionStatus.q4_procurement.locked && (
            <>
              {prescreeningProgress.questionnaireSubmitted ? (
                <div className="questionnaire-submitted-notice">
                  <div className="notice-icon">✓</div>
                  <div className="notice-content">
                    <h4>Questionnaire Submitted Successfully</h4>
                    <p>
                      Please check your email for a response from a Procurement Business Partner.
                      This typically takes 3-5 business days.
                    </p>
                    <p className="notice-ref">
                      Reference: {prescreeningProgress.questionnaireId}
                    </p>
                  </div>
                </div>
              ) : (
                <NoticeBox type="info">
                  <strong>Procurement Questionnaire Required</strong>
                  <p>You need to complete a questionnaire to proceed. Click the button below to get started.</p>
                  <Button variant="primary" onClick={handleOpenQuestionnaire} style={{ marginTop: 'var(--space-12)' }}>
                    Complete {serviceCategory === 'clinical' ? 'Clinical' : 'Non-Clinical'} Questionnaire
                  </Button>
                </NoticeBox>
              )}
            </>
          )}

          {procurementEngaged === 'yes' && !questionStatus.q4_procurement.locked && (
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
        </div>

        {/* QUESTION 5: Sole Trader Status (was Q2.4) */}
        <div className={getQuestionClass(questionStatus.q5_soleTrader.locked)}>
          {questionStatus.q5_soleTrader.locked && <LockOverlay reason={questionStatus.q5_soleTrader.reason} />}

          <Controller
            name="soleTraderStatus"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label={<QuestionLabel section="2" question="5" tooltip="A sole trader is an individual who runs their own business as a self-employed person. If the supplier operates as a limited company, charity, or other entity type, select 'No'.">Is this supplier a Sole Trader?</QuestionLabel>}
                name="soleTraderStatus"
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ]}
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  handleFieldChange('soleTraderStatus', value);
                }}
                error={errors.soleTraderStatus?.message}
                required
                horizontal
              />
            )}
          />

          {soleTraderStatus === 'yes' && !questionStatus.q5_soleTrader.locked && (
            <>
              <NoticeBox type="info">
                <strong>Sole Trader Requirements:</strong> For sole traders, we require a completed CEST form to determine IR35 status.
              </NoticeBox>

              <FileUpload
                label="Upload CEST Form"
                name="cestForm"
                acceptedTypes={['application/pdf']}
                acceptedExtensions={['.pdf']}
                maxSize={FILE_UPLOAD_CONFIG.maxSize}
                errorMessage="Only PDF files are accepted"
                currentFile={uploadedFiles.cestForm}
                onUpload={(file) => setUploadedFile('cestForm', file)}
                onRemove={() => removeUploadedFile('cestForm')}
                required
              />
            </>
          )}
        </div>

        {/* QUESTION 6: Justification (was Q2.5) */}
        <div className={getQuestionClass(questionStatus.q6_justification.locked)}>
          {questionStatus.q6_justification.locked && <LockOverlay reason={questionStatus.q6_justification.reason} />}

          <Controller
            name="justification"
            control={control}
            render={({ field }) => (
              <Textarea
                label={<QuestionLabel section="2" question="6">Please provide justification for this supplier setup</QuestionLabel>}
                name="justification"
                value={field.value}
                onChange={(e) => {
                  field.onChange(e);
                  handleFieldChange('justification', e.target.value);
                }}
                onBlur={field.onBlur}
                error={errors.justification?.message}
                required
                maxLength={350}
                showCharCount
                rows={5}
                placeholder="Explain why this supplier is needed and what service they will provide..."
              />
            )}
          />
        </div>

        {/* QUESTION 7: Usage Frequency (was Q2.6) */}
        <div className={getQuestionClass(questionStatus.q7_usageFrequency.locked)}>
          {questionStatus.q7_usageFrequency.locked && <LockOverlay reason={questionStatus.q7_usageFrequency.reason} />}

          <Controller
            name="usageFrequency"
            control={control}
            render={({ field }) => (
              <RadioGroup
                label={<QuestionLabel section="2" question="7">How frequently will this supplier be used?</QuestionLabel>}
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
                    value: 'frequent',
                    label: 'Frequent',
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

          {usageFrequency === 'one-off' && !questionStatus.q7_usageFrequency.locked && (
            <NoticeBox type="info">
              For one-off purchases, you may be able to use a purchase card instead of setting up a new supplier.
              Please check with your Procurement team.
            </NoticeBox>
          )}
        </div>

        {/* QUESTION 8: Pre-screening Acknowledgement */}
        <div className={getQuestionClass(questionStatus.q8_acknowledgement.locked)} style={{ marginTop: 'var(--space-32)', paddingTop: 'var(--space-24)', borderTop: '2px solid var(--color-border)' }}>
          {questionStatus.q8_acknowledgement.locked && <LockOverlay reason={questionStatus.q8_acknowledgement.reason} />}

          <Controller
            name="prescreeningAcknowledgement"
            control={control}
            render={({ field }) => (
              <Checkbox
                label={<QuestionLabel section="2" question="8">I confirm that all information provided is accurate and complete to the best of my knowledge</QuestionLabel>}
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
        onClose={handleCloseQuestionnaire}
        type={serviceCategory || 'clinical'}
      />
    </section>
  );
};

export default Section2PreScreening;
