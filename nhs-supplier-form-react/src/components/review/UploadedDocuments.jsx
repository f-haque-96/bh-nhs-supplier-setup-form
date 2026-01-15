/**
 * Uploaded Documents Component
 * Displays all uploaded files from the entire form
 */

import React, { useState } from 'react';
import { Button } from '../common';
import useFormStore from '../../stores/formStore';

// File metadata mapping - which section/question each file belongs to
const FILE_METADATA = {
  procurementApproval: {
    label: 'Procurement Approval Document',
    section: 'Section 2: Pre-screening',
  },
  letterhead: {
    label: 'Letterhead with Bank Details',
    section: 'Section 2: Pre-screening',
  },
  cestForm: {
    label: 'CEST Form',
    section: 'Section 2: Pre-screening',
  },
  passportPhoto: {
    label: 'Passport Photo',
    section: 'Section 3: Supplier Classification',
  },
  drivingLicenceFront: {
    label: 'Driving Licence (Front)',
    section: 'Section 3: Supplier Classification',
  },
  drivingLicenceBack: {
    label: 'Driving Licence (Back)',
    section: 'Section 3: Supplier Classification',
  },
  opwContract: {
    label: 'OPW/IR35 Agreement',
    section: 'Section 7: Review & Submit',
  },
};

// Format file size to KB/MB
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Format upload date
const formatUploadDate = (isoString) => {
  if (!isoString) return 'Unknown';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const UploadedDocuments = () => {
  const { uploadedFiles, removeUploadedFile } = useFormStore();
  const [confirmDelete, setConfirmDelete] = useState(null);

  const uploadedFilesList = Object.entries(uploadedFiles);

  if (uploadedFilesList.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-24)',
          borderRadius: 'var(--radius-base)',
          border: '2px dashed var(--color-border)',
          marginBottom: 'var(--space-24)',
          backgroundColor: 'var(--color-background)',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          No documents uploaded yet.
        </p>
      </div>
    );
  }

  const handleDelete = (fieldName) => {
    if (confirmDelete === fieldName) {
      removeUploadedFile(fieldName);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(fieldName);
      // Auto-cancel after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handlePreview = (file) => {
    if (file.file) {
      // Create a blob URL for preview
      const url = URL.createObjectURL(file.file);
      window.open(url, '_blank');
    } else {
      alert('File preview not available. The file was uploaded in a previous session.');
    }
  };

  return (
    <div
      style={{
        padding: 'var(--space-24)',
        borderRadius: 'var(--radius-base)',
        border: '2px solid var(--color-border)',
        marginBottom: 'var(--space-24)',
        backgroundColor: 'var(--color-surface)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <h4 style={{ marginBottom: 'var(--space-16)', color: 'var(--nhs-blue)' }}>
        Uploaded Documents ({uploadedFilesList.length})
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        {uploadedFilesList.map(([fieldName, file]) => {
          const metadata = FILE_METADATA[fieldName] || {
            label: fieldName,
            section: 'Unknown',
          };

          return (
            <div
              key={fieldName}
              style={{
                padding: 'var(--space-16)',
                borderRadius: 'var(--radius-base)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-16)',
                transition: 'all var(--transition-base)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* File Icon */}
              <div
                style={{
                  fontSize: '32px',
                  minWidth: '40px',
                  textAlign: 'center',
                }}
              >
                📄
              </div>

              {/* File Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
                  {metadata.label}
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    marginTop: 'var(--space-4)',
                  }}
                >
                  {file.name} • {formatFileSize(file.size)}
                </div>
                <div
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    marginTop: 'var(--space-4)',
                  }}
                >
                  {metadata.section} • Uploaded: {formatUploadDate(file.uploadDate)}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
                {file.file && (
                  <Button variant="outline" size="sm" onClick={() => handlePreview(file)}>
                    Preview
                  </Button>
                )}
                <Button
                  variant={confirmDelete === fieldName ? 'danger' : 'outline'}
                  size="sm"
                  onClick={() => handleDelete(fieldName)}
                >
                  {confirmDelete === fieldName ? 'Confirm Delete?' : 'Remove'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 'var(--space-16)',
          paddingTop: 'var(--space-16)',
          borderTop: '1px solid var(--color-border)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <strong>Note:</strong> Files uploaded in previous sessions may not be available for preview
        but are still recorded in your submission.
      </div>
    </div>
  );
};

export default UploadedDocuments;
