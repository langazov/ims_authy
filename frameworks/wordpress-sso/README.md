WordPress SSO plugin for ims_authy

This minimal plugin implements SSO login via the ims_authy OAuth2 server at https://oauth2.imsc.eu using Authorization Code + PKCE.

Features
- OAuth2 Authorization Code + PKCE login button
- Admin settings to configure server base URL, client_id, and redirect URI
 - Admin settings to configure client_id and redirect URI (server base URL is fixed to https://oauth2.imsc.eu)
- Exchanges code for tokens, calls `/api/v1/users/me` to fetch user profile

Install
1. Copy this folder into your WordPress plugins directory.
2. Activate the plugin from WP admin.
3. Configure plugin settings under Settings → IMS Authy SSO.
4. Place the shortcode [ims_authy_login] on a page to show the login button.

Notes
- This is a minimal example. Harden cookie handling and HTTPS settings for production.
