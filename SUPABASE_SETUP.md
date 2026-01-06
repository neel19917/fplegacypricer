# Supabase Setup Guide with Microsoft & Google Login

Complete guide to setting up Supabase authentication for the FreightPOP Legacy Pricer with Microsoft and Google OAuth, plus @freightpop.com domain restriction.

## Why Supabase?

✅ **Easy Setup** - Takes ~10 minutes total  
✅ **Free Tier** - 50,000 monthly active users  
✅ **Microsoft & Google OAuth** - Built-in support  
✅ **User Database** - Automatically stores all user data  
✅ **No Credit Card Required** - Get started immediately  
✅ **Domain Restriction** - Only @freightpop.com emails  

## Quick Start (3 Steps)

1. Create Supabase project (5 min)
2. Configure Microsoft OAuth (3 min)
3. Add credentials to `.env` (2 min)

---

## Step 1: Create Supabase Project

1. **Go to** [https://supabase.com](https://supabase.com)
2. **Sign in** with GitHub, Google, or email
3. **Create a new project**:
   - Name: `FreightPOP Legacy Pricer`
   - Database Password: Choose a strong password (save it!)
   - Region: Choose closest to you
   - Click **"Create new project"**
4. **Wait ~2 minutes** for setup

5. **Get your credentials**:
   - Go to **Settings > API**
   - Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - Copy **anon/public key** (starts with `eyJ...`)

---

## Step 2: Configure Microsoft OAuth

### 2A: Register App in Azure AD (3 minutes)

1. **Go to** [Azure Portal](https://portal.azure.com)
2. **Navigate to** "Azure Active Directory" > "App registrations"
3. **Click** "+ New registration"
4. **Configure**:
   - Name: `FreightPOP Pricer Supabase`
   - Supported account types: **"Accounts in any organizational directory (Any Azure AD directory - Multitenant)"**
   - Redirect URI: **"Web"** with URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
     - Replace `YOUR-PROJECT` with your actual Supabase project ID
     - Find this in Supabase: **Authentication > Providers > Microsoft**
   - Click **"Register"**

5. **Get credentials**:
   - Copy **Application (client) ID**
   - Click **"Certificates & secrets"** > "+ New client secret"
   - Add description: `Supabase Auth`
   - Expires: Choose duration (recommend 24 months)
   - Click **"Add"**
   - **Copy the secret VALUE immediately** (you can't see it again!)

### 2B: Configure Supabase

1. **In Supabase**, go to **Authentication > Providers**
2. **Find "Microsoft"** in the list
3. **Enable** the toggle
4. **Enter**:
   - **Client ID**: Paste Application (client) ID from Azure
   - **Client Secret**: Paste the secret value from Azure
   - **Azure Tenant**: Use `common` (for any tenant)
5. **Click "Save"**

---

## Step 3: Configure Google OAuth (Optional, 2 minutes)

### 3A: Get Google OAuth Credentials

1. **Go to** [Google Cloud Console](https://console.cloud.google.com)
2. **Create a project** (if you don't have one)
3. **Go to** "APIs & Services" > "Credentials"
4. **Click** "+ CREATE CREDENTIALS" > "OAuth 2.0 Client ID"
5. **Configure OAuth consent screen** (if first time):
   - User Type: External
   - App name: `FreightPOP Pricer`
   - Support email: Your email
   - Click "Save and Continue"
6. **Create OAuth Client**:
   - Application type: **Web application**
   - Name: `FreightPOP Pricer Supabase`
   - Authorized redirect URIs: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
   - Click **"Create"**
7. **Copy**:
   - Client ID
   - Client secret

### 3B: Configure in Supabase

1. **In Supabase**, go to **Authentication > Providers**
2. **Find "Google"** in the list
3. **Enable** the toggle
4. **Enter**:
   - **Client ID**: From Google Console
   - **Client Secret**: From Google Console
5. **Click "Save"**

---

## Step 4: Update Environment Variables

Update your `.env` file:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key-here
VITE_ALLOWED_DOMAIN=freightpop.com

# Fallback Password (for emergencies)
VITE_MASTER_PASSWORD=demo123
```

---

## Step 5: Test the Application

1. **Restart dev server**:
   ```bash
   npm run dev
   ```

2. **Open** [http://localhost:3000](http://localhost:3000)

3. **You should see**:
   - 🔵 **"Sign in with Microsoft"** button (blue)
   - ⚪ **"Sign in with Google"** button (white)
   - Three tabs below: Sign In, Sign Up, Magic Link
   - Master Password fallback at the bottom

4. **Test Microsoft Login**:
   - Click **"Sign in with Microsoft"**
   - Sign in with your @freightpop.com Microsoft account
   - Consent to permissions if prompted
   - You'll be redirected back and logged in!

5. **Test Google Login**:
   - Click **"Sign in with Google"**
   - Sign in with your @freightpop.com Google account
   - You'll be redirected back and logged in!

---

## Authentication Methods

The app supports **5 authentication methods**:

### 1. 🔵 Microsoft OAuth (Recommended)
- Click "Sign in with Microsoft"
- Uses your existing Microsoft account
- **Validates @freightpop.com domain**
- No password needed!
- Single Sign-On (SSO)

### 2. ⚪ Google OAuth
- Click "Sign in with Google"  
- Uses your existing Google account
- **Validates @freightpop.com domain**
- No password needed!

### 3. 📧 Email/Password
- Traditional sign up/sign in
- Requires email confirmation
- Passwords must be 6+ characters
- **Validates @freightpop.com domain**

### 4. 🔗 Magic Link (Passwordless)
- Enter email only
- Receive login link via email
- Click link to sign in
- No password needed!

### 5. 🔑 Master Password Fallback
- For emergencies or quick access
- Current password: `demo123`
- Works even if Supabase is down

---

## Domain Restriction

✅ **Only @freightpop.com emails are allowed**

- ✅ `john@freightpop.com` - Allowed
- ❌ `john@gmail.com` - Rejected
- ❌ `john@other-domain.com` - Rejected

**Note**: This applies to ALL authentication methods (Microsoft, Google, Email, Magic Link)

If a user tries to sign in with a non-FreightPOP email:
> "Access denied. Only @freightpop.com email addresses are allowed."

They will be automatically signed out.

---

## User Data Storage

All users are **automatically stored in Supabase** in the `auth.users` table:

- ✅ Email address
- ✅ Full name (from OAuth provider)
- ✅ Profile picture URL (from OAuth)
- ✅ Last sign-in timestamp
- ✅ Email confirmation status
- ✅ Authentication method used

### View Users

1. **Go to** Supabase Dashboard
2. **Click** "Authentication" > "Users"
3. **See** all registered users with:
   - Email
   - Provider (Microsoft, Google, Email, etc.)
   - Created date
   - Last sign-in
   - Confirmation status

### Search Users
- Use the search box to find users by email
- Filter by provider
- Sort by last sign-in

---

## Production Deployment

### Update Redirect URLs

1. **In Azure AD**:
   - Add production redirect URI: `https://YOUR-DOMAIN.com`
   - Go to App registration > Authentication
   - Add Web redirect: `https://pricer.freightpop.com/auth/v1/callback` (example)

2. **In Google Cloud Console**:
   - Add production redirect URI
   - Go to Credentials > OAuth 2.0 Client
   - Add URI: `https://pricer.freightpop.com/auth/v1/callback`

3. **In Supabase**:
   - Go to Authentication > URL Configuration
   - Add production URL to "Site URL"
   - Add to "Redirect URLs": `https://pricer.freightpop.com/**`

### Environment Variables

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-key-here
VITE_ALLOWED_DOMAIN=freightpop.com
VITE_MASTER_PASSWORD=your-secure-production-password
```

---

## Security Features

✅ **OAuth 2.0** - Industry standard authentication  
✅ **Domain Restriction** - Only @freightpop.com  
✅ **Email Confirmation** - Required for email/password  
✅ **Session Management** - Auto-refresh tokens  
✅ **Secure Storage** - Encrypted tokens  
✅ **Rate Limiting** - Built-in DDoS protection  
✅ **Audit Logs** - Track all sign-ins  

---

## Troubleshooting

### Microsoft Login Issues

**"Redirect URI mismatch"**
- Verify redirect URI in Azure matches Supabase exactly
- Should be: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

**"Access denied"**
- Ensure "Multitenant" is selected in Azure app registration
- Check user email is @freightpop.com

### Google Login Issues

**"Redirect URI mismatch"**
- Verify redirect URI in Google Console matches Supabase
- Should be: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`

**"Access blocked"**
- Check OAuth consent screen is configured
- Ensure app is in "Testing" mode or published

### Domain Restriction

**User can sign in but gets kicked out**
- This is expected! Non-@freightpop.com emails are rejected
- Check user email domain

### General

**"Supabase is not configured"**
- Check `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server: `npm run dev`

---

## Cost & Limits

### Free Tier (Forever Free!)
- ✅ 50,000 monthly active users
- ✅ Unlimited OAuth logins
- ✅ 500 MB database storage
- ✅ Unlimited API requests

For FreightPOP pricer: **Free tier is perfect!**

---

## Next Steps

1. ✅ Complete this setup
2. ✅ Test Microsoft and Google login
3. ✅ Invite team to create accounts
4. ✅ Deploy to production
5. ⏭️ Optional: Add more OAuth providers (GitHub, GitLab, etc.)

---

**Setup Time**: ~10 minutes  
**Status**: ✅ Complete Guide  
**Last Updated**: January 2026
