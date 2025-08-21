<?php
/**
 * Plugin Name: IMS Authy SSO
 * Description: Minimal SSO plugin using ims_authy OAuth2 server (Authorization Code + PKCE).
 * Version: 0.1.0
 * Author: ims_authy
 */

if (!defined('ABSPATH')) {
    exit;
}

define('IMS_AUTHY_PLUGIN_DIR', plugin_dir_path(__FILE__));
// Fixed server base URL for this plugin
define('IMS_AUTHY_BASE_URL', 'https://oauth2.imsc.eu');

// Register settings and setup page
add_action('admin_menu', function() {
    // Check if setup is needed
    $tenant_id = get_option('ims_authy_tenant_id');
    $setup_complete = get_option('ims_authy_setup_complete');
    
    if (!$setup_complete || empty($tenant_id)) {
        // Add setup page to main admin menu for visibility
        add_menu_page(
            'IMS Authy Setup', 
            'IMS Authy Setup', 
            'manage_options', 
            'ims-authy-setup', 
            'ims_authy_setup_page',
            'dashicons-admin-network',
            30
        );
    }
    
    // Always add the settings page under Settings
    add_options_page('IMS Authy SSO', 'IMS Authy SSO', 'manage_options', 'ims-authy-sso', 'ims_authy_sso_options_page');
});

add_action('admin_init', function() {
    register_setting('ims_authy_sso_options', 'ims_authy_base_url');
    register_setting('ims_authy_sso_options', 'ims_authy_client_id');
    register_setting('ims_authy_sso_options', 'ims_authy_redirect_uri');
    register_setting('ims_authy_sso_options', 'ims_authy_tenant_id');
    register_setting('ims_authy_sso_options', 'ims_authy_setup_complete');
    
    // Handle setup form submission
    if (isset($_POST['ims_authy_setup_submit']) && wp_verify_nonce($_POST['ims_authy_setup_nonce'], 'ims_authy_setup')) {
        $tenant_id = sanitize_text_field($_POST['ims_authy_tenant_id'] ?? '');
        $client_id = sanitize_text_field($_POST['ims_authy_client_id'] ?? 'frontend-client');
        
        if (!empty($tenant_id)) {
            update_option('ims_authy_tenant_id', $tenant_id);
            update_option('ims_authy_client_id', $client_id);
            update_option('ims_authy_redirect_uri', site_url('/ims-authy-callback'));
            update_option('ims_authy_setup_complete', true);
            
            // Redirect to avoid resubmission
            wp_redirect(admin_url('admin.php?page=ims-authy-setup&setup=complete'));
            exit;
        } else {
            add_action('admin_notices', function() {
                echo '<div class="notice notice-error"><p>Tenant ID is required for setup.</p></div>';
            });
        }
    }
});

