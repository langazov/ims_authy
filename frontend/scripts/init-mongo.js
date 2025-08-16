// MongoDB initialization script for OAuth2 server
db = db.getSiblingDB('oauth2_server');

// Create collections
db.createCollection('users');
db.createCollection('groups');
db.createCollection('clients');
db.createCollection('authorization_codes');
db.createCollection('access_tokens');
db.createCollection('refresh_tokens');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.clients.createIndex({ "client_id": 1 }, { unique: true });
db.authorization_codes.createIndex({ "code": 1 }, { unique: true });
db.authorization_codes.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
db.access_tokens.createIndex({ "token": 1 }, { unique: true });
db.access_tokens.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
db.refresh_tokens.createIndex({ "token": 1 }, { unique: true });

print('OAuth2 database initialized successfully');