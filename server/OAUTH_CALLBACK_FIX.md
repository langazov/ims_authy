# OAuth Callback Session Fix

## Problem Analysis

The error "could not find a matching session for this request" in the OAuth callback indicates that the OAuth state parameter validation is failing. The callback was receiving the correct authorization code and state, but the server couldn't find the corresponding session/cookie.

## Root Cause

The issue was in the cookie configuration for OAuth state management:

1. **Missing SameSite attribute**: Cookies without explicit SameSite policy can be rejected by browsers in cross-site contexts
2. **Incorrect Secure flag**: In production behind HTTPS proxy, cookies need `Secure: true`
3. **Insufficient debugging**: No logging to track cookie state validation failures

## Fixes Applied

### 1. Enhanced Cookie Configuration

**Before:**
```go
http.SetCookie(w, &http.Cookie{
    Name:     "oauth_state_" + provider,
    Value:    state,
    Path:     "/",
    HttpOnly: true,
    Secure:   false, // Hard-coded to false
    MaxAge:   600,
})
```

**After:**
```go
// Detect if we're running behind HTTPS (either direct TLS or proxy)
isSecure := r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https"

http.SetCookie(w, &http.Cookie{
    Name:     "oauth_state_" + provider,
    Value:    state,
    Path:     "/",
    HttpOnly: true,
    Secure:   isSecure,                 // Dynamic based on request
    SameSite: http.SameSiteLaxMode,     // Allow cross-site OAuth callbacks
    MaxAge:   600,
})
```

### 2. Consistent Cookie Deletion

Updated cookie deletion to use the same security settings:

```go
http.SetCookie(w, &http.Cookie{
    Name:     "oauth_state_" + provider,
    Value:    "",
    Path:     "/",
    HttpOnly: true,
    Secure:   isSecure,
    SameSite: http.SameSiteLaxMode,
    MaxAge:   -1, // Delete the cookie
})
```

### 3. Enhanced Debugging

Added comprehensive logging for OAuth state validation:

```go
// Debug logging for OAuth state validation
if err != nil {
    log.Printf("OAuth state validation failed - cookie '%s' not found: %v", cookieName, err)
    log.Printf("Available cookies: %v", r.Cookies())
} else {
    log.Printf("OAuth state validation - cookie value: %s, received state: %s", cookie.Value, state)
}
```

## Key Improvements

1. **Dynamic Secure Flag**: Automatically detects HTTPS (direct or via proxy) and sets cookie security appropriately
2. **SameSite Policy**: Uses `SameSiteLaxMode` to allow OAuth callbacks while maintaining security
3. **Better Logging**: Provides detailed information about cookie state during OAuth flow
4. **Consistency**: Same cookie settings used for both creation and deletion

## Testing the Fix

After deploying this fix, monitor the logs for:

1. **Successful state validation**: 
   ```
   OAuth state validation - cookie value: abc123, received state: abc123
   ```

2. **Cookie availability**:
   ```
   Available cookies: [oauth_state_authy=abc123; ...]
   ```

3. **No more "Invalid state parameter" errors**

## Additional Recommendations

If issues persist, consider:

1. **Domain Configuration**: Ensure OAuth client and server are properly configured for domain/subdomain handling
2. **CORS Headers**: Verify that `Access-Control-Allow-Credentials: true` is working correctly
3. **Client Configuration**: Check that the OAuth client (Gitea) has correct callback URLs configured
4. **Session Storage**: Consider using server-side session storage instead of cookies for production environments

## Environment Considerations

The fix handles these deployment scenarios:

- **Development**: HTTP with relaxed security
- **Production with direct HTTPS**: Secure cookies enabled
- **Production behind HTTPS proxy**: Detects `X-Forwarded-Proto` header
- **Cross-domain OAuth**: `SameSiteLaxMode` allows legitimate OAuth callbacks

## Monitoring

Watch for these log patterns after deployment:

**Success Pattern:**
```
OAuth state validation - cookie value: <state>, received state: <state>
```

**Failure Patterns:**
```
OAuth state validation failed - cookie 'oauth_state_authy' not found
OAuth callback error: Invalid state parameter
```

The enhanced logging will help identify any remaining issues in the OAuth flow.