// Fetch OpenID Connect discovery document and cache it
function ims_authy_get_discovery($return_debug = false) {
    // Determine tenant-aware discovery URL and cache key
    $tenant_id = get_option('ims_authy_tenant_id');

    $cache_key = 'ims_authy_discovery';
    $url = IMS_AUTHY_BASE_URL . '/.well-known/openid_configuration';
    if (!empty($tenant_id)) {
        $cache_key .= '_' . preg_replace('/[^a-z0-9_\-]/i', '', $tenant_id);
        $url = IMS_AUTHY_BASE_URL . '/.well-known/' . rawurlencode($tenant_id) . '/openid_configuration';
    }

    $debug_info = array(
        'url' => $url,
        'tenant_id' => $tenant_id,
        'cache_key' => $cache_key
    );

    // Check cache first
    $cached = get_transient($cache_key);
    if ($cached && is_array($cached)) {
        $debug_info['source'] = 'cache';
        return $return_debug ? array('data' => $cached, 'debug' => $debug_info) : $cached;
    }

    // Make HTTP request
    $resp = wp_remote_get($url, array(
        'timeout' => 15, 
        'headers' => array('Accept' => 'application/json'),
        'sslverify' => true
    ));
    
    $debug_info['source'] = 'http_request';
    
    if (is_wp_error($resp)) {
        $debug_info['error'] = 'HTTP Error: ' . $resp->get_error_message();
        ims_authy_log_error('Discovery failed: ' . $resp->get_error_message() . ' URL: ' . $url);
        return $return_debug ? array('data' => null, 'debug' => $debug_info) : null;
    }

    $status_code = wp_remote_retrieve_response_code($resp);
    $body = wp_remote_retrieve_body($resp);
    
    $debug_info['http_status'] = $status_code;
    $debug_info['response_size'] = strlen($body);
    
    if ($status_code !== 200) {
        $debug_info['error'] = "HTTP {$status_code}: " . wp_remote_retrieve_response_message($resp);
        ims_authy_log_error("Discovery failed with HTTP {$status_code} for URL: {$url}");
        return $return_debug ? array('data' => null, 'debug' => $debug_info) : null;
    }

    $data = json_decode($body, true);
    $debug_info['json_valid'] = json_last_error() === JSON_ERROR_NONE;
    
    if (!$debug_info['json_valid']) {
        $debug_info['error'] = 'Invalid JSON: ' . json_last_error_msg();
        $debug_info['raw_response'] = substr($body, 0, 500) . (strlen($body) > 500 ? '...' : '');
        ims_authy_log_error("Discovery returned invalid JSON from URL: {$url}");
        return $return_debug ? array('data' => null, 'debug' => $debug_info) : null;
    }
    
    if (is_array($data) && !empty($data)) {
        // Cache for one hour
        set_transient($cache_key, $data, HOUR_IN_SECONDS);
        $debug_info['cached'] = true;
        return $return_debug ? array('data' => $data, 'debug' => $debug_info) : $data;
    }

    $debug_info['error'] = 'Empty or invalid discovery document';
    return $return_debug ? array('data' => null, 'debug' => $debug_info) : null;
}

function ims_authy_setup_page() {
    if (!current_user_can('manage_options')) return;
    
    $setup_complete = isset($_GET['setup']) && $_GET['setup'] === 'complete';
    $tenant_id = get_option('ims_authy_tenant_id', '');
    $client_id = get_option('ims_authy_client_id', 'frontend-client');
    ?>
    <div class="wrap">
        <h1>IMS Authy SSO Setup</h1>
        
        <?php if ($setup_complete): ?>
            <div class="notice notice-success">
                <p><strong>Setup Complete!</strong> Your IMS Authy SSO plugin is now configured.</p>
            </div>
            <div class="card">
                <h2>Next Steps</h2>
                <ul>
                    <li>Your tenant ID: <code><?php echo esc_html($tenant_id); ?></code></li>
                    <li>Your client ID: <code><?php echo esc_html($client_id); ?></code></li>
                    <li>Redirect URI: <code><?php echo esc_html(site_url('/ims-authy-callback')); ?></code></li>
                </ul>
                <p>
                    <a href="<?php echo admin_url('options-general.php?page=ims-authy-sso'); ?>" class="button button-primary">Go to Settings</a>
                    <a href="<?php echo admin_url(); ?>" class="button">Dashboard</a>
                </p>
            </div>
        <?php else: ?>
            <div class="card" style="max-width: 600px;">
                <h2>Configure Your Tenant</h2>
                <p>Welcome to IMS Authy SSO! To get started, please enter your tenant ID below. This will configure your WordPress site to authenticate users through your IMS Authy tenant.</p>
                
                <form method="post" action="">
                    <?php wp_nonce_field('ims_authy_setup', 'ims_authy_setup_nonce'); ?>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="ims_authy_tenant_id">Tenant ID <span class="description">(required)</span></label>
                            </th>
                            <td>
                                <input name="ims_authy_tenant_id" type="text" id="ims_authy_tenant_id" 
                                       value="<?php echo esc_attr($tenant_id); ?>" class="regular-text" required />
                                <p class="description">Your unique tenant identifier provided by IMS Authy.</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">
                                <label for="ims_authy_client_id">Client ID</label>
                            </th>
                            <td>
                                <input name="ims_authy_client_id" type="text" id="ims_authy_client_id" 
                                       value="<?php echo esc_attr($client_id); ?>" class="regular-text" />
                                <p class="description">OAuth2 client ID (defaults to 'frontend-client').</p>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <input type="submit" name="ims_authy_setup_submit" class="button button-primary" value="Complete Setup" />
                    </p>
                </form>
            </div>
            
            <div class="card" style="max-width: 600px; margin-top: 20px;">
                <h3>OAuth2 Configuration</h3>
                <p><strong>When configuring your OAuth2 client in IMS Authy, use this callback URL:</strong></p>
                <div style="background: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 4px; margin: 10px 0;">
                    <code style="font-size: 14px; font-weight: bold; user-select: all;"><?php echo esc_html(site_url('/ims-authy-callback')); ?></code>
                    <button type="button" onclick="navigator.clipboard.writeText('<?php echo esc_js(site_url('/ims-authy-callback')); ?>'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy URL', 1000)" class="button button-small" style="margin-left: 10px;">Copy URL</button>
                </div>
                
                <h3>After Setup</h3>
                <ul>
                    <li>✓ Redirect URI will be automatically configured</li>
                    <li>✓ Server URL is pre-configured to: <code>https://oauth2.imsc.eu</code></li>
                    <li>✓ SSO login button will appear on the WordPress login page</li>
                    <li>✓ Users can authenticate using the <code>[ims_authy_login]</code> shortcode</li>
                </ul>
            </div>
        <?php endif; ?>
    </div>
    <?php
}

