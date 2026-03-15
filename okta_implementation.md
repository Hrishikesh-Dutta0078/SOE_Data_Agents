# OKTA Authentication Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Environment Configuration](#environment-configuration)
3. [Authentication Flow](#authentication-flow)
4. [Code Components](#code-components)
5. [Security Features](#security-features)
6. [Session Management](#session-management)
7. [Authorization Logic](#authorization-logic)
8. [API Endpoints](#api-endpoints)

---

## Overview

GenInsight implements **OKTA OAuth 2.0 Authentication** using the **Authorization Code flow with PKCE** (Proof Key for Code Exchange). This provides a secure, industry-standard authentication mechanism that:

- Eliminates the need to store client secrets in public clients
- Prevents authorization code interception attacks
- Integrates with Adobe's corporate OKTA instance
- Supports both local development and Azure-hosted production environments

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Browser   │────▶│  Flask App  │────▶│  Adobe OKTA Server  │
│   (User)    │◀────│  (Backend)  │◀────│  (Identity Provider)│
└─────────────┘     └─────────────┘     └─────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Azure Key   │
                    │   Vault     │
                    └─────────────┘
```

---

## Environment Configuration

### OKTA Credentials

#### DEV Environment (`.env_DEV`)

| Variable | Value | Description |
|----------|-------|-------------|
| `ENV_OKTA_CLIENT_ID_LOCAL` | `0oa1zjo1oe1wtHNTt0h8` | Client ID for local development |
| `ENV_OKTA_REDIRECT_URI_LOCAL` | `https://localhost:5000/implicit/callback` | Callback URL for local |
| `ENV_OKTA_CLIENT_ID` | `0oa1zlrdic5Ggzip50h8` | Client ID for DEV Azure deployment |
| `ENV_OKTA_REDIRECT_URI` | `https://geninsights-dev.azurewebsites.net/implicit/callback` | Callback URL for DEV |
| `ENV_OKTA_ISSUER_URL` | `https://adobe.okta.com/oauth2/aus1gan31wnmCPyB60h8` | OKTA Authorization Server |
| `ENV_REDIRECT_URI` | `/implicit/callback/` | Relative callback path |

#### PRD Environment (`.env_PRD`)

| Variable | Value | Description |
|----------|-------|-------------|
| `ENV_OKTA_CLIENT_ID_LOCAL` | `0oa1zjo1oe1wtHNTt0h8` | Client ID for local development |
| `ENV_OKTA_REDIRECT_URI_LOCAL` | `https://localhost:5000/implicit/callback` | Callback URL for local |
| `ENV_OKTA_CLIENT_ID` | `0oa20m84vqnyS16Hy0h8` | Client ID for PRD Azure deployment |
| `ENV_OKTA_REDIRECT_URI` | `https://geninsights.azurewebsites.net/implicit/callback` | Callback URL for PRD |
| `ENV_OKTA_ISSUER_URL` | `https://adobe.okta.com/oauth2/aus1gan31wnmCPyB60h8` | OKTA Authorization Server |
| `ENV_REDIRECT_URI` | `/implicit/callback/` | Relative callback path |

### Key Observations

- **Shared Issuer URL**: Both DEV and PRD use the same OKTA authorization server (`aus1gan31wnmCPyB60h8`)
- **Shared Local Client ID**: Local development uses the same client ID across environments
- **Separate Production Apps**: DEV and PRD have distinct OKTA application registrations
- **SSL Required**: All redirect URIs use HTTPS (including localhost)

---

## Authentication Flow

### Sequence Diagram

```
User                    Flask App                       OKTA Server
 │                          │                               │
 │  1. Access /index        │                               │
 │─────────────────────────▶│                               │
 │                          │                               │
 │                          │ 2. Check session['okta_user'] │
 │                          │    (Not found)                │
 │                          │                               │
 │  3. Redirect to /login   │                               │
 │◀─────────────────────────│                               │
 │                          │                               │
 │  4. GET /login           │                               │
 │─────────────────────────▶│                               │
 │                          │                               │
 │                          │ 5. Generate PKCE pair         │
 │                          │    - code_verifier (random)   │
 │                          │    - code_challenge (SHA256)  │
 │                          │                               │
 │                          │ 6. Generate state token       │
 │                          │                               │
 │                          │ 7. Store in session:          │
 │                          │    - code_verifier            │
 │                          │    - oauth_state              │
 │                          │                               │
 │  8. Redirect to OKTA /v1/authorize                       │
 │◀─────────────────────────│                               │
 │                          │                               │
 │  9. OKTA Login Page      │                               │
 │─────────────────────────────────────────────────────────▶│
 │                          │                               │
 │                          │                               │ 10. User authenticates
 │                          │                               │
 │  11. Redirect to /implicit/callback?code=XXX&state=YYY   │
 │◀─────────────────────────────────────────────────────────│
 │                          │                               │
 │  12. GET /implicit/callback                              │
 │─────────────────────────▶│                               │
 │                          │                               │
 │                          │ 13. Verify state matches      │
 │                          │                               │
 │                          │ 14. POST /v1/token            │
 │                          │─────────────────────────────▶│
 │                          │     - authorization_code      │
 │                          │     - code_verifier           │
 │                          │                               │
 │                          │ 15. Tokens returned           │
 │                          │◀─────────────────────────────│
 │                          │     - access_token            │
 │                          │     - id_token                │
 │                          │                               │
 │                          │ 16. GET /v1/userinfo          │
 │                          │─────────────────────────────▶│
 │                          │                               │
 │                          │ 17. User profile returned     │
 │                          │◀─────────────────────────────│
 │                          │                               │
 │                          │ 18. Store in session:         │
 │                          │     - okta_user               │
 │                          │     - id_token                │
 │                          │                               │
 │  19. Redirect to /index  │                               │
 │◀─────────────────────────│                               │
 │                          │                               │
 │  20. Protected content   │                               │
 │◀─────────────────────────│                               │
```

### Flow Description

1. **User Access**: User attempts to access a protected route (e.g., `/`)
2. **Session Check**: The `requires_authorization` decorator checks for `okta_user` in session
3. **Login Redirect**: If not authenticated, user is redirected to `/login`
4. **PKCE Generation**: App generates a cryptographic code verifier and its SHA-256 challenge
5. **State Generation**: A random state token is created for CSRF protection
6. **OKTA Redirect**: User is redirected to OKTA's authorization endpoint with parameters
7. **User Authentication**: User logs in via OKTA (SSO, MFA, etc.)
8. **Callback**: OKTA redirects back with an authorization code and state
9. **State Validation**: App verifies the returned state matches the stored one
10. **Token Exchange**: App exchanges the code for tokens using the code verifier
11. **User Info Fetch**: App fetches user profile from OKTA's userinfo endpoint
12. **Session Storage**: User info is stored in the Flask session
13. **Access Granted**: User can now access protected resources

---

## Code Components

### 1. PKCE Generation (`generate_pkce_pair`)

```python
def generate_pkce_pair():
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode('utf-8').rstrip('=')
    return code_verifier, code_challenge
```

**Purpose**: Creates a cryptographically secure code verifier and its SHA-256 hash (code challenge) for PKCE flow.

**Parameters**:
- `code_verifier`: 64-byte random string (URL-safe base64 encoded)
- `code_challenge`: SHA-256 hash of verifier, base64 encoded, padding removed

---

### 2. Login Route (`/login`)

**Location**: `app.py` lines 256-273, `app_local.py` lines 261-281

```python
@app.route('/login')
def login():
    code_verifier, code_challenge = generate_pkce_pair()
    session['code_verifier'] = code_verifier
    state = secrets.token_urlsafe(16)
    session['oauth_state'] = state

    params = {
        'client_id': ENV_OKTA_CLIENT_ID,
        'redirect_uri': ENV_OKTA_REDIRECT_URI,
        'scope': 'openid profile email',
        'response_type': 'code',
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256',
        'state': state
    }
    auth_url = f"{ENV_OKTA_ISSUER_URL}/v1/authorize?" + urlencode(params)
    return redirect(auth_url)
```

**OAuth Parameters**:
| Parameter | Value | Description |
|-----------|-------|-------------|
| `client_id` | From env | OKTA application client ID |
| `redirect_uri` | From env | Where OKTA sends the auth code |
| `scope` | `openid profile email` | Requested user information |
| `response_type` | `code` | Authorization Code flow |
| `code_challenge` | SHA-256 hash | PKCE challenge |
| `code_challenge_method` | `S256` | SHA-256 hashing method |
| `state` | Random token | CSRF protection |

---

### 3. Callback Route (`/implicit/callback`)

**Location**: `app.py` lines 275-313, `app_local.py` lines 284-324

```python
@app.route(ENV_REDIRECT_URI)
def auth_response(): 
    code = request.args.get('code')
    state = request.args.get('state')
    
    # Verify state parameter
    if state != session.pop('oauth_state', None):
        return "Invalid state parameter", 400

    code_verifier = session.pop('code_verifier', None) 
    if not code or not code_verifier:
        return "Authorization failed", 400
    
    # Token exchange
    token_url = f"{ENV_OKTA_ISSUER_URL}/v1/token"    
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    data = {
        'grant_type': 'authorization_code',
        'client_id': ENV_OKTA_CLIENT_ID,
        'code': code,
        'redirect_uri': ENV_OKTA_REDIRECT_URI,
        'code_verifier': code_verifier
    }
   
    response = requests.post(token_url, headers=headers, data=data)
    token_data = response.json()

    if response.status_code != 200 or 'id_token' not in token_data:
        return "Token exchange failed", 400
    
    # Store tokens and fetch user info
    session['id_token'] = token_data['id_token']
    user_info = requests.get(
        f"{ENV_OKTA_ISSUER_URL}/v1/userinfo",
        headers={'Authorization': f"Bearer {token_data['access_token']}"}
    ).json()

    session['okta_user'] = user_info
    log_user_login()
    return redirect(url_for('index'))
```

---

### 4. Authorization Decorator (`requires_authorization`)

**Location**: `app.py` lines 137-151, `app_local.py` lines 125-142

```python
def requires_authorization(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'okta_user' not in session:
            return redirect(url_for("login"))
        
        user = session.get('okta_user')
        allowed_users = get_allowed_users()

        user_ldap = extract_ldap_username(user.get("email", ""))
        if user_ldap not in allowed_users:
            abort(403, description="You are not authorized to access this application.")
        
        return f(*args, **kwargs)
    return decorated_function
```

**Authorization Logic**:
1. Check if `okta_user` exists in session
2. Extract LDAP username from email (everything before `@`)
3. Validate against `ALLOWED_USERS` list from Azure Key Vault
4. Return 403 if not authorized

---

### 5. User Login Logging (`log_user_login`)

**Location**: `app.py` lines 154-186, `app_local.py` lines 145-178

```python
def log_user_login():
    if 'okta_user' in session:                   
        user = session.get('okta_user')
        user_name = user.get("name")
        user_email = user.get("email", "")
        user_ldap = extract_ldap_username(user_email)

        status = 'Success' 
        allowed_users = get_allowed_users() 
        if user_ldap not in allowed_users:
            status = 'Failed - Unauthorized'
        
        utc_now = datetime.now(pytz.utc)
        local_timezone = pytz.timezone(ENV_TIMEZONE)
        local_now = utc_now.astimezone(local_timezone)
        utc_offset = local_now.utcoffset().total_seconds() / 3600

        user_log_data = {
            'event_description': 'User login event',
            'username': user_name,
            'userldap': user_ldap,                    
            'utc_time': utc_now.strftime('%Y-%m-%d %H:%M:%S %Z'),
            'local_IST_time': local_now.strftime('%Y-%m-%d %H:%M:%S %Z'),
            'utc_offset_hours': utc_offset,
            'status': status,
            'source': 'AzureHost'  # or 'Local' in app_local.py
        }
        logger.info(json.dumps(user_log_data))
```

**Logged Data**:
- User name and LDAP ID
- UTC and local timestamps
- Login status (Success/Failed - Unauthorized)
- Source environment (AzureHost/Local)

---

## Security Features

### 1. PKCE (Proof Key for Code Exchange)

PKCE prevents authorization code interception attacks by:
- Generating a random `code_verifier` on the client
- Sending a hashed `code_challenge` to the authorization endpoint
- Sending the original `code_verifier` during token exchange
- Server validates that the verifier hashes to the original challenge

### 2. State Parameter

The `state` parameter protects against CSRF attacks during OAuth flow:
- Random 16-byte token generated before redirect
- Stored in session, sent to OKTA
- Validated when OKTA redirects back
- Session value is popped (one-time use)

### 3. CSRF Token Protection

All POST endpoints validate CSRF tokens:
```python
csrf_token = request.headers.get('X-CSRFToken')
if not csrf_token or not validate_csrf_token(csrf_token):
    return jsonify({"StatusCode": 401, "ErrorMessage": "Invalid CSRF token"}), 401
```

### 4. Content Security Policy

```python
csp_policy = {
    "frame-ancestors": "'none'",
    "sandbox": "allow-downloads allow-forms allow-modals allow-scripts allow-same-origin allow-popups",
    "object-src": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "script-src": f"'self' 'nonce-{nonce}'",
    "report-uri": "/csp-violation-report"
}
```

### 5. HTTP Method Restriction

```python
@app.before_request
def limit_methods():
    allowed_methods = ['GET', 'POST']
    if request.method not in allowed_methods:
        abort(405)
```

### 6. SSL/TLS

Local development runs with SSL:
```python
app.run(host='localhost', port=5000, ssl_context=("cert.pem", "key.pem"), debug=True)
```

---

## Session Management

### Flask-Session Configuration

```python
app.config['SESSION_TYPE'] = os.getenv('ENV_SESSION_TYPE')  # "filesystem"
Session(app)
```

### Session Data Stored

| Key | Type | Description | Lifetime |
|-----|------|-------------|----------|
| `okta_user` | dict | User profile from OKTA userinfo | Until logout/expiry |
| `id_token` | string | JWT ID token from OKTA | Until logout/expiry |
| `session_id` | UUID | Unique session identifier | Until logout/expiry |
| `code_verifier` | string | PKCE code verifier | Popped after callback |
| `oauth_state` | string | CSRF state token | Popped after callback |
| `_csrf_token` | string | Form CSRF token | Regenerated per request |

### User Info Structure (`okta_user`)

Typical structure returned from OKTA `/v1/userinfo`:
```json
{
    "sub": "00u1abc123def456",
    "name": "John Doe",
    "email": "jdoe@adobe.com",
    "preferred_username": "jdoe@adobe.com",
    "given_name": "John",
    "family_name": "Doe"
}
```

---

## Authorization Logic

### User Validation Flow

```
┌─────────────────────────────────────────────────────────┐
│                   requires_authorization                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Check session['okta_user']                          │
│     └─▶ If missing: Redirect to /login                  │
│                                                         │
│  2. Extract email from okta_user                        │
│     └─▶ email = user.get("email", "")                   │
│                                                         │
│  3. Extract LDAP username                               │
│     └─▶ ldap = email.split('@')[0]                      │
│         Example: "jdoe@adobe.com" → "jdoe"              │
│                                                         │
│  4. Get allowed users from Azure Key Vault              │
│     └─▶ ALLOWED_USERS.split(',')                        │
│         Example: "jdoe,asmith,bwilson"                  │
│                                                         │
│  5. Check if ldap in allowed_users                      │
│     └─▶ If not: abort(403)                              │
│     └─▶ If yes: Allow access                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Allowed Users Management

The `ALLOWED_USERS` secret is stored in Azure Key Vault:
- Retrieved at application startup
- Comma-separated list of LDAP usernames
- Example: `"user1,user2,user3"`

---

## API Endpoints

### OKTA Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/authorize` | GET (redirect) | Initiate authorization |
| `/v1/token` | POST | Exchange code for tokens |
| `/v1/userinfo` | GET | Fetch user profile |

### Application Auth Endpoints

| Route | Method | Auth Required | Description |
|-------|--------|---------------|-------------|
| `/login` | GET | No | Initiates OKTA OAuth flow |
| `/implicit/callback` | GET | No | Handles OKTA callback |
| `/` | GET | Yes | Main application page |
| `/generate` | POST | Yes | Process data queries |
| `/feedback` | POST | Yes | Submit feedback |
| `/get_csrf_token` | GET | No | Get CSRF token |
| `/csp-violation-report` | POST | No | CSP violation reporting |

---

## Files Reference

| File | Purpose |
|------|---------|
| `app.py` | Production application (Azure deployment) |
| `app_local.py` | Local development application |
| `.env_DEV` | Development environment variables |
| `.env_PRD` | Production environment variables |
| `requirements.txt` | Python dependencies (includes `okta==2.9.8`) |

---

## Dependencies

Key packages for OKTA integration:
- `okta==2.9.8` - OKTA SDK (optional, not directly used in current impl)
- `requests==2.32.3` - HTTP client for OKTA API calls
- `Flask-Session==0.4.1` - Server-side session management
- `identity==0.2.0` - Microsoft identity library (for Azure AD, backup auth)

---

## Troubleshooting

### Common Issues

1. **"Invalid state parameter" (400)**
   - State mismatch between session and callback
   - Session may have expired or been cleared
   - User opened multiple login tabs

2. **"Token exchange failed" (400)**
   - PKCE code_verifier doesn't match challenge
   - Authorization code expired (typically 60 seconds)
   - Incorrect client_id or redirect_uri

3. **403 Forbidden**
   - User's LDAP not in ALLOWED_USERS list
   - Contact admin to add user to Key Vault secret

4. **Redirect loop on login**
   - Session not persisting (check SESSION_TYPE config)
   - Cookie issues (check HTTPS and domain)

### Debug Logging

Enable debug prints in `app_local.py`:
```python
print('okta user')
print(user)
print(allowed_users)
```

---

## Security Considerations

1. **Never expose client secrets** - This implementation uses PKCE, eliminating the need for client secrets in the frontend
2. **Always use HTTPS** - All redirect URIs must use HTTPS
3. **Rotate secrets regularly** - Update OKTA client IDs and Key Vault secrets periodically
4. **Monitor login events** - Login events are logged to Azure Application Insights
5. **Validate all inputs** - State and CSRF tokens are validated on every request

