# GMRL Auth Module

Reusable Azure AD authentication for all GMRL Node.js apps.

## Quick Start (New Project)

### Step 1: Copy auth folder to your new project

```powershell
Copy-Item -Path "F:\shared-modules\gmrl-auth\*" -Destination "YOUR_PROJECT\auth\" -Recurse
```

### Step 2: Add to your .env file

```env
# Azure AD Configuration
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here

# App URL (change for each app)
APP_URL=https://your-app.gmrlapps.com
REDIRECT_URI=https://your-app.gmrlapps.com/auth/callback

# SQL Server (for session/user storage)
SQL_SERVER=localhost
SQL_DATABASE=YourAppDB
SQL_USER=sa
SQL_PASSWORD=your-password
SQL_ENCRYPT=false
SQL_TRUST_CERT=true

# Session
SESSION_SECRET=generate-random-string-here
```

### Step 3: Add to Azure AD

Go to Azure Portal → App Registrations → Your App → Authentication

Add redirect URI:
```
https://your-new-app.gmrlapps.com/auth/callback
```

### Step 4: Use in your app.js

```javascript
const express = require('express');
const { initializeAuth, requireAuth, requireRole } = require('./auth/auth-server');

const app = express();

// Initialize authentication
initializeAuth(app);

// Public route
app.get('/', (req, res) => {
    res.send('Welcome! <a href="/auth/login">Login</a>');
});

// Protected route (any logged-in user)
app.get('/dashboard', requireAuth, (req, res) => {
    res.send(`Hello ${req.currentUser.displayName}!`);
});

// Admin-only route
app.get('/admin', requireAuth, requireRole('Admin'), (req, res) => {
    res.send('Admin Panel');
});

// Start server
app.listen(3001, () => {
    console.log('Server running on port 3001');
});
```

### Step 5: Create database tables

Run the SQL script to create Users and UserRoles tables:

```sql
-- See sql/auth-tables.sql in this folder
```

## Available Functions

| Function | Description |
|----------|-------------|
| `initializeAuth(app)` | Sets up all auth routes |
| `requireAuth` | Middleware - must be logged in |
| `requireRole('Admin')` | Middleware - must have specific role |
| `requireRole('Admin', 'Auditor')` | Middleware - must have one of the roles |

## Auth Routes (auto-created)

| Route | Description |
|-------|-------------|
| `/auth/login` | Login page |
| `/auth/callback` | OAuth callback (Azure redirects here) |
| `/auth/logout` | Logout |
| `/auth/session` | Get current user info (JSON) |
| `/admin/users` | User management (Admin only) |

## Folder Structure

```
auth/
├── auth-server.js          # Main entry point
├── middleware/
│   ├── require-auth.js     # Auth middleware
│   └── require-role.js     # Role middleware
├── pages/
│   ├── login.js            # Login page
│   └── pending-approval.js # Pending approval page
├── services/
│   ├── session-manager.js  # Session handling
│   ├── oauth-callback-handler.js  # OAuth flow
│   └── logout-handler.js   # Logout handling
├── scripts/                # Frontend JS
└── styles/                 # CSS
```

## Notes

- All apps share the SAME Azure AD app registration
- Just add new redirect URIs for each app
- Users table can be shared or separate per app
- Roles are app-specific (configure in each app's database)