function ims_authy_sso_options_page() {
    if (!current_user_can('manage_options')) return;
    ?>
    <div class="wrap">
        <h1>IMS Authy SSO</h1>
        <form method="post" action="options.php">
            <?php settings_fields('ims_authy_sso_options'); ?>
            <?php do_settings_sections('ims_authy_sso_options'); ?>
            <table class="form-table">
                <!-- Server base URL is fixed to https://oauth2.imsc.eu for this plugin -->
                <tr>
                    <th scope="row"><label for="ims_authy_client_id">Client ID</label></th>
                    <td><input name="ims_authy_client_id" type="text" id="ims_authy_client_id" value="<?php echo esc_attr(get_option('ims_authy_client_id', 'frontend-client')); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="ims_authy_redirect_uri">Redirect URI</label></th>
                    <td>
                        <input name="ims_authy_redirect_uri" type="text" id="ims_authy_redirect_uri" value="<?php echo esc_attr(get_option('ims_authy_redirect_uri', site_url('/ims-authy-callback'))); ?>" class="regular-text" />
                        <p class="description">
                            <strong>Full Callback URL:</strong> 
                            <code style="background: #f0f0f0; padding: 2px 6px; font-size: 12px; user-select: all;"><?php echo esc_html(get_option('ims_authy_redirect_uri', site_url('/ims-authy-callback'))); ?></code>
                            <button type="button" onclick="navigator.clipboard.writeText('<?php echo esc_js(get_option('ims_authy_redirect_uri', site_url('/ims-authy-callback'))); ?>'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy', 1000)" class="button button-small" style="margin-left: 5px;">Copy</button>
                        </p>
                        <p class="description">Use this exact URL when configuring your OAuth2 client in the IMS Authy system.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="ims_authy_tenant_id">Tenant ID</label></th>
                    <td>
                        <input name="ims_authy_tenant_id" type="text" id="ims_authy_tenant_id" value="<?php echo esc_attr(get_option('ims_authy_tenant_id', '')); ?>" class="regular-text" />
                        <p class="description">Optional tenant identifier. If provided, tenant-specific discovery endpoints will be used automatically.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Discovery</th>
                    <td>
                        <?php
                        $discovery_result = ims_authy_get_discovery(true);
                        $dis = $discovery_result['data'];
                        $debug = $discovery_result['debug'];
                        
                        if ($dis) {
                            echo '<div style="color: green; margin-bottom: 10px;"><strong>✓ Discovery successful</strong></div>';
                            echo '<div>Authorization endpoint: <code>' . esc_html($dis['authorization_endpoint'] ?? '') . '</code></div>';
                            echo '<div>Token endpoint: <code>' . esc_html($dis['token_endpoint'] ?? '') . '</code></div>';
                            echo '<div>Userinfo endpoint: <code>' . esc_html($dis['userinfo_endpoint'] ?? '') . '</code></div>';
                            if (isset($debug['source'])) {
                                echo '<div style="margin-top: 5px; font-size: 12px; color: #666;">Source: ' . esc_html($debug['source']) . '</div>';
                            }
                        } else {
                            echo '<div style="color: red; margin-bottom: 10px;"><strong>✗ Discovery failed</strong></div>';
                            echo '<div><strong>Debug Information:</strong></div>';
                            echo '<div style="background: #f9f9f9; border: 1px solid #ddd; padding: 10px; margin: 5px 0; font-family: monospace; font-size: 12px;">';
                            echo '<div><strong>URL:</strong> ' . esc_html($debug['url']) . '</div>';
                            if (isset($debug['tenant_id']) && !empty($debug['tenant_id'])) {
                                echo '<div><strong>Tenant ID:</strong> ' . esc_html($debug['tenant_id']) . ' (tenant-aware mode)</div>';
                            } else {
                                echo '<div><strong>Mode:</strong> Global (no tenant ID specified)</div>';
                            }
                            if (isset($debug['error'])) {
                                echo '<div style="color: red;"><strong>Error:</strong> ' . esc_html($debug['error']) . '</div>';
                            }
                            if (isset($debug['http_status'])) {
                                echo '<div><strong>HTTP Status:</strong> ' . esc_html($debug['http_status']) . '</div>';
                            }
                            if (isset($debug['response_size'])) {
                                echo '<div><strong>Response Size:</strong> ' . esc_html($debug['response_size']) . ' bytes</div>';
                            }
                            if (isset($debug['raw_response'])) {
                                echo '<div><strong>Response Preview:</strong><br>' . esc_html($debug['raw_response']) . '</div>';
                            }
                            echo '</div>';
                            echo '<div style="margin-top: 10px;"><strong>Troubleshooting:</strong></div>';
                            echo '<ul style="margin-left: 20px;">';
                            echo '<li>Check if the server URL <code>https://oauth2.imsc.eu</code> is accessible</li>';
                            if (isset($debug['tenant_id']) && !empty($debug['tenant_id'])) {
                                echo '<li>Verify your tenant ID <code>' . esc_html($debug['tenant_id']) . '</code> is correct</li>';
                                echo '<li>Try clearing the Tenant ID field to test global discovery</li>';
                            } else {
                                echo '<li>If you have a tenant ID, enter it above to use tenant-specific discovery</li>';
                            }
                            echo '<li>Check your WordPress site can make outbound HTTPS requests</li>';
                            echo '<li>Try the "Refresh discovery" button below</li>';
                            echo '</ul>';
                        }
                        ?>
                        <p><button id="ims-authy-refresh" class="button">Refresh discovery</button></p>
                        <div id="ims-authy-refresh-result" style="margin-top:8px"></div>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Recent Errors</th>
                    <td>
                        <?php
                        $errors = get_option('ims_authy_error_log', []);
                        if (!empty($errors)) {
                            echo '<div style="max-height: 200px; overflow-y: auto; background: #f9f9f9; border: 1px solid #ddd; padding: 10px;">';
                            foreach (array_reverse(array_slice($errors, -10)) as $error) {
                                echo '<div style="margin-bottom: 5px; font-size: 12px;">';
                                echo '<strong>' . esc_html($error['timestamp']) . ':</strong> ';
                                echo esc_html($error['message']);
                                echo '</div>';
                            }
                            echo '</div>';
                            echo '<p><button type="button" onclick="if(confirm(\'Clear error log?\')) location.href=\'?page=ims-authy-sso&clear_errors=1\'" class="button">Clear Error Log</button></p>';
                        } else {
                            echo '<div><em>No recent errors logged.</em></div>';
                        }
                        
                        // Handle clear errors request
                        if (isset($_GET['clear_errors']) && $_GET['clear_errors'] === '1') {
                            delete_option('ims_authy_error_log');
                            echo '<div class="notice notice-success"><p>Error log cleared.</p></div>';
                        }
                        ?>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}

