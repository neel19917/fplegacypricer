import React from 'react';

/**
 * ProductCheckbox Component
 * 
 * A reusable checkbox component for AI Agent product selection
 * with smart disabled state and volume display
 * 
 * @param {boolean} checked - Whether the checkbox is checked
 * @param {boolean} disabled - Whether the checkbox is disabled
 * @param {function} onChange - Callback when checkbox state changes
 * @param {string} label - The product name label
 * @param {number} volume - The shipment volume count
 */
const ProductCheckbox = ({ checked, disabled, onChange, label, volume }) => {
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <input
        type='checkbox'
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.checked);
        }}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          cursor: 'pointer',
          pointerEvents: 'auto',
          width: '16px',
          height: '16px',
        }}
      />
      <span style={{ fontSize: '13px', userSelect: 'none' }}>
        {label} ({volume.toLocaleString()} shipments)
      </span>
    </div>
  );
};

export default ProductCheckbox;


