-- Row Level Security (RLS) Policies for QuickFix

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_accepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_otps ENABLE ROW LEVEL SECURITY;

-- 1. USERS POLICIES
-- Anyone authenticated can view other users' profile details (for chats, dashboards)
CREATE POLICY select_users ON users
  FOR SELECT TO authenticated
  USING (true);

-- Users can update only their own profile
CREATE POLICY update_users ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins have full access
CREATE POLICY admin_users ON users
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 2. SERVICE CATEGORIES POLICIES
-- Anyone authenticated can view categories
CREATE POLICY select_categories ON service_categories
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can modify categories
CREATE POLICY admin_categories ON service_categories
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 3. SERVICE REQUESTS POLICIES
-- Customers can manage their own requests
CREATE POLICY customer_requests ON service_requests
  FOR ALL TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Providers can read all requests (to browse nearby work)
CREATE POLICY provider_view_requests ON service_requests
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'provider'));

-- Admins have full access
CREATE POLICY admin_requests ON service_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 4. REQUEST IMAGES POLICIES
-- Anyone authenticated can view request images
CREATE POLICY select_request_images ON request_images
  FOR SELECT TO authenticated
  USING (true);

-- Customers can upload images for their requests
CREATE POLICY insert_request_images ON request_images
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM service_requests WHERE id = request_id AND customer_id = auth.uid()));

-- Admins have full access
CREATE POLICY admin_request_images ON request_images
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 5. PROVIDER ACCEPTS POLICIES
-- Providers can manage their own accepts
CREATE POLICY provider_accepts ON provider_accepts
  FOR ALL TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Customers can view accepts for their own requests
CREATE POLICY customer_view_accepts ON provider_accepts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM service_requests WHERE id = request_id AND customer_id = auth.uid()));

-- Admins have full access
CREATE POLICY admin_provider_accepts ON provider_accepts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 6. ORDERS POLICIES
-- Both customer and provider can view and update their order
CREATE POLICY order_parties ON orders
  FOR ALL TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid())
  WITH CHECK (customer_id = auth.uid() OR provider_id = auth.uid());

-- Admins have full access
CREATE POLICY admin_orders ON orders
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 7. WALLETS POLICIES
-- Providers can read their own wallet balance
CREATE POLICY provider_wallet ON wallets
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

-- Admins have full access
CREATE POLICY admin_wallets ON wallets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 8. WALLET TRANSACTIONS POLICIES
-- Providers can read their own transactions
CREATE POLICY provider_transactions ON wallet_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM wallets WHERE id = wallet_id AND provider_id = auth.uid()));

-- Admins have full access
CREATE POLICY admin_transactions ON wallet_transactions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 9. CHAT ROOMS POLICIES
-- Order participants can view chat rooms
CREATE POLICY chat_room_parties ON chat_rooms
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (customer_id = auth.uid() OR provider_id = auth.uid())));

-- Admins have full access
CREATE POLICY admin_chat_rooms ON chat_rooms
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 10. CHAT MESSAGES POLICIES
-- Room members can read and write chat messages
CREATE POLICY chat_message_parties ON chat_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_rooms r
      JOIN orders o ON r.order_id = o.id
      WHERE r.id = room_id AND (o.customer_id = auth.uid() OR o.provider_id = auth.uid())
    )
  )
  WITH CHECK (sender_id = auth.uid());

-- Admins have full access
CREATE POLICY admin_chat_messages ON chat_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 11. DISPUTES POLICIES
-- Customers can create and view disputes for their orders
CREATE POLICY customer_disputes ON disputes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid()));

-- Admins have full access
CREATE POLICY admin_disputes ON disputes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 12. OTP VERIFICATION POLICIES
-- OTPs are only accessed via secure Next.js Server Route Handlers; restrict direct client access
CREATE POLICY admin_otps ON user_otps
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
