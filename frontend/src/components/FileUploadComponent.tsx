import React, { useState } from 'react';
import api from '../api/client';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, X, Eye } from 'lucide-react';

interface FileUploadProps {
  label: string;
  documentType: string;
  required?: boolean;
  currentDocId?: string | null;
  currentDocStatus?: 'NOT_UPLOADED' | 'UPLOADED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string | null;
  onUploadSuccess: (docId: string, originalName: string) => void;
  onRemove?: () => void;
  acceptedFormatsText?: string;
}

export const FileUploadComponent: React.FC<FileUploadProps> = ({
  label,
  documentType,
  required = false,
  currentDocId,
  currentDocStatus,
  rejectionReason,
  onUploadSuccess,
  onRemove,
  acceptedFormatsText = 'Supported formats: PDF, JPG, JPEG, PNG (Max 10MB)',
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [uploadedDocId, setUploadedDocId] = useState<string | null>(currentDocId || null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds maximum allowed limit of 10 MB.');
      return;
    }

    // Validate file extension / mime-type
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimeTypes.includes(file.type)) {
      setError('Invalid file format. Please upload PDF, JPG, JPEG, or PNG document.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(20);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    try {
      setProgress(60);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.document) {
        setProgress(100);
        setUploadedDocId(res.data.document.docId);
        setUploadedFileName(res.data.document.originalName);
        onUploadSuccess(res.data.document.docId, res.data.document.originalName);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Document upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedDocId(null);
    setUploadedFileName('');
    setError('');
    if (onRemove) onRemove();
  };

  const isRejected = currentDocStatus === 'REJECTED';
  const isVerified = currentDocStatus === 'VERIFIED';
  const effectiveDocId = uploadedDocId || currentDocId;

  return (
    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </span>
        {effectiveDocId && (
          <span
            className={`badge ${
              isVerified ? 'badge-verified' : isRejected ? 'badge-danger' : 'badge-manual'
            }`}
            style={{ fontSize: '0.7rem' }}
          >
            {isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : 'UPLOADED / UNDER REVIEW'}
          </span>
        )}
      </label>

      {/* Rejection Alert Box */}
      {isRejected && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '0.75rem',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertCircle size={16} color="#dc2626" /> Document Rejected by Admin
          </div>
          <div style={{ marginTop: '0.2rem' }}>Reason: "{rejectionReason || 'Please upload a clearer copy'}"</div>
          <div style={{ marginTop: '0.35rem', fontWeight: 600, color: '#991b1b' }}>
            Please select and upload a new clear document below:
          </div>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          ⚠️ {error}
        </div>
      )}

      {effectiveDocId ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            backgroundColor: isRejected ? '#fff5f5' : '#f8fafc',
            border: `1.5px solid ${isRejected ? '#fca5a5' : '#cbd5e1'}`,
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
            <FileText size={20} color={isVerified ? '#16a34a' : 'var(--primary)'} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '220px' }}>
                {uploadedFileName || `${documentType} Attached`}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <CheckCircle size={12} /> Document Securely Attached
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <a
              href={`${typeof window !== 'undefined' && window.location.hostname ? `http://${window.location.hostname}:5000` : 'http://localhost:5000'}/api/v1/documents/view/${effectiveDocId}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px' }}
            >
              <Eye size={14} /> Preview
            </a>
            <button
              type="button"
              onClick={handleRemove}
              className="btn btn-danger btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px' }}
            >
              <X size={14} /> Replace
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
              backgroundColor: '#f8fafc',
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              cursor: uploading ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            {uploading ? (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <RefreshCw size={24} className="spin" color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>
                  Uploading & Validating Document... {progress}%
                </div>
              </div>
            ) : (
              <>
                <Upload size={24} color="var(--primary)" style={{ marginBottom: '0.35rem' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                  Click to Upload {label}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {acceptedFormatsText}
                </span>
              </>
            )}
          </label>
        </div>
      )}
    </div>
  );
};
