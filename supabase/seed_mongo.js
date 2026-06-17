const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Parse .env.local manually to load MONGODB_URI on any Node version
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    envFile.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2 && !line.trim().startsWith('#')) {
        process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
  }
} catch (e) {}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quickfix';
const dbName = uri.includes('/cluster') || uri.includes('.net/') ? undefined : 'quickfix';

// Hashed version of 'password123'
const passwordHash = '$2b$10$TQUpXy1bLzC9R00LSCB8aeQQKGUQO/NUUnqo2mXQGy70c6qAB9ni.';

const defaultCategories = [
  {
    id: 'cat-1',
    name: 'Cleaning',
    icon: 'Sparkles',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: 'Plumbing',
    icon: 'Wrench',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-3',
    name: 'Electrician',
    icon: 'Zap',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-4',
    name: 'Appliance Repair',
    icon: 'Cpu',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-5',
    name: 'Painting',
    icon: 'Paintbrush',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-6',
    name: 'Pest Control',
    icon: 'Bug',
    created_at: new Date().toISOString(),
  },
];

const defaultUsers = [
  {
    id: 'admin-1',
    role: 'admin',
    full_name: 'Admin Moderation',
    mobile_number: '9999999999',
    email: 'admin@quickfix.com',
    password_hash: passwordHash,
    profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin',
    is_suspended: false,
    created_at: new Date().toISOString(),
    addresses: [],
    latitude: 23.0225,
    longitude: 72.5714,
    verification_status: 'verified',
    kyc_status: 'verified'
  },
  {
    id: 'customer-1',
    role: 'customer',
    full_name: 'Alice Customer',
    mobile_number: '1111111111',
    email: 'customer@quickfix.com',
    password_hash: passwordHash,
    profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice',
    is_suspended: false,
    created_at: new Date().toISOString(),
    addresses: [
      { id: 'addr-1', label: 'Home', area: 'A-402 Shrinand Nagar, Sector 21', city: 'Gandhinagar' },
      { id: 'addr-2', label: 'Work', area: 'GIFT City, Tower II, Block C', city: 'Gandhinagar' }
    ],
    latitude: 23.0225,
    longitude: 72.5714,
    verification_status: 'verified',
    kyc_status: 'verified'
  },
  {
    id: 'provider-1',
    role: 'provider',
    full_name: 'Bob Provider',
    mobile_number: '2222222222',
    email: 'provider@quickfix.com',
    password_hash: passwordHash,
    profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bob',
    is_suspended: false,
    created_at: new Date().toISOString(),
    addresses: [],
    service_category: 'Cleaning',
    rating: 4.8,
    latitude: 23.0240,
    longitude: 72.5720,
    verification_status: 'verified',
    kyc_status: 'verified',
    completed_orders_count: 65 // Bronze badge
  },
  {
    id: 'provider-2',
    role: 'provider',
    full_name: 'Charlie Silver',
    mobile_number: '3333333333',
    email: 'charlie@quickfix.com',
    password_hash: passwordHash,
    profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Charlie',
    is_suspended: false,
    created_at: new Date().toISOString(),
    addresses: [],
    service_category: 'Cleaning',
    rating: 4.9,
    latitude: 23.0250,
    longitude: 72.5730,
    verification_status: 'verified',
    kyc_status: 'verified',
    completed_orders_count: 275 // Silver badge
  },
  {
    id: 'provider-3',
    role: 'provider',
    full_name: 'Daniel Gold',
    mobile_number: '4444444444',
    email: 'daniel@quickfix.com',
    password_hash: passwordHash,
    profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Daniel',
    is_suspended: false,
    created_at: new Date().toISOString(),
    addresses: [],
    service_category: 'Cleaning',
    rating: 5.0,
    latitude: 23.0210,
    longitude: 72.5700,
    verification_status: 'verified',
    kyc_status: 'verified',
    completed_orders_count: 530 // Gold badge
  },
  {
    id: 'provider-4',
    role: 'provider',
    full_name: 'Edward Platinum',
    mobile_number: '5555555555',
    email: 'edward@quickfix.com',
    password_hash: passwordHash,
    profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Edward',
    is_suspended: false,
    created_at: new Date().toISOString(),
    addresses: [],
    service_category: 'Cleaning',
    rating: 4.7,
    latitude: 23.0270,
    longitude: 72.5740,
    verification_status: 'verified',
    kyc_status: 'verified',
    completed_orders_count: 1050 // Platinum badge
  }
];

const defaultWallets = [
  {
    id: 'wallet-bob',
    provider_id: 'provider-1',
    balance: 1500.00,
    held_amount: 0.00,
    available_amount: 1500.00,
  },
  {
    id: 'wallet-charlie',
    provider_id: 'provider-2',
    balance: 2500.00,
    held_amount: 0.00,
    available_amount: 2500.00,
  },
  {
    id: 'wallet-daniel',
    provider_id: 'provider-3',
    balance: 3500.00,
    held_amount: 0.00,
    available_amount: 3500.00,
  },
  {
    id: 'wallet-edward',
    provider_id: 'provider-4',
    balance: 5500.00,
    held_amount: 0.00,
    available_amount: 5500.00,
  }
];

async function seed() {
  console.log(`Connecting to MongoDB at: ${uri}`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`Successfully connected to database: ${db.databaseName}`);

    const collections = [
      'users',
      'service_categories',
      'service_requests',
      'request_images',
      'provider_accepts',
      'orders',
      'wallets',
      'wallet_transactions',
      'chat_rooms',
      'chat_messages',
      'disputes',
      'user_otps',
    ];

    // 1. Drop existing collections to ensure fresh seed
    for (const colName of collections) {
      try {
        await db.collection(colName).drop();
        console.log(`Dropped collection: ${colName}`);
      } catch (e) {
        // Collection might not exist, ignore
      }
    }

    // 2. Insert Service Categories
    console.log('Seeding service categories...');
    await db.collection('service_categories').insertMany(defaultCategories);

    // 3. Insert Default Users
    console.log('Seeding default users...');
    await db.collection('users').insertMany(defaultUsers);

    // 4. Insert Default Wallets
    console.log('Seeding default wallets...');
    await db.collection('wallets').insertMany(defaultWallets);

    console.log('MongoDB Database Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding MongoDB database:', error);
  } finally {
    await client.close();
  }
}

seed();
