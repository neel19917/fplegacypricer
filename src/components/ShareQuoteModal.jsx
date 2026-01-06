/**
 * ShareQuoteModal Component
 * 
 * Generates shareable links for manager approval.
 * Links require authentication (@freightpop.com) to view.
 */

import React, { useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseConfig';

// Generate a short unique link ID
function generateLinkId() {
  return Math.random().toString(36).substring(2, 10);
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    lineHeight: 1,
  },
  content: {
    padding: '24px',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px',
    lineHeight: 1.5,
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  linkContainer: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #86efac',
  },
  linkLabel: {
    fontSize: '12px',
    color: '#166534',
    fontWeight: '500',
    marginBottom: '8px',
  },
  linkInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #86efac',
    borderRadius: '6px',
    fontSize: '13px',
    backgroundColor: '#fff',
    color: '#166534',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  button: {
    flex: 1,
    padding: '12px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  },
  successButton: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  copySuccess: {
    textAlign: 'center',
    color: '#059669',
    fontSize: '13px',
    marginTop: '8px',
  },
  warning: {
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    color: '#92400e',
    fontSize: '13px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    border: '1px solid #dc2626',
    borderRadius: '6px',
    color: '#dc2626',
    fontSize: '13px',
    marginBottom: '16px',
  },
};

export function ShareQuoteModal({
  isOpen,
  onClose,
  quoteId,
  quoteNumber,
  companyName,
  currentUser,
}) {
  const [linkName, setLinkName] = useState('Manager Approval Link');
  const [expiryDays, setExpiryDays] = useState('30');
  const [generatedLink, setGeneratedLink] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState(null);

  // Generate the approval link
  const generateLink = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) {
      setError('Supabase not configured');
      return;
    }

    if (!quoteId) {
      setError('Please save the quote first before sharing');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const linkId = generateLinkId();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays));

      // Create link settings entry
      const { error: insertError } = await supabase
        .from('quote_link_settings')
        .insert({
          quote_id: quoteId,
          quote_number: quoteNumber,
          link_id: linkId,
          name: linkName,
          expires_at: expiresAt.toISOString(),
          is_password_protected: false,
          requires_auth: true, // Requires @freightpop.com authentication
          tracking_enabled: true,
          allow_download: true,
          created_by: currentUser?.email || 'Unknown',
        });

      if (insertError) throw insertError;

      // Generate the shareable URL
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/approve/${linkId}`;
      
      setGeneratedLink(shareUrl);
      console.log('[Share] ✅ Generated approval link:', linkId);
    } catch (err) {
      console.error('[Share] ❌ Error generating link:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [quoteId, quoteNumber, linkName, expiryDays, currentUser]);

  // Copy link to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('[Share] ❌ Copy failed:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = generatedLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [generatedLink]);

  // Reset state when modal closes
  const handleClose = () => {
    setGeneratedLink(null);
    setError(null);
    setCopySuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🔗 Share for Approval</h2>
          <button style={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {!quoteId && (
            <div style={styles.warning}>
              ⚠️ Please save the quote first before generating an approval link.
            </div>
          )}

          <p style={styles.description}>
            Generate a shareable link for manager approval. Recipients must be logged in 
            with a @freightpop.com account to view the quote.
          </p>

          {error && (
            <div style={styles.error}>❌ {error}</div>
          )}

          {/* Quote info */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
          }}>
            <div><strong>Quote:</strong> {quoteNumber || 'Not saved'}</div>
            <div><strong>Company:</strong> {companyName || 'N/A'}</div>
          </div>

          {!generatedLink ? (
            <>
              {/* Link name */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Link Name</label>
                <input
                  type="text"
                  style={styles.input}
                  value={linkName}
                  onChange={e => setLinkName(e.target.value)}
                  placeholder="e.g., Manager Approval Link"
                />
              </div>

              {/* Expiry */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Link Expires In</label>
                <select
                  style={styles.select}
                  value={expiryDays}
                  onChange={e => setExpiryDays(e.target.value)}
                >
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>

              {/* Buttons */}
              <div style={styles.buttonRow}>
                <button
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    ...(isGenerating || !quoteId ? styles.disabledButton : {}),
                  }}
                  onClick={generateLink}
                  disabled={isGenerating || !quoteId}
                >
                  {isGenerating ? 'Generating...' : '🔗 Generate Link'}
                </button>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={handleClose}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Generated link */}
              <div style={styles.linkContainer}>
                <div style={styles.linkLabel}>✅ Approval Link Generated</div>
                <input
                  type="text"
                  style={styles.linkInput}
                  value={generatedLink}
                  readOnly
                  onClick={e => e.target.select()}
                />
                {copySuccess && (
                  <div style={styles.copySuccess}>✓ Copied to clipboard!</div>
                )}
              </div>

              {/* Copy button */}
              <div style={styles.buttonRow}>
                <button
                  style={{
                    ...styles.button,
                    ...(copySuccess ? styles.successButton : styles.primaryButton),
                  }}
                  onClick={copyToClipboard}
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy Link'}
                </button>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={handleClose}
                >
                  Done
                </button>
              </div>

              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '16px',
                textAlign: 'center',
              }}>
                🔒 Only @freightpop.com users can view this link
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShareQuoteModal;

