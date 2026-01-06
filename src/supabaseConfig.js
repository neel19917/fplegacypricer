/**
 * Supabase Configuration
 * 
 * Setup Instructions:
 * 1. Go to https://supabase.com and create a free account
 * 2. Create a new project
 * 3. Go to Settings > API to get your credentials:
 *    - Project URL (e.g., https://xxxxx.supabase.co)
 *    - anon/public key (starts with "eyJ...")
 * 4. Add these to your .env file:
 *    VITE_SUPABASE_URL=your-project-url
 *    VITE_SUPABASE_ANON_KEY=your-anon-key
 *    VITE_ALLOWED_DOMAIN=freightpop.com
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Domain restriction
export const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || 'freightpop.com';

// Initialize Supabase client (singleton)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

/**
 * Validates if the user's email domain is allowed
 * @param {string} email - User's email address
 * @returns {boolean} - True if domain is allowed
 */
export function isEmailDomainAllowed(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain === ALLOWED_DOMAIN.toLowerCase();
}

/**
 * Checks if Supabase is properly configured
 * @returns {boolean} - True if Supabase credentials are present
 */
export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');
}