// Shortcode for login button
add_shortcode('ims_authy_login', function($atts) {
    // Discover endpoints
    $discovery = ims_authy_get_discovery();
    $authorize_endpoint = $discovery['authorization_endpoint'] ?? (IMS_AUTHY_BASE_URL . '/oauth/authorize');
    $clientId = esc_attr(get_option('ims_authy_client_id', 'frontend-client'));
    $redirect = esc_url(get_option('ims_authy_redirect_uri', site_url('/ims-authy-callback')));
    $scope = 'openid profile email';

    $code_verifier = base64_encode(random_bytes(32));
    $code_challenge = rtrim(strtr(base64_encode(hash('sha256', $code_verifier, true)), '+/', '-_'), '=');
    $state = bin2hex(random_bytes(16));

    // Store code_verifier and state in session
    if (!session_id()) session_start();
    $_SESSION['ims_authy_code_verifier'] = $code_verifier;
    $_SESSION['ims_authy_state'] = $state;

    $params = http_build_query(array(
        'response_type' => 'code',
        'client_id' => $clientId,
        'redirect_uri' => $redirect,
        'scope' => $scope,
        'state' => $state,
        'code_challenge' => $code_challenge,
        'code_challenge_method' => 'S256'
    ));

    $authUrl = rtrim($authorize_endpoint, '/') . '?' . $params;

    return '<a class="button" href="' . esc_url($authUrl) . '">Login with IMS Authy</a>';
});

