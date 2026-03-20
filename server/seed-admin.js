// seed-admin.js - Run this once to create the admin account
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: 'admin@sakshamai.com' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    name: 'SakshamAI Admin',
    email: 'admin@sakshamai.com',
    password: 'Admin@123',
    role: 'admin'
  });

  console.log('✅ Admin created:', admin.email);
  console.log('   Email: admin@sakshamai.com');
  console.log('   Password: Admin@123');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
