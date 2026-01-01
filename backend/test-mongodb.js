const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  const mongoURI = process.env.MONGODB_URI;
  
  if (!mongoURI) {
    console.error('❌ MONGODB_URI not found in .env file');
    process.exit(1);
  }

  console.log('🔍 Testing MongoDB connection...');
  console.log('Connection string:', mongoURI.replace(/:[^:@]+@/, ':****@'));
  
  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ Connection successful!');
    console.log('Database:', mongoose.connection.db.databaseName);
    console.log('Host:', mongoose.connection.host);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', err.message);
    
    if (err.message.includes('authentication')) {
      console.log('\n🔧 Authentication Error - Check:');
      console.log('1. Username and password in connection string');
      console.log('2. Database user exists in MongoDB Atlas');
      console.log('3. User has proper permissions');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.log('\n🔧 Network Error - Check:');
      console.log('1. Internet connection');
      console.log('2. MongoDB Atlas cluster is running');
      console.log('3. Cluster URL is correct');
    } else if (err.message.includes('timeout')) {
      console.log('\n🔧 Timeout Error - Check:');
      console.log('1. IP address is whitelisted in MongoDB Atlas');
      console.log('2. Network firewall settings');
      console.log('3. Try adding 0.0.0.0/0 to IP whitelist for testing');
    }
    
    process.exit(1);
  }
};

testConnection();

