const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local to run the seed script.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function seed() {
  console.log('Starting QuickFix database seed...');

  try {
    // 1. Seed Categories (ensure they exist)
    const categories = [
      { name: 'Cleaning', icon: 'Sparkles' },
      { name: 'Plumbing', icon: 'Wrench' },
      { name: 'Electrician', icon: 'Zap' },
      { name: 'Appliance Repair', icon: 'Cpu' },
      { name: 'Painting', icon: 'Paintbrush' },
      { name: 'Pest Control', icon: 'Bug' }
    ];

    console.log('Seeding service categories...');
    for (const cat of categories) {
      const { error } = await supabaseAdmin
        .from('service_categories')
        .upsert(cat, { onConflict: 'name' });
      if (error) console.error(`Error inserting category ${cat.name}:`, error.message);
    }

    // 2. Seed Users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const seedUsers = [
      {
        role: 'admin',
        full_name: 'Admin Moderation',
        mobile_number: '9999999999',
        password_hash: passwordHash,
        profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Admin'
      },
      {
        role: 'customer',
        full_name: 'Alice Customer',
        mobile_number: '1111111111',
        password_hash: passwordHash,
        profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alice'
      },
      {
        role: 'provider',
        full_name: 'Bob Provider',
        mobile_number: '2222222222',
        password_hash: passwordHash,
        profile_image: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Bob'
      }
    ];

    console.log('Seeding user accounts...');
    for (const u of seedUsers) {
      const { error } = await supabaseAdmin
        .from('users')
        .upsert(u, { onConflict: 'mobile_number' });
      if (error) {
        console.error(`Error seeding user ${u.full_name}:`, error.message);
      } else {
        console.log(`Seeded user: ${u.full_name} (${u.role}) - Phone: ${u.mobile_number}, Password: password123`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seed execution failed:', err);
  }
}

seed();
