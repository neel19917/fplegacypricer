# Azure AD Setup Instructions

This guide will help you configure Azure Active Directory (Azure AD) authentication for the FreightPOP Legacy Pricer application.

## Prerequisites

- Access to Azure Portal (https://portal.azure.com)
- Admin rights to your Azure AD tenant
- A FreightPOP organization with Azure AD

## Step 1: Register the Application in Azure AD

1. **Go to Azure Portal**
   - Navigate to https://portal.azure.com
   - Sign in with your admin account

2. **Navigate to Azure Active Directory**
   - Click on "Azure Active Directory" in the left sidebar
   - Or search for "Azure Active Directory" in the top search bar

3. **Create App Registration**
   - Click on "App registrations" in the left menu
   - Click "+ New registration" at the top

4. **Configure Registration**
   Fill in the following details:
   
   - **Name**: `FreightPOP Legacy Pricer`
   - **Supported account types**: 
     - Select "Accounts in this organizational directory only (Single tenant)"
     - This ensures only your organization's users can sign in
   - **Redirect URI**:
     - Platform: Select "Single-page application (SPA)"
     - URI: `http://localhost:3000` (for development)
     - For production, add: `https://your-production-domain.com`
   
   Click **Register**

## Step 2: Configure Authentication

1. **After registration, note these values:**
   - **Application (client) ID**: Copy this value (looks like: `12345678-1234-1234-1234-123456789abc`)
   - **Directory (tenant) ID**: Copy this value (looks like: `87654321-4321-4321-4321-cba987654321`)

2. **Configure Token Settings**
   - Go to "Authentication" in the left menu
   - Under "Implicit grant and hybrid flows":
     - ✅ Check "ID tokens (used for implicit and hybrid flows)"
   - Click **Save**

3. **Configure API Permissions** (Optional but recommended)
   - Go to "API permissions" in the left menu
   - You should see "Microsoft Graph > User.Read" already added
   - This allows the app to read user profile information
   - Click "Grant admin consent for [Your Organization]" if available

## Step 3: Configure Environment Variables

Create or update your `.env` file in the project root with these values:

```bash
# Azure AD Configuration
VITE_AZURE_CLIENT_ID=your-application-client-id-here
VITE_AZURE_TENANT_ID=your-directory-tenant-id-here
VITE_AZURE_REDIRECT_URI=http://localhost:3000
VITE_ALLOWED_DOMAIN=freightpop.com

# Optional: Keep password fallback
VITE_MASTER_PASSWORD=your-secure-password-here
```

**Replace the values:**
- `VITE_AZURE_CLIENT_ID`: Paste the Application (client) ID from Step 2
- `VITE_AZURE_TENANT_ID`: Paste the Directory (tenant) ID from Step 2
- `VITE_ALLOWED_DOMAIN`: Set to `freightpop.com` (only @freightpop.com emails will be allowed)

## Step 4: Test the Integration

1. **Restart the development server**
   ```bash
   npm run dev
   ```

2. **Open the application**
   - Navigate to http://localhost:3000
   - You should see the Microsoft login button

3. **Test Microsoft Login**
   - Click "Sign in with Microsoft"
   - You'll be redirected to Microsoft login
   - Sign in with your @freightpop.com email
   - Consent to the permissions if prompted
   - You should be redirected back and logged in

4. **Test Domain Restriction**
   - Try logging in with a non-@freightpop.com email
   - You should see an error: "Access denied. Only @freightpop.com email addresses are allowed."

## Production Deployment

When deploying to production:

1. **Add Production Redirect URI**
   - Go back to Azure Portal > App registrations > Your app
   - Go to "Authentication"
   - Under "Single-page application", click "+ Add URI"
   - Add: `https://your-production-domain.com`
   - Click **Save**

2. **Update Production Environment Variables**
   ```bash
   VITE_AZURE_CLIENT_ID=your-application-client-id-here
   VITE_AZURE_TENANT_ID=your-directory-tenant-id-here
   VITE_AZURE_REDIRECT_URI=https://your-production-domain.com
   VITE_ALLOWED_DOMAIN=freightpop.com
   ```

3. **Optional: Disable Password Fallback**
   - If you want Microsoft login only, remove or comment out `VITE_MASTER_PASSWORD`
   - Or modify the `LoginScreen` component to hide password input

## Features

✅ **Domain Restriction**
- Only @freightpop.com email addresses can sign in
- Configurable via `VITE_ALLOWED_DOMAIN` environment variable

✅ **Dual Authentication**
- Primary: Microsoft Azure AD login
- Fallback: Master password authentication
- Both methods work independently

✅ **Secure Session Management**
- Uses sessionStorage for security
- Per-tab authentication isolation
- Automatic token refresh

✅ **User Profile Display**
- Shows logged-in user's name and email in header
- User avatar with initials

## Troubleshooting

### "AADSTS50011: The redirect URI specified in the request does not match"
- Make sure the redirect URI in your `.env` matches exactly what's configured in Azure Portal
- Check for trailing slashes or http vs https

### "Access denied" for @freightpop.com users
- Verify `VITE_ALLOWED_DOMAIN=freightpop.com` in your `.env` file
- Check the user's email domain is exactly `freightpop.com` (not a subdomain)

### Microsoft login button not showing
- Check that `VITE_AZURE_CLIENT_ID` and `VITE_AZURE_TENANT_ID` are set in `.env`
- Restart the dev server after changing `.env` files

### "Insufficient permissions to create"
- Make sure you granted admin consent in Azure Portal
- This is usually optional and won't prevent login

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` files to git**
   - Add `.env` to your `.gitignore`
   - Use `.env.example` for documentation

2. **Rotate credentials regularly**
   - Client secrets (if you add them later)
   - Master passwords

3. **Use HTTPS in production**
   - Azure AD requires HTTPS for production redirect URIs
   - Only http://localhost is allowed for development

4. **Monitor sign-ins**
   - Use Azure AD sign-in logs to monitor access
   - Set up alerts for suspicious activity

## Support

For issues or questions:
- Azure AD Documentation: https://docs.microsoft.com/en-us/azure/active-directory/
- MSAL.js Documentation: https://github.com/AzureAD/microsoft-authentication-library-for-js

---

**Last Updated**: January 2025
**Version**: 1.0