// Helper: generate PKCE authorize URL and store verifier/state in session
function ims_authy_generate_auth_url($clientId = null, $redirect = null, $scope = 'openid profile email') {
    $discovery = ims_authy_get_discovery();
    $authorize_endpoint = $discovery['authorization_endpoint'] ?? (IMS_AUTHY_BASE_URL . '/oauth/authorize');

    if (!$clientId) {
        $clientId = get_option('ims_authy_client_id', 'frontend-client');
    }
    if (!$redirect) {
        $redirect = get_option('ims_authy_redirect_uri', site_url('/ims-authy-callback'));
    }

    $code_verifier = base64_encode(random_bytes(32));
    $code_challenge = rtrim(strtr(base64_encode(hash('sha256', $code_verifier, true)), '+/', '-_'), '=');
    $state = bin2hex(random_bytes(16));

    if (!session_id()) session_start();
    $_SESSION['ims_authy_code_verifier'] = $code_verifier;
    $_SESSION['ims_authy_state'] = $state;

    $params = http_build_query(array(
        'response_type' => 'code',
        'client_id' => $clientId,
        'redirect_uri' => $redirect,
        'scope' => $scope,
        'state' => $state,
        'code_challenge' => $code_challenge,
        'code_challenge_method' => 'S256'
    ));

    return rtrim($authorize_endpoint, '/') . '?' . $params;
}

