const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jee-dashboard';

async function dropOldIndexes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('syllabuses');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Drop the old 'topic_1' index if it exists
    try {
      await collection.dropIndex('topic_1');
      console.log('✅ Dropped old index: topic_1');
    } catch (err) {
      if (err.code === 27 || err.message?.includes('index not found')) {
        console.log('ℹ️  Index topic_1 does not exist, skipping...');
      } else {
        throw err;
      }
    }

    // List remaining indexes
    const remainingIndexes = await collection.indexes();
    console.log('Remaining indexes:', remainingIndexes.map(idx => idx.name));

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropOldIndexes();

