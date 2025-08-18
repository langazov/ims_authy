// MongoDB initialization script
// This script runs when MongoDB container starts for the first time

// Switch to the OAuth2 database
db = db.getSiblingDB('oauth2_server');

// Create collections with indexes for better performance
db.createCollection('users');
db.createCollection('groups'); 
db.createCollection('clients');
db.createCollection('authorization_codes');
db.createCollection('access_tokens');
db.createCollection('refresh_tokens');

// Create indexes for better query performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "active": 1 });
db.users.createIndex({ "created_at": 1 });

db.groups.createIndex({ "name": 1 }, { unique: true });
db.groups.createIndex({ "members": 1 });

db.clients.createIndex({ "client_id": 1 }, { unique: true });
db.clients.createIndex({ "active": 1 });
db.clients.createIndex({ "created_at": 1 });

db.authorization_codes.createIndex({ "code": 1 }, { unique: true });
db.authorization_codes.createIndex({ "client_id": 1 });
db.authorization_codes.createIndex({ "user_id": 1 });
db.authorization_codes.createIndex({ "expires_at": 1 });
db.authorization_codes.createIndex({ "used": 1 });

db.access_tokens.createIndex({ "token": 1 }, { unique: true });
db.access_tokens.createIndex({ "client_id": 1 });
db.access_tokens.createIndex({ "user_id": 1 });
db.access_tokens.createIndex({ "expires_at": 1 });
db.access_tokens.createIndex({ "revoked": 1 });
db.access_tokens.createIndex({ "created_at": 1 });

db.refresh_tokens.createIndex({ "token": 1 }, { unique: true });
db.refresh_tokens.createIndex({ "access_token": 1 });
db.refresh_tokens.createIndex({ "client_id": 1 });
db.refresh_tokens.createIndex({ "user_id": 1 });
db.refresh_tokens.createIndex({ "expires_at": 1 });
db.refresh_tokens.createIndex({ "revoked": 1 });

// Create a default admin user (password: password)
// Password hash for "password" using bcrypt
// db.users.insertOne({
//     email: "admin@oauth2server.local",
//     username: "admin",
//     password_hash: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
//     first_name: "Admin",
//     last_name: "User",
//     groups: ["administrators"],
//     scopes: ["read", "write", "admin"],
//     active: true,
//     created_at: new Date(),
//     updated_at: new Date()
// });

// // Create default admin group
// db.groups.insertOne({
//     name: "administrators",
//     description: "System administrators with full access",
//     scopes: ["read", "write", "admin", "user_management", "client_management"],
//     members: [],
//     created_at: new Date(),
//     updated_at: new Date()
// });

// // Create default user group
// db.groups.insertOne({
//     name: "users",
//     description: "Standard users with read/write access",
//     scopes: ["read", "write"],
//     members: [],
//     created_at: new Date(),
//     updated_at: new Date()
// });

// // Create a default OAuth2 client for testing
// db.clients.insertOne({
//     client_id: "test-client-id",
//     client_secret: "test-client-secret",
//     name: "Test OAuth2 Client",
//     description: "Default test client for development",
//     redirect_uris: [
//         "http://localhost:3000/callback",
//         "http://localhost:3000/auth/callback",
//         "https://oauth.pstmn.io/v1/callback"
//     ],
//     scopes: ["read", "write", "openid", "profile", "email"],
//     grant_types: ["authorization_code", "refresh_token"],
//     active: true,
//     created_at: new Date(),
//     updated_at: new Date()
// });

// print('OAuth2 Server database initialized successfully!');
// print('Default admin user: admin@oauth2server.local / password');
// print('Default test client: test-client-id / test-client-secret');