// Inject styling for the SSO frame on the login page
add_action('login_head', function() {
    ?>
    <style>
    .ims-authy-login-container{border:1px solid #e1e1e1;padding:12px;border-radius:8px;background:#fbfbfb;margin-top:12px;box-shadow:0 1px 2px rgba(0,0,0,0.04); height: 6em;  }
    .ims-authy-login-header{font-weight:600;margin-bottom:8px;text-align:center;color:#222;font-size:14px}
    .ims-authy-login-row{text-align:center}
    .ims-authy-button{display:inline-block;min-width:220px}
    @media (max-width:360px){.ims-authy-button{min-width:160px}}
    </style>
    <?php
});

add_action('login_form', function() {
    $authUrl = ims_authy_generate_auth_url();
    echo "<br>";
    echo "<div class=\"ims-authy-login-container\">\n";
    echo "  <div class=\"ims-authy-login-header\">Single Sign-On</div>\n";
    echo "  <div class=\"ims-authy-login-row\">\n";
    echo "    <a class=\"button button-primary ims-authy-button\" href=\"" . esc_url($authUrl) . "\">Login with IMS Authy</a>\n";
    echo "  </div>\n";
    echo "</div>\n";
    echo "<br>";

});

// Enhanced callback handler with better error handling
add_action('init', 'ims_authy_handle_callback');

function ims_authy_handle_callback() {
    // Check if this is a callback request
    if (!ims_authy_is_callback_request()) {
        return;
    }
    
    try {
        ims_authy_process_oauth_callback();
    } catch (Exception $e) {
        ims_authy_log_error('Callback processing failed: ' . $e->getMessage());
        ims_authy_callback_error('Authentication failed. Please try again.', $e->getMessage());
    }
}

function ims_authy_is_callback_request() {
    return isset($_GET['ims_authy_callback']) || 
           (isset($_GET['code']) && isset($_GET['state']) && strpos($_SERVER['REQUEST_URI'], 'ims-authy-callback') !== false) ||
           (isset($_GET['error']) && strpos($_SERVER['REQUEST_URI'], 'ims-authy-callback') !== false);
}

function ims_authy_process_oauth_callback() {
    if (!session_id()) session_start();
    
    // Handle OAuth errors first
    if (isset($_GET['error'])) {
        $error = sanitize_text_field($_GET['error']);
        $error_description = sanitize_text_field($_GET['error_description'] ?? '');
        throw new Exception("OAuth Error: $error - $error_description");
    }
    
    // Validate required parameters
    $code = sanitize_text_field($_GET['code'] ?? '');
    $state = sanitize_text_field($_GET['state'] ?? '');
    
    if (empty($code)) {
        throw new Exception('Missing authorization code');
    }
    
    if (empty($state)) {
        throw new Exception('Missing state parameter');
    }
    
    // Validate state
    $stored_state = $_SESSION['ims_authy_state'] ?? '';
    $code_verifier = $_SESSION['ims_authy_code_verifier'] ?? '';
    
    if (empty($stored_state) || $state !== $stored_state) {
        throw new Exception('Invalid or missing state parameter');
    }
    
    if (empty($code_verifier)) {
        throw new Exception('Missing PKCE code verifier');
    }

    // Exchange code for tokens
    $discovery = ims_authy_get_discovery();
    if (!$discovery) {
        throw new Exception('Failed to get OAuth discovery endpoints');
    }
    
    $tokenUrl = $discovery['token_endpoint'] ?? (IMS_AUTHY_BASE_URL . '/oauth/token');
    
    $response = wp_remote_post($tokenUrl, array(
        'body' => array(
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => esc_url_raw(get_option('ims_authy_redirect_uri', site_url('/ims-authy-callback'))),
            'client_id' => get_option('ims_authy_client_id', 'frontend-client'),
            'code_verifier' => $code_verifier,
        ),
        'headers' => array(
            'Accept' => 'application/json',
            'Content-Type' => 'application/x-www-form-urlencoded'
        ),
        'timeout' => 30
    ));

    if (is_wp_error($response)) {
        throw new Exception('Token request failed: ' . $response->get_error_message());
    }
    
    $status_code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if ($status_code !== 200) {
        $error_msg = $data['error_description'] ?? $data['error'] ?? 'HTTP ' . $status_code;
        throw new Exception('Token exchange failed: ' . $error_msg);
    }
    
    if (empty($data['access_token'])) {
        throw new Exception('Token exchange failed: No access token received');
    }

    // Fetch userinfo 
    $userinfo_endpoint = $discovery['userinfo_endpoint'] ?? (IMS_AUTHY_BASE_URL . '/api/v1/users/me');
    $userinfo = wp_remote_get($userinfo_endpoint, array(
        'headers' => array(
            'Authorization' => 'Bearer ' . $data['access_token'],
            'Accept' => 'application/json'
        ),
        'timeout' => 15
    ));

    if (is_wp_error($userinfo)) {
        throw new Exception('Failed to fetch user info: ' . $userinfo->get_error_message());
    }
    
    $userinfo_status = wp_remote_retrieve_response_code($userinfo);
    $user_body = wp_remote_retrieve_body($userinfo);
    $user = json_decode($user_body, true);
    
    if ($userinfo_status !== 200) {
        throw new Exception('User info request failed with HTTP ' . $userinfo_status);
    }
    
    if (!is_array($user)) {
        throw new Exception('Invalid user info response format');
    }

    // Normalize userinfo: accept several possible id/email fields from the server
    $external_id = $user['id'] ?? $user['user_id'] ?? $user['sub'] ?? $user['username'] ?? null;
    $email = !empty($user['email']) ? sanitize_email($user['email']) : null;
    $name = $user['name'] ?? $user['given_name'] ?? $user['display_name'] ?? '';

    if (empty($external_id) && empty($email)) {
        throw new Exception('User info response missing required fields (id/email)');
    }

    // Create or find a WP user and log them in
    $wp_user_id = ims_authy_find_or_create_user($external_id, $email, $name);
    
    // Map external id to user meta for future lookups
    if ($external_id) {
        update_user_meta($wp_user_id, 'ims_authy_id', $external_id);
    }

    // Clear PKCE/session values
    unset($_SESSION['ims_authy_code_verifier']);
    unset($_SESSION['ims_authy_state']);

    // Log the user in and redirect
    wp_set_current_user($wp_user_id);
    wp_set_auth_cookie($wp_user_id, true);
    
    $user_data = get_userdata($wp_user_id);
    do_action('wp_login', $user_data->user_login, $user_data);
    
    // Allow customization of redirect URL
    $redirect_url = apply_filters('ims_authy_login_redirect', home_url(), $wp_user_id);
    
    ims_authy_log_success("User {$user_data->user_login} logged in successfully via IMS Authy");
    
    wp_safe_redirect($redirect_url);
    exit;
}

function ims_authy_find_or_create_user($external_id, $email, $name = '') {
    $wp_user_id = null;
    
    // Try to find existing user by email first
    if ($email) {
        $existing = get_user_by('email', $email);
        if ($existing) {
            $wp_user_id = $existing->ID;
        }
    }

    // If no user by email, try meta lookup by external id
    if (!$wp_user_id && $external_id) {
        $users = get_users(array(
            'meta_key' => 'ims_authy_id', 
            'meta_value' => $external_id, 
            'number' => 1
        ));
        if (!empty($users)) {
            $wp_user_id = $users[0]->ID;
        }
    }

    // Create a new user if still not found
    if (!$wp_user_id) {
        $wp_user_id = ims_authy_create_new_user($external_id, $email, $name);
    }
    
    return $wp_user_id;
}

function ims_authy_create_new_user($external_id, $email, $name = '') {
    // Build a username from email or external id
    if ($email) {
        $base = sanitize_user(current(explode('@', $email)));
        if (empty($base)) $base = 'imsuser';
    } elseif ($external_id) {
        $base = 'imsuser_' . preg_replace('/[^a-z0-9_\-]/i', '_', $external_id);
    } else {
        throw new Exception('Cannot provision user: no email or external id provided');
    }

    // Ensure unique username
    $login = $base;
    $suffix = 1;
    while (username_exists($login)) {
        $login = $base . $suffix;
        $suffix++;
    }

    $password = wp_generate_password(24, true);
    $user_email = $email ?? ($external_id . '@ims-auth.local');

    $created = wp_create_user($login, $password, $user_email);
    if (is_wp_error($created)) {
        throw new Exception('Failed to create user: ' . $created->get_error_message());
    }
    
    $wp_user_id = $created;

    // Set display name and ensure default role
    $display_name = $name ?: ($email ?: $login);
    wp_update_user(array(
        'ID' => $wp_user_id, 
        'display_name' => $display_name,
        'first_name' => $name ? current(explode(' ', $name)) : '',
        'last_name' => $name && strpos($name, ' ') ? end(explode(' ', $name)) : ''
    ));
    
    $user = new WP_User($wp_user_id);
    if (empty($user->roles)) {
        $user->set_role(apply_filters('ims_authy_default_role', 'subscriber'));
    }
    
    do_action('ims_authy_user_created', $wp_user_id, $external_id, $email);
    
    return $wp_user_id;
}

// Error handling and logging functions
function ims_authy_callback_error($user_message, $technical_details = '') {
    ims_authy_log_error($technical_details);
    
    // Redirect to login page with error
    $login_url = wp_login_url();
    $error_url = add_query_arg('ims_authy_error', urlencode($user_message), $login_url);
    
    wp_safe_redirect($error_url);
    exit;
}

function ims_authy_log_error($message) {
    if (WP_DEBUG_LOG) {
        error_log('[IMS Authy SSO Error] ' . $message);
    }
    
    // Store in WordPress option for admin review
    $errors = get_option('ims_authy_error_log', []);
    $errors[] = array(
        'timestamp' => current_time('mysql'),
        'message' => $message
    );
    
    // Keep only last 50 errors
    if (count($errors) > 50) {
        $errors = array_slice($errors, -50);
    }
    
    update_option('ims_authy_error_log', $errors);
}

function ims_authy_log_success($message) {
    if (WP_DEBUG_LOG) {
        error_log('[IMS Authy SSO Success] ' . $message);
    }
}

// Display error message on login page
add_action('login_form', function() {
    if (isset($_GET['ims_authy_error'])) {
        $error_message = sanitize_text_field($_GET['ims_authy_error']);
        echo '<div id="login_error">Authentication Error: ' . esc_html($error_message) . '</div>';
    }
});

// Add callback URL rewrite rule for cleaner URLs
add_action('init', function() {
    add_rewrite_rule('^ims-authy-callback/?$', 'index.php?ims_authy_callback=1', 'top');
});

add_filter('query_vars', function($vars) {
    $vars[] = 'ims_authy_callback';
    return $vars;
});

// Admin AJAX to refresh discovery cache
add_action('wp_ajax_ims_authy_refresh_discovery', function() {
    if (!current_user_can('manage_options')) {
        wp_send_json_error('unauthorized', 403);
    }
    // Remove all discovery transients for simplicity
    global $wpdb;
    $keys = array();
    // We don't know exact tenant keys, so scan option_name for transients
    $like = $wpdb->esc_like('_transient_ims_authy_discovery');
    $rows = $wpdb->get_col($wpdb->prepare("SELECT option_name FROM $wpdb->options WHERE option_name LIKE %s", $like . "%"));
    foreach ($rows as $r) {
        // option_name is like '_transient_<key>' or '_transient_timeout_<key>'
        if (preg_match('/_transient_(.+)$/', $r, $m)) {
            $keys[] = $m[1];
        }
    }
    foreach ($keys as $k) {
        delete_transient($k);
    }
    // Re-fetch discovery once with debug info
    $discovery_result = ims_authy_get_discovery(true);
    $d = $discovery_result['data'];
    $debug = $discovery_result['debug'];
    
    if ($d) {
        wp_send_json_success(array(
            'message' => 'Discovery refreshed successfully',
            'debug' => $debug
        ));
    } else {
        wp_send_json_error(array(
            'message' => 'Discovery refresh failed',
            'debug' => $debug
        ));
    }
});

// Show admin notice to complete setup
add_action('admin_notices', function() {
    $tenant_id = get_option('ims_authy_tenant_id');
    $setup_complete = get_option('ims_authy_setup_complete');
    $current_screen = get_current_screen();
    
    // Don't show on the setup page itself
    if ($current_screen && $current_screen->id === 'toplevel_page_ims-authy-setup') {
        return;
    }
    
    if (!$setup_complete || empty($tenant_id)) {
        echo '<div class="notice notice-warning is-dismissible">';
        echo '<p><strong>IMS Authy SSO:</strong> Please complete the plugin setup to enable SSO authentication. ';
        echo '<a href="' . admin_url('admin.php?page=ims-authy-setup') . '" class="button button-primary">Complete Setup</a></p>';
        echo '</div>';
    }
});

// Enqueue simple inline script on the options page to call AJAX
add_action('admin_footer', function() {
    $screen = get_current_screen();
    if ($screen && $screen->id !== 'settings_page_ims-authy-sso') return;
    ?>
    <script>
    (function(){
        var btn = document.getElementById('ims-authy-refresh');
        if (!btn) return;
        btn.addEventListener('click', function(e){
            e.preventDefault();
            var result = document.getElementById('ims-authy-refresh-result');
            result.innerHTML = '<div style="color: blue;">Refreshing...</div>';
            var xhr = new XMLHttpRequest();
            xhr.open('POST', ajaxurl);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.onload = function(){
                try {
                    var j = JSON.parse(xhr.responseText);
                    if (j.success) {
                        result.innerHTML = '<div style="color: green;">' + (j.data.message || 'OK') + '</div>' +
                            '<div style="font-size: 12px; margin-top: 5px;">Page will reload to show updated discovery info...</div>';
                        setTimeout(function() { location.reload(); }, 1500);
                    } else {
                        var html = '<div style="color: red;">' + (j.data.message || 'Failed to refresh discovery') + '</div>';
                        if (j.data.debug && j.data.debug.error) {
                            html += '<div style="font-size: 12px; margin-top: 5px; color: #666;">Error: ' + j.data.debug.error + '</div>';
                        }
                        result.innerHTML = html;
                    }
                } catch(e){ 
                    result.innerHTML = '<div style="color: red;">Unexpected response</div>'; 
                }
            };
            xhr.onerror = function() {
                result.innerHTML = '<div style="color: red;">Request failed</div>';
            };
            xhr.send('action=ims_authy_refresh_discovery');
        });
    })();
    </script>
    <?php
});
