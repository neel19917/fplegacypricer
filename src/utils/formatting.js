/**
 * Formatting utilities for displaying data
 */

/**
 * Format a number as currency (USD)
 * @param {number} cost - The cost to format
 * @returns {string} Formatted currency string
 */
export const formatCost = (cost) => {
  return Number(cost).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
};

/**
 * Format a date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US');
};

/**
 * Format a filename for download
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} company - Company name
 * @param {string} rep - Rep name
 * @returns {string} Formatted filename
 */
export const formatDownloadFilename = (date, company, rep) => {
  const formattedDate = date.replace(/-/g, '');
  const companyName = company.trim() || 'Company';
  const repName = rep.trim() || 'Rep';
  return `${formattedDate}-${companyName}-${repName}.png`;
};

/**
 * Format tier range for display
 * @param {number} start - Range start
 * @param {number} end - Range end (can be Infinity)
 * @returns {string} Formatted range string
 */
export const formatTierRange = (start, end) => {
  if (end === Infinity) {
    return `${start}+`;
  }
  return `${start}–${end}`;
};

/**
 * Format product volume/count for display
 * @param {*} value - The volume or count value
 * @returns {string} Formatted string
 */
export const formatVolume = (value) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
};

