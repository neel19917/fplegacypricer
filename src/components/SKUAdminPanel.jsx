/**
 * SKUAdminPanel Component
 * 
 * Admin panel for Super Admins to manage pricing tiers.
 * Allows viewing, editing, creating, and deleting pricing tiers.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { usePricingAdmin, PRODUCT_TYPE_MAP } from '../hooks/useSupabasePricing';
import { isSuperAdmin } from '../utils/permissions';
import DeckAdminPanel from './DeckAdminPanel';

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
    width: '95%',
    maxWidth: '1200px',
    maxHeight: '90vh',
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
    backgroundColor: '#1e293b',
    color: '#fff',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: '4px',
    lineHeight: 1,
  },
  toolbar: {
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    minWidth: '200px',
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    flex: 1,
    minWidth: '200px',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
  },
  successButton: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '2px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle',
  },
  input: {
    padding: '6px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
  },
  editRow: {
    backgroundColor: '#fffbeb',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    padding: '6px',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    transition: 'all 0.2s',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280',
  },
  error: {
    padding: '16px 24px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    margin: '16px 24px',
    borderRadius: '8px',
  },
  success: {
    padding: '16px 24px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    margin: '16px 24px',
    borderRadius: '8px',
  },
  noAccess: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
    color: '#6b7280',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
};

// Product type options for dropdown
const productOptions = Object.entries(PRODUCT_TYPE_MAP).map(([key, value]) => ({
  value: key,
  label: value,
}));

export function SKUAdminPanel({ isOpen, onClose, userProfile, onPricingUpdate }) {
  const [tiers, setTiers] = useState([]);
  const [filteredTiers, setFilteredTiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [filterProduct, setFilterProduct] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTier, setNewTier] = useState({
    product_type: '',
    tier_name: '',
    start_range: 0,
    end_range: 0,
    monthly_priceforannualbilling: 0,
    monthly_priceformonthlybilling: 0,
  });
  const [successMessage, setSuccessMessage] = useState(null);
  const [adminTab, setAdminTab] = useState('pricing'); // 'pricing' | 'deck'

  const {
    getAllTiers,
    updateTier,
    createTier,
    deleteTier,
    isSaving,
    saveError,
  } = usePricingAdmin();

  // Check if user is Super Admin
  const hasAccess = isSuperAdmin(userProfile);

  // Load tiers
  const loadTiers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllTiers();
      setTiers(data);
      setFilteredTiers(data);
    } catch (err) {
      console.error('[SKU Admin] Error loading tiers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAllTiers]);

  // Load on open
  useEffect(() => {
    if (isOpen && hasAccess) {
      loadTiers();
    }
  }, [isOpen, hasAccess, loadTiers]);

  // Filter tiers
  useEffect(() => {
    let filtered = [...tiers];

    if (filterProduct !== 'all') {
      filtered = filtered.filter(t => t.product_type === filterProduct);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.tier_name?.toLowerCase().includes(term) ||
        t.product_type?.toLowerCase().includes(term)
      );
    }

    setFilteredTiers(filtered);
  }, [tiers, filterProduct, searchTerm]);

  // Handle edit
  const handleEdit = (tier) => {
    setEditingId(tier.id);
    setEditData({ ...tier });
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingId) return;

    const result = await updateTier(editingId, {
      tier_name: editData.tier_name,
      start_range: parseInt(editData.start_range) || 0,
      end_range: parseInt(editData.end_range) || 0,
      monthly_priceforannualbilling: parseFloat(editData.monthly_priceforannualbilling) || 0,
      monthly_priceformonthlybilling: parseFloat(editData.monthly_priceformonthlybilling) || 0,
    });

    if (result.success) {
      setEditingId(null);
      setEditData({});
      setSuccessMessage('Tier updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadTiers();
      if (onPricingUpdate) onPricingUpdate();
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  // Handle add new tier
  const handleAddTier = async () => {
    if (!newTier.product_type || !newTier.tier_name) {
      return;
    }

    const result = await createTier({
      productType: newTier.product_type,
      tierName: newTier.tier_name,
      startRange: parseInt(newTier.start_range) || 0,
      endRange: parseInt(newTier.end_range) || 0,
      annualBillingPrice: parseFloat(newTier.monthly_priceforannualbilling) || 0,
      monthlyBillingPrice: parseFloat(newTier.monthly_priceformonthlybilling) || 0,
    });

    if (result.success) {
      setShowAddForm(false);
      setNewTier({
        product_type: '',
        tier_name: '',
        start_range: 0,
        end_range: 0,
        monthly_priceforannualbilling: 0,
        monthly_priceformonthlybilling: 0,
      });
      setSuccessMessage('Tier created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadTiers();
      if (onPricingUpdate) onPricingUpdate();
    }
  };

  // Handle delete
  const handleDelete = async (tierId) => {
    if (!window.confirm('Are you sure you want to delete this pricing tier?')) {
      return;
    }

    const result = await deleteTier(tierId);
    if (result.success) {
      setSuccessMessage('Tier deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadTiers();
      if (onPricingUpdate) onPricingUpdate();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={adminTab === 'deck' ? { ...styles.modal, maxWidth: '1280px', width: '96%' } : styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            {adminTab === 'deck' ? '🎬 Sales Deck' : '⚙️ Pricing Administration'}
            <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#92400e' }}>
              Super Admin
            </span>
          </h2>
          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', marginRight: '16px' }}>
            {[['pricing', '⚙️ Pricing'], ['deck', '🎬 Sales Deck']].map(([k, l]) => (
              <button key={k} onClick={() => setAdminTab(k)} style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid ' + (adminTab === k ? '#3b82f6' : '#334155'), background: adminTab === k ? '#2563eb' : 'transparent', color: adminTab === k ? '#fff' : '#cbd5e1', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{l}</button>
            ))}
          </div>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {/* Sales Deck controls (Sales OS → deck-config-api) */}
        {adminTab === 'deck' && hasAccess && <DeckAdminPanel />}
        {adminTab === 'deck' && !hasAccess && (
          <div style={styles.noAccess}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
            <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Access Denied</div>
            <div style={{ fontSize: '14px' }}>Only Super Admin users can edit the sales deck.</div>
          </div>
        )}

        {/* Check access */}
        {adminTab === 'deck' ? null : !hasAccess ? (
          <div style={styles.noAccess}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔒</div>
            <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Access Denied
            </div>
            <div style={{ fontSize: '14px' }}>
              Only Super Admin users can access pricing administration.
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={styles.toolbar}>
              <select
                style={styles.filterSelect}
                value={filterProduct}
                onChange={e => setFilterProduct(e.target.value)}
              >
                <option value="all">All Products</option>
                {productOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <input
                type="text"
                style={styles.searchInput}
                placeholder="Search tiers..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />

              <button
                style={{ ...styles.button, ...styles.successButton }}
                onClick={() => setShowAddForm(!showAddForm)}
              >
                ➕ Add Tier
              </button>

              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={loadTiers}
              >
                🔄 Refresh
              </button>
            </div>

            {/* Messages */}
            {saveError && (
              <div style={styles.error}>❌ {saveError}</div>
            )}
            {successMessage && (
              <div style={styles.success}>✅ {successMessage}</div>
            )}

            {/* Add Form */}
            {showAddForm && (
              <div style={{
                padding: '16px 24px',
                backgroundColor: '#f0fdf4',
                borderBottom: '1px solid #86efac',
              }}>
                <div style={{ fontWeight: '600', marginBottom: '12px' }}>Add New Pricing Tier</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151' }}>Product</label>
                    <select
                      style={{ ...styles.filterSelect, width: '160px' }}
                      value={newTier.product_type}
                      onChange={e => setNewTier({ ...newTier, product_type: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {productOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151' }}>Tier Name</label>
                    <input
                      type="text"
                      style={{ ...styles.input, width: '140px' }}
                      value={newTier.tier_name}
                      onChange={e => setNewTier({ ...newTier, tier_name: e.target.value })}
                      placeholder="e.g., Starter"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151' }}>Range Start</label>
                    <input
                      type="number"
                      style={{ ...styles.input, width: '80px' }}
                      value={newTier.start_range}
                      onChange={e => setNewTier({ ...newTier, start_range: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151' }}>Range End</label>
                    <input
                      type="number"
                      style={{ ...styles.input, width: '80px' }}
                      value={newTier.end_range}
                      onChange={e => setNewTier({ ...newTier, end_range: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151' }}>Annual Price</label>
                    <input
                      type="number"
                      style={{ ...styles.input, width: '100px' }}
                      value={newTier.monthly_priceforannualbilling}
                      onChange={e => setNewTier({ ...newTier, monthly_priceforannualbilling: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#374151' }}>Monthly Price</label>
                    <input
                      type="number"
                      style={{ ...styles.input, width: '100px' }}
                      value={newTier.monthly_priceformonthlybilling}
                      onChange={e => setNewTier({ ...newTier, monthly_priceformonthlybilling: e.target.value })}
                    />
                  </div>
                  <button
                    style={{ ...styles.button, ...styles.primaryButton }}
                    onClick={handleAddTier}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Add'}
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.secondaryButton }}
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            <div style={styles.content}>
              {isLoading ? (
                <div style={styles.loading}>Loading pricing tiers...</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Tier</th>
                      <th style={styles.th}>Range</th>
                      <th style={styles.th}>Annual Price</th>
                      <th style={styles.th}>Monthly Price</th>
                      <th style={{ ...styles.th, width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTiers.map(tier => (
                      <tr
                        key={tier.id}
                        style={editingId === tier.id ? styles.editRow : {}}
                      >
                        <td style={styles.td}>
                          <span style={styles.badge}>
                            {PRODUCT_TYPE_MAP[tier.product_type] || tier.product_type}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {editingId === tier.id ? (
                            <input
                              type="text"
                              style={styles.input}
                              value={editData.tier_name || ''}
                              onChange={e => setEditData({ ...editData, tier_name: e.target.value })}
                            />
                          ) : (
                            tier.tier_name
                          )}
                        </td>
                        <td style={styles.td}>
                          {editingId === tier.id ? (
                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                              <input
                                type="number"
                                style={{ ...styles.input, width: '60px' }}
                                value={editData.start_range || 0}
                                onChange={e => setEditData({ ...editData, start_range: e.target.value })}
                              />
                              <span>-</span>
                              <input
                                type="number"
                                style={{ ...styles.input, width: '60px' }}
                                value={editData.end_range || 0}
                                onChange={e => setEditData({ ...editData, end_range: e.target.value })}
                              />
                            </div>
                          ) : (
                            `${tier.start_range} - ${tier.end_range}`
                          )}
                        </td>
                        <td style={styles.td}>
                          {editingId === tier.id ? (
                            <input
                              type="number"
                              style={{ ...styles.input, width: '100px' }}
                              value={editData.monthly_priceforannualbilling || 0}
                              onChange={e => setEditData({ ...editData, monthly_priceforannualbilling: e.target.value })}
                            />
                          ) : (
                            `$${tier.monthly_priceforannualbilling?.toLocaleString()}`
                          )}
                        </td>
                        <td style={styles.td}>
                          {editingId === tier.id ? (
                            <input
                              type="number"
                              style={{ ...styles.input, width: '100px' }}
                              value={editData.monthly_priceformonthlybilling || 0}
                              onChange={e => setEditData({ ...editData, monthly_priceformonthlybilling: e.target.value })}
                            />
                          ) : (
                            `$${tier.monthly_priceformonthlybilling?.toLocaleString()}`
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            {editingId === tier.id ? (
                              <>
                                <button
                                  style={{ ...styles.iconButton, color: '#10b981' }}
                                  onClick={handleSaveEdit}
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  style={{ ...styles.iconButton, color: '#6b7280' }}
                                  onClick={handleCancelEdit}
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  style={{ ...styles.iconButton, color: '#2563eb' }}
                                  onClick={() => handleEdit(tier)}
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  style={{ ...styles.iconButton, color: '#dc2626' }}
                                  onClick={() => handleDelete(tier.id)}
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div style={styles.footer}>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                Showing {filteredTiers.length} of {tiers.length} tiers
              </div>
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SKUAdminPanel;

