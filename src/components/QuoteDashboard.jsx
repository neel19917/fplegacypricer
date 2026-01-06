/**
 * QuoteDashboard Component
 * 
 * Manages saving and loading quotes for companies.
 * Requires company name and HubSpot deal URL for saving.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useQuotes, isValidHubSpotUrl } from '../hooks/useQuotes';
import { canDeleteQuote } from '../utils/permissions';

// Styles
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
    maxWidth: '900px',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
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
    fontSize: '20px',
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
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  required: {
    color: '#dc2626',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    fontSize: '12px',
    color: '#dc2626',
    marginTop: '4px',
  },
  button: {
    padding: '10px 20px',
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
  dangerButton: {
    backgroundColor: '#dc2626',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  searchBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
  },
  quoteList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  quoteCard: {
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    transition: 'box-shadow 0.2s',
  },
  quoteInfo: {
    flex: 1,
  },
  quoteCompany: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 4px 0',
  },
  quoteNumber: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  quoteMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#4b5563',
  },
  hubspotLink: {
    color: '#2563eb',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  quoteActions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  },
  loadButton: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6b7280',
  },
  loading: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6b7280',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
};

// Status badge colors
const statusColors = {
  draft: { bg: '#f3f4f6', text: '#374151' },
  ready_review: { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#d1fae5', text: '#065f46' },
  sent: { bg: '#dbeafe', text: '#1e40af' },
  completed: { bg: '#d1fae5', text: '#065f46' },
};

export function QuoteDashboard({ 
  isOpen, 
  onClose, 
  onLoadQuote, 
  currentPricingData,
  currentUser,
  userProfile,
  companyName: initialCompanyName = '',
  billingFrequency = 'annual',
  totalRecurringCost = 0,
  totalOnetimeCost = 0,
}) {
  const [activeTab, setActiveTab] = useState('save');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    companyName: initialCompanyName,
    hubspotDealUrl: '',
    customerName: '',
    customerEmail: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const {
    quotes,
    isLoading,
    isSaving,
    error,
    fetchQuotes,
    saveQuote,
    deleteQuote,
  } = useQuotes();

  // Update form when initialCompanyName changes
  useEffect(() => {
    if (initialCompanyName) {
      setFormData(prev => ({ ...prev, companyName: initialCompanyName }));
    }
  }, [initialCompanyName]);

  // Fetch quotes when opening the load tab
  useEffect(() => {
    if (isOpen && activeTab === 'load') {
      fetchQuotes();
    }
  }, [isOpen, activeTab, fetchQuotes]);

  // Filter quotes by search term
  const filteredQuotes = quotes.filter(quote => 
    quote.customer_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Validate form
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }
    
    if (!formData.hubspotDealUrl.trim()) {
      errors.hubspotDealUrl = 'HubSpot deal URL is required';
    } else if (!isValidHubSpotUrl(formData.hubspotDealUrl)) {
      errors.hubspotDealUrl = 'Please enter a valid HubSpot URL';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    setSaveSuccess(false);
    
    const result = await saveQuote({
      companyName: formData.companyName,
      hubspotDealUrl: formData.hubspotDealUrl,
      customerName: formData.customerName || formData.companyName,
      customerEmail: formData.customerEmail,
      pricingData: currentPricingData,
      totalRecurringCost,
      totalOnetimeCost,
      billingFrequency,
      preparedBy: currentUser?.email || 'Unknown',
    });

    if (result.success) {
      setSaveSuccess(true);
      setFormData({ companyName: '', hubspotDealUrl: '', customerName: '', customerEmail: '' });
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Handle load
  const handleLoad = (quote) => {
    if (onLoadQuote) {
      onLoadQuote({
        companyName: quote.customer_company,
        hubspotDealUrl: quote.hubspot_deal_url,
        pricingData: quote.quote_data,
        billingFrequency: quote.billing_frequency,
        quoteNumber: quote.quote_number,
      });
    }
    onClose();
  };

  // Handle delete
  const handleDelete = async (quoteId) => {
    const result = await deleteQuote(quoteId);
    if (result.success) {
      setDeleteConfirm(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Quote Dashboard</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'save' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('save')}
          >
            💾 Save Quote
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'load' ? styles.activeTab : {}) }}
            onClick={() => setActiveTab('load')}
          >
            📂 Load Quote
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'save' ? (
            <div style={styles.form}>
              {saveSuccess && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#d1fae5',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  color: '#065f46',
                  marginBottom: '8px',
                }}>
                  ✅ Quote saved successfully!
                </div>
              )}

              {error && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #dc2626',
                  borderRadius: '6px',
                  color: '#dc2626',
                  marginBottom: '8px',
                }}>
                  ❌ {error}
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Company Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  style={{
                    ...styles.input,
                    ...(formErrors.companyName ? styles.inputError : {}),
                  }}
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Enter company name"
                />
                {formErrors.companyName && (
                  <span style={styles.errorText}>{formErrors.companyName}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  HubSpot Deal URL <span style={styles.required}>*</span>
                </label>
                <input
                  type="url"
                  style={{
                    ...styles.input,
                    ...(formErrors.hubspotDealUrl ? styles.inputError : {}),
                  }}
                  value={formData.hubspotDealUrl}
                  onChange={e => setFormData({ ...formData, hubspotDealUrl: e.target.value })}
                  placeholder="https://app.hubspot.com/contacts/xxx/deal/123"
                />
                {formErrors.hubspotDealUrl && (
                  <span style={styles.errorText}>{formErrors.hubspotDealUrl}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Contact Name</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.customerName}
                  onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Contact Email</label>
                <input
                  type="email"
                  style={styles.input}
                  value={formData.customerEmail}
                  onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              {/* Summary */}
              <div style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                marginTop: '8px',
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Quote Summary
                </div>
                <div style={{ fontSize: '13px', color: '#4b5563' }}>
                  <div>Billing: {billingFrequency === 'annual' ? 'Annual' : 'Monthly'}</div>
                  <div>Recurring: ${totalRecurringCost.toLocaleString()}/month</div>
                  <div>One-time: ${totalOnetimeCost.toLocaleString()}</div>
                </div>
              </div>

              <div style={styles.buttonRow}>
                <button
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    ...(isSaving ? styles.disabledButton : {}),
                  }}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : '💾 Save Quote'}
                </button>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Search */}
              <div style={styles.searchBar}>
                <input
                  type="text"
                  style={styles.searchInput}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search by company name or quote number..."
                />
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={() => fetchQuotes()}
                >
                  🔄 Refresh
                </button>
              </div>

              {/* Quote List */}
              {isLoading ? (
                <div style={styles.loading}>Loading quotes...</div>
              ) : filteredQuotes.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    No quotes found
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    {searchTerm ? 'Try a different search term' : 'Save a quote to get started'}
                  </div>
                </div>
              ) : (
                <div style={styles.quoteList}>
                  {filteredQuotes.map(quote => (
                    <div key={quote.id} style={styles.quoteCard}>
                      <div style={styles.quoteInfo}>
                        <h3 style={styles.quoteCompany}>{quote.customer_company}</h3>
                        <div style={styles.quoteNumber}>{quote.quote_number}</div>
                        <div style={styles.quoteMeta}>
                          <span>
                            💰 ${((quote.total_recurring_cost || 0) / 100).toLocaleString()}/mo
                          </span>
                          <span>
                            📅 {new Date(quote.created_at).toLocaleDateString()}
                          </span>
                          {quote.hubspot_deal_url && (
                            <a
                              href={quote.hubspot_deal_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={styles.hubspotLink}
                              onClick={e => e.stopPropagation()}
                            >
                              🔗 HubSpot Deal
                            </a>
                          )}
                          <span
                            style={{
                              ...styles.statusBadge,
                              backgroundColor: statusColors[quote.status]?.bg || '#f3f4f6',
                              color: statusColors[quote.status]?.text || '#374151',
                            }}
                          >
                            {quote.status}
                          </span>
                        </div>
                      </div>
                      <div style={styles.quoteActions}>
                        <button
                          style={{ ...styles.actionButton, ...styles.loadButton }}
                          onClick={() => handleLoad(quote)}
                        >
                          📂 Load
                        </button>
                        {canDeleteQuote(userProfile, quote) && (
                          deleteConfirm === quote.id ? (
                            <>
                              <button
                                style={{ ...styles.actionButton, ...styles.deleteButton }}
                                onClick={() => handleDelete(quote.id)}
                              >
                                Confirm
                              </button>
                              <button
                                style={{ ...styles.actionButton, ...styles.secondaryButton }}
                                onClick={() => setDeleteConfirm(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              style={{ ...styles.actionButton, ...styles.deleteButton }}
                              onClick={() => setDeleteConfirm(quote.id)}
                            >
                              🗑️
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuoteDashboard;

