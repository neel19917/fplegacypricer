/**
 * ApprovalView Component
 * 
 * Read-only view of a quote for manager approval.
 * Requires authentication with @freightpop.com domain.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured, isEmailDomainAllowed } from '../supabaseConfig';
import LoginScreen from './LoginScreen';

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e5e7eb',
    padding: '20px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  cardHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  cardContent: {
    padding: '24px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  infoItem: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  infoValue: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#111827',
  },
  pricingTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  tableCell: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#111827',
    borderBottom: '1px solid #f3f4f6',
  },
  totalRow: {
    backgroundColor: '#f0fdf4',
    fontWeight: '600',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '500',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  button: {
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  },
  approveButton: {
    backgroundColor: '#10b981',
    color: '#fff',
    flex: 1,
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    flex: 1,
  },
  commentBox: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    minHeight: '100px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    flexDirection: 'column',
    gap: '16px',
    color: '#6b7280',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    flexDirection: 'column',
    gap: '16px',
    padding: '32px',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '64px',
  },
  errorTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
  },
  errorMessage: {
    fontSize: '16px',
    color: '#6b7280',
    maxWidth: '400px',
  },
  hubspotLink: {
    color: '#2563eb',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  successMessage: {
    padding: '20px',
    backgroundColor: '#d1fae5',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#065f46',
    marginBottom: '24px',
  },
};

// Status colors
const statusColors = {
  draft: { bg: '#f3f4f6', text: '#374151' },
  ready_review: { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#d1fae5', text: '#065f46' },
  rejected: { bg: '#fee2e2', text: '#dc2626' },
  sent: { bg: '#dbeafe', text: '#1e40af' },
};

export function ApprovalView({ linkId }) {
  const [user, setUser] = useState(null);
  const [quote, setQuote] = useState(null);
  const [linkSettings, setLinkSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Check authentication
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setError('System not configured');
      setIsLoading(false);
      return;
    }

    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && isEmailDomainAllowed(user.email)) {
        setUser(user);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && isEmailDomainAllowed(session.user.email)) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load quote data
  const loadQuote = useCallback(async () => {
    if (!linkId || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      // First, get the link settings
      const { data: linkData, error: linkError } = await supabase
        .from('quote_link_settings')
        .select('*')
        .eq('link_id', linkId)
        .single();

      if (linkError) {
        if (linkError.code === 'PGRST116') {
          throw new Error('This approval link is invalid or has been deleted.');
        }
        throw linkError;
      }

      // Check if link is expired
      if (new Date(linkData.expires_at) < new Date()) {
        throw new Error('This approval link has expired.');
      }

      setLinkSettings(linkData);

      // Get the quote
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', linkData.quote_id)
        .single();

      if (quoteError) throw quoteError;

      // Convert cents to dollars
      setQuote({
        ...quoteData,
        total_recurring_cost: (quoteData.total_recurring_cost || 0) / 100,
        total_onetime_cost: (quoteData.total_onetime_cost || 0) / 100,
        adjusted_recurring_cost: (quoteData.adjusted_recurring_cost || 0) / 100,
      });

      // Log access
      await supabase
        .from('quote_access_tokens')
        .insert({
          quote_id: linkData.quote_id,
          link_id: linkId,
          accessed_by: user.email,
          accessed_at: new Date().toISOString(),
        });

    } catch (err) {
      console.error('[Approval] ❌ Error loading quote:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [linkId, user]);

  // Load quote when user is authenticated
  useEffect(() => {
    if (user && linkId) {
      loadQuote();
    }
  }, [user, linkId, loadQuote]);

  // Handle approval/rejection
  const handleAction = async (action) => {
    if (!quote || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Update quote status
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          updated_at: new Date().toISOString(),
          pricing_adjustments: {
            ...quote.pricing_adjustments,
            approval_comment: comment,
            approved_by: user?.email,
            approved_at: new Date().toISOString(),
          },
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      setActionSuccess(action);
      
      // Refresh quote
      await loadQuote();
    } catch (err) {
      console.error('[Approval] ❌ Error updating quote:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If not authenticated, show login screen
  if (!user && !isLoading) {
    return (
      <LoginScreen
        onSuccess={(user) => setUser(user)}
        message="Please sign in with your @freightpop.com account to view this quote."
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={{ fontSize: '32px' }}>⏳</div>
          <div>Loading quote...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <div style={styles.errorIcon}>❌</div>
          <div style={styles.errorTitle}>Unable to Load Quote</div>
          <div style={styles.errorMessage}>{error}</div>
          <button
            style={{ ...styles.button, backgroundColor: '#2563eb', color: '#fff', marginTop: '16px' }}
            onClick={() => window.location.href = '/'}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Parse quote data for display
  const quoteData = quote?.quote_data || {};
  const products = Object.entries(quoteData.products || {}).filter(([_, p]) => p.enabled);
  const isAlreadyActioned = quote?.status === 'approved' || quote?.status === 'rejected';

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>FreightPOP Pricer</div>
        <div style={styles.headerRight}>
          <span style={styles.userInfo}>{user?.email}</span>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Success Message */}
        {actionSuccess && (
          <div style={styles.successMessage}>
            ✅ Quote has been {actionSuccess === 'approve' ? 'approved' : 'rejected'} successfully!
          </div>
        )}

        {/* Quote Info Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Quote Details</h2>
          </div>
          <div style={styles.cardContent}>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Quote Number</div>
                <div style={styles.infoValue}>{quote?.quote_number}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Company</div>
                <div style={styles.infoValue}>{quote?.customer_company}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Billing</div>
                <div style={styles.infoValue}>{quote?.billing_frequency}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Status</div>
                <div>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: statusColors[quote?.status]?.bg || '#f3f4f6',
                    color: statusColors[quote?.status]?.text || '#374151',
                  }}>
                    {quote?.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Prepared By</div>
                <div style={styles.infoValue}>{quote?.prepared_by}</div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>Created</div>
                <div style={styles.infoValue}>
                  {new Date(quote?.created_at).toLocaleDateString()}
                </div>
              </div>
              {quote?.hubspot_deal_url && (
                <div style={{ ...styles.infoItem, gridColumn: 'span 2' }}>
                  <div style={styles.infoLabel}>HubSpot Deal</div>
                  <div style={styles.infoValue}>
                    <a
                      href={quote.hubspot_deal_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.hubspotLink}
                    >
                      🔗 Open in HubSpot
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Pricing Summary</h2>
          </div>
          <div style={styles.cardContent}>
            {products.length > 0 ? (
              <table style={styles.pricingTable}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Product</th>
                    <th style={styles.tableHeader}>Details</th>
                    <th style={{ ...styles.tableHeader, textAlign: 'right' }}>Monthly Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(([productId, product]) => (
                    <tr key={productId}>
                      <td style={styles.tableCell}>{product.name || productId}</td>
                      <td style={styles.tableCell}>{product.tier || 'N/A'}</td>
                      <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                        ${(product.monthlyCost || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr style={styles.totalRow}>
                    <td style={styles.tableCell} colSpan={2}>
                      <strong>Total Recurring</strong>
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                      <strong>${quote?.total_recurring_cost?.toLocaleString()}/mo</strong>
                    </td>
                  </tr>
                  {quote?.total_onetime_cost > 0 && (
                    <tr>
                      <td style={styles.tableCell} colSpan={2}>
                        <strong>One-time Costs</strong>
                      </td>
                      <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                        <strong>${quote?.total_onetime_cost?.toLocaleString()}</strong>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                No products in this quote
              </div>
            )}
          </div>
        </div>

        {/* Approval Actions */}
        {!isAlreadyActioned && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Approval Decision</h2>
            </div>
            <div style={styles.cardContent}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  Comments (optional)
                </label>
                <textarea
                  style={styles.commentBox}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add any comments or feedback..."
                />
              </div>

              <div style={styles.actionButtons}>
                <button
                  style={{
                    ...styles.button,
                    ...styles.approveButton,
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                  onClick={() => handleAction('approve')}
                  disabled={isSubmitting}
                >
                  ✅ Approve Quote
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...styles.rejectButton,
                    opacity: isSubmitting ? 0.5 : 1,
                  }}
                  onClick={() => handleAction('reject')}
                  disabled={isSubmitting}
                >
                  ❌ Reject Quote
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Already actioned message */}
        {isAlreadyActioned && (
          <div style={{
            padding: '20px',
            backgroundColor: statusColors[quote?.status]?.bg || '#f3f4f6',
            borderRadius: '8px',
            textAlign: 'center',
            color: statusColors[quote?.status]?.text || '#374151',
          }}>
            This quote has already been <strong>{quote?.status}</strong>
            {quote?.pricing_adjustments?.approved_by && (
              <> by {quote.pricing_adjustments.approved_by}</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ApprovalView;

