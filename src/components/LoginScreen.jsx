/**
 * Login Component with Microsoft OAuth Authentication Only
 * Restricted to @freightpop.com domain
 */

import React from 'react';

export default function LoginScreen({
  onSupabaseMicrosoft,
  supabaseError,
  isSupabaseLoading,
  isSupabaseConfigured,
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          padding: '48px',
          maxWidth: '440px',
          width: '100%',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '8px',
            }}
          >
            FreightPOP Quote Builder
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>
            Sign in with your FreightPOP account
          </p>
        </div>

        {/* Microsoft OAuth Authentication */}
        {isSupabaseConfigured ? (
          <>
            {supabaseError && (
              <div
                style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  color: '#991b1b',
                  fontSize: '14px',
                }}
              >
                {supabaseError}
              </div>
            )}

            <button
              onClick={onSupabaseMicrosoft}
              disabled={isSupabaseLoading}
              style={{
                width: '100%',
                padding: '16px 24px',
                fontSize: '17px',
                fontWeight: '600',
                color: 'white',
                background: isSupabaseLoading 
                  ? '#94a3b8' 
                  : 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                border: 'none',
                borderRadius: '10px',
                cursor: isSupabaseLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSupabaseLoading 
                  ? 'none' 
                  : '0 4px 12px rgba(37, 99, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
              onMouseEnter={(e) => {
                if (!isSupabaseLoading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSupabaseLoading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
                }
              }}
            >
              {isSupabaseLoading ? (
                <>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      border: '3px solid rgba(255, 255, 255, 0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  Signing in...
                </>
              ) : (
                <>
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 21 21"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="10" height="10" fill="#f25022" />
                    <rect x="11" width="10" height="10" fill="#00a4ef" />
                    <rect y="11" width="10" height="10" fill="#7fba00" />
                    <rect x="11" y="11" width="10" height="10" fill="#ffb900" />
                  </svg>
                  Sign in with Microsoft
                </>
              )}
            </button>
          </>
        ) : (
          <div
            style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '16px',
              color: '#92400e',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            ⚠️ Authentication not configured. Please contact your administrator.
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #e2e8f0',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            FreightPOP Legacy Pricer v2.0
          </p>
          <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
            © 2024 FreightPOP. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
