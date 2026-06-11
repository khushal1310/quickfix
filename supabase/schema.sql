-- Supabase Schema for QuickFix Service Marketplace

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'provider', 'admin')),
  full_name TEXT NOT NULL,
  mobile_number VARCHAR(20) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_image TEXT,
  is_suspended BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SERVICE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL, -- Name of Lucide Icon
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- SERVICE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT NOT NULL,
  budget NUMERIC,
  status VARCHAR(20) DEFAULT 'OPEN' NOT NULL CHECK (
    status IN ('OPEN', 'ACCEPTED', 'SELECTED', 'IN_PROGRESS', 'COMPLETED', 'AUTOCOMPLETED', 'DISPUTED', 'CANCELLED')
  ),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- REQUEST IMAGES TABLE
CREATE TABLE IF NOT EXISTS request_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL
);

-- PROVIDER ACCEPTS TABLE
CREATE TABLE IF NOT EXISTS provider_accepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'ACCEPTED' NOT NULL CHECK (status IN ('ACCEPTED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(request_id, provider_id)
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE UNIQUE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'SELECTED' NOT NULL CHECK (
    status IN ('SELECTED', 'IN_PROGRESS', 'COMPLETED', 'AUTOCOMPLETED', 'DISPUTED', 'CANCELLED')
  ),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- WALLETS TABLE
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC DEFAULT 0.00 NOT NULL,
  held_amount NUMERIC DEFAULT 0.00 NOT NULL,
  available_amount NUMERIC DEFAULT 0.00 NOT NULL
);

-- WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Credit', 'Debit', 'Hold', 'Release', 'Fee Deduction')),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- CHAT ROOMS TABLE
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE
);

-- CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- DISPUTES TABLE
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'RESOLVED')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- OTP VERIFICATION TABLE
CREATE TABLE IF NOT EXISTS user_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile_number VARCHAR(20) UNIQUE NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('REGISTER', 'RESET')),
  temp_user_data JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- TRIGGERS & FUNCTIONS

-- Trigger to create a wallet automatically when a new provider is inserted
CREATE OR REPLACE FUNCTION create_provider_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'provider' THEN
    INSERT INTO wallets (provider_id, balance, held_amount, available_amount)
    VALUES (NEW.id, 0.00, 0.00, 0.00)
    ON CONFLICT (provider_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_create_provider_wallet
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_provider_wallet();

-- Seed service categories
INSERT INTO service_categories (name, icon) VALUES
  ('Cleaning', 'Sparkles'),
  ('Plumbing', 'Wrench'),
  ('Electrician', 'Zap'),
  ('Appliance Repair', 'Cpu'),
  ('Painting', 'Paintbrush'),
  ('Pest Control', 'Bug')
ON CONFLICT (name) DO NOTHING;
