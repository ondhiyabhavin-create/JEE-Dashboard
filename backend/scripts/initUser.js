require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jee-dashboard';

const usersToCreate = [
  {
    username: 'Vedant Ghuge',
    email: 'ghugevedant2005@gmail.com',
    password: 'Admin@123',
    name: 'Vedant Ghuge'
  },
  {
    username: 'Bhavin Ondhiya',
    email: 'ondhiyabhavin@gmail.com',
    password: 'Bhavin@123',
    name: 'Bhavin Ondhiya'
  }
];

async function initUsers() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    for (const userData of usersToCreate) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });
      
      if (existingUser) {
        // Update password if user exists
        existingUser.password = userData.password;
        await existingUser.save();
        console.log(`✅ User password updated: ${userData.name}`);
        console.log(`   Username: ${existingUser.username}`);
        console.log(`   Email: ${existingUser.email}`);
        console.log(`   New Password: ${userData.password}\n`);
        continue;
      }

      // Create user
      const user = new User(userData);
      await user.save();
      console.log(`✅ User created successfully: ${userData.name}`);
      console.log(`   Username: ${userData.username}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Email: ${userData.email}\n`);
    }

    console.log('\n📋 Summary of User Accounts:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Account 1:');
    console.log('  Username: Vedant Ghuge');
    console.log('  Email: ghugevedant2005@gmail.com');
    console.log('  Password: Admin@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Account 2:');
    console.log('  Username: Bhavin Ondhiya');
    console.log('  Email: ondhiyabhavin@gmail.com');
    console.log('  Password: Bhavin@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

initUsers();

