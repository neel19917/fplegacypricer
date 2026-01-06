/**
 * User Permissions Helper
 * 
 * Checks user roles and permissions based on user_profiles table.
 * User types: 'Super Admin', 'Admin', 'Sales'
 */

import { supabase, isSupabaseConfigured } from '../supabaseConfig';

// User type constants
export const USER_TYPES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  SALES: 'Sales',
};

/**
 * Check if user is a Super Admin
 */
export function isSuperAdmin(userProfile) {
  return userProfile?.user_type === USER_TYPES.SUPER_ADMIN;
}

/**
 * Check if user is an Admin (includes Super Admin)
 */
export function isAdmin(userProfile) {
  return userProfile?.user_type === USER_TYPES.SUPER_ADMIN || 
         userProfile?.user_type === USER_TYPES.ADMIN;
}

/**
 * Check if user can edit pricing tiers (Super Admin only)
 */
export function canEditPricing(userProfile) {
  return isSuperAdmin(userProfile);
}

/**
 * Check if user can approve quotes (Admin or Super Admin)
 */
export function canApproveQuotes(userProfile) {
  return isAdmin(userProfile);
}

/**
 * Check if user can create quotes (all authenticated users)
 */
export function canCreateQuotes(userProfile) {
  return !!userProfile;
}

/**
 * Check if user can delete quotes (Admin or Super Admin, or own quotes for Sales)
 */
export function canDeleteQuote(userProfile, quote) {
  if (isAdmin(userProfile)) return true;
  // Sales can delete their own quotes
  return quote?.prepared_by === userProfile?.email;
}

/**
 * Fetch user profile from Supabase
 */
export async function fetchUserProfile(userId) {
  if (!isSupabaseConfigured() || !supabase || !userId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Permissions] ❌ Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Permissions] ❌ Exception fetching user profile:', err);
    return null;
  }
}

/**
 * Fetch user profile by email
 */
export async function fetchUserProfileByEmail(email) {
  if (!isSupabaseConfigured() || !supabase || !email) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      // User might not have a profile yet
      if (error.code === 'PGRST116') {
        console.log('[Permissions] User profile not found, using default permissions');
        return { user_type: USER_TYPES.SALES }; // Default to Sales
      }
      console.error('[Permissions] ❌ Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[Permissions] ❌ Exception fetching user profile:', err);
    return null;
  }
}

/**
 * Get permission summary for a user
 */
export function getPermissionSummary(userProfile) {
  return {
    userType: userProfile?.user_type || 'Unknown',
    canEditPricing: canEditPricing(userProfile),
    canApproveQuotes: canApproveQuotes(userProfile),
    canCreateQuotes: canCreateQuotes(userProfile),
    isSuperAdmin: isSuperAdmin(userProfile),
    isAdmin: isAdmin(userProfile),
  };
}

