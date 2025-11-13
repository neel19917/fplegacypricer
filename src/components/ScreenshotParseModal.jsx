import React, { useEffect, useState } from 'react';

const ScreenshotParseModal = ({
  isOpen,
  onClose,
  parsedData,
  isLoading,
  error,
  onApply,
  onRetry,
  onPaste,
}) => {
  const [isPasteAreaActive, setIsPasteAreaActive] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e) => {
      // Only handle paste if the modal is focused or if it's a global paste
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          e.stopPropagation();
          const blob = items[i].getAsFile();
          if (blob && onPaste) {
            // Create a File object from the blob
            const file = new File([blob], 'pasted-image.png', { type: blob.type || 'image/png' });
            onPaste(file);
          }
          break;
        }
      }
    };

    // Add paste event listener to document when modal is open
    // Use capture phase to catch paste events before they're handled elsewhere
    document.addEventListener('paste', handlePaste, true);
    
    return () => {
      document.removeEventListener('paste', handlePaste, true);
    };
  }, [isOpen, onPaste]);

  if (!isOpen) return null;

  const totalMargin = parsedData?.products?.reduce((sum, p) => sum + (p.margin || 0), 0) || 0;
  const totalCustomerPrice = parsedData?.products?.reduce((sum, p) => sum + (p.customerPrice || 0), 0) || 0;
  const totalOurCost = parsedData?.products?.reduce((sum, p) => sum + (p.ourCost || 0), 0) || 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '900px',
          maxHeight: '90vh',
          width: '90%',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            📷 Screenshot Analysis
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {!parsedData && !isLoading && !error && (
          <div
            style={{
              border: '2px dashed #3b82f6',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#eff6ff',
              marginBottom: '20px',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onClick={() => {
              // Trigger file input when clicking the paste area
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = e.target.files?.[0];
                if (file && onPaste) {
                  onPaste(file);
                }
              };
              input.click();
            }}
            onMouseEnter={() => setIsPasteAreaActive(true)}
            onMouseLeave={() => setIsPasteAreaActive(false)}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1e40af' }}>
              Paste Screenshot Here
            </div>
            <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '16px' }}>
              Press <kbd style={{ 
                padding: '4px 8px', 
                backgroundColor: '#dbeafe', 
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#1e40af',
                fontWeight: '600'
              }}>Ctrl+V</kbd> or <kbd style={{ 
                padding: '4px 8px', 
                backgroundColor: '#dbeafe', 
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#1e40af',
                fontWeight: '600'
              }}>Cmd+V</kbd> to paste an image
            </div>
            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '8px' }}>
              Or click here to choose a file
            </div>
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px', marginBottom: '16px' }}>Analyzing screenshot with Claude AI...</div>
            <div style={{ fontSize: '14px', color: '#666' }}>This may take a few seconds</div>
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ color: '#dc2626', fontWeight: '600', marginBottom: '8px' }}>
              Error
            </div>
            <div style={{ color: '#991b1b', marginBottom: '12px' }}>{error}</div>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  padding: '8px 16px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}

        {parsedData && parsedData.products && parsedData.products.length > 0 && !isLoading && !error && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                Found {parsedData.products.length} product(s) in screenshot
              </div>
              {parsedData.billingFrequency && (
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Billing Frequency: <strong>{parsedData.billingFrequency}</strong>
                </div>
              )}
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', borderBottom: '2px solid #475569' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#ffffff' }}>Product</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#ffffff' }}>SKU</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#ffffff' }}>Volume</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#ffffff' }}>Our Cost</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#ffffff' }}>Customer Price</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#ffffff' }}>Margin</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#ffffff' }}>Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.products.map((product, index) => {
                    const isNegativeMargin = product.margin < 0;
                    return (
                      <tr
                        key={index}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          backgroundColor: isNegativeMargin ? '#fee2e2' : 'white',
                        }}
                      >
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '500' }}>{product.productName}</div>
                          {product.error && (
                            <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                              {product.error}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                          {product.sku || 'N/A'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {product.volume.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          ${product.ourCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          ${product.customerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            textAlign: 'right',
                            color: isNegativeMargin ? '#dc2626' : '#059669',
                            fontWeight: '600',
                          }}
                        >
                          ${product.margin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td
                          style={{
                            padding: '12px',
                            textAlign: 'right',
                            color: isNegativeMargin ? '#dc2626' : '#059669',
                            fontWeight: '600',
                          }}
                        >
                          {product.marginPercent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#f9fafb', borderTop: '2px solid #e5e7eb', fontWeight: '600' }}>
                    <td style={{ padding: '12px' }} colSpan="3">
                      Total
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ${totalOurCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ${totalCustomerPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        color: totalMargin < 0 ? '#dc2626' : '#059669',
                      }}
                    >
                      ${totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        color: totalMargin < 0 ? '#dc2626' : '#059669',
                      }}
                    >
                      {totalOurCost > 0
                        ? ((totalMargin / totalOurCost) * 100).toFixed(1)
                        : '0.0'}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => onApply(parsedData)}
                style={{
                  padding: '10px 20px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Apply Changes
              </button>
            </div>
          </>
        )}

        {parsedData && (!parsedData.products || parsedData.products.length === 0) && !isLoading && !error && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '16px' }}>
              No products found in screenshot
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenshotParseModal;

