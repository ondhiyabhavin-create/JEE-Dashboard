const mongoose = require('mongoose');
require('dotenv').config();

const dropOldIndex = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jee-dashboard';
    
    // Ensure database name is in the connection string
    let connectionString = mongoURI;
    if (mongoURI.includes('mongodb+srv://')) {
      const dbMatch = mongoURI.match(/mongodb\+srv:\/\/[^@]+@[^\/]+\/([^?]+)/);
      if (!dbMatch) {
        connectionString = mongoURI.endsWith('/') 
          ? mongoURI + 'jee-dashboard' 
          : mongoURI + '/jee-dashboard';
      }
    }

    await mongoose.connect(connectionString);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('studenttopicstatuses');

    // List all indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Drop the old index if it exists
    const oldIndexName = 'studentId_1_topicId_1_subtopicName_1';
    try {
      await collection.dropIndex(oldIndexName);
      console.log(`\n✅ Successfully dropped old index: ${oldIndexName}`);
    } catch (err) {
      if (err.code === 27 || err.codeName === 'IndexNotFound') {
        console.log(`\nℹ️  Index ${oldIndexName} does not exist (already removed or never created)`);
      } else {
        throw err;
      }
    }

    // Verify the current index exists
    const currentIndexes = await collection.indexes();
    const hasCorrectIndex = currentIndexes.some(idx => 
      idx.name === 'studentId_1_subject_1_topicName_1_subtopicName_1' ||
      (idx.key && idx.key.studentId && idx.key.subject && idx.key.topicName && idx.key.subtopicName)
    );

    if (hasCorrectIndex) {
      console.log('✅ Correct index exists');
    } else {
      console.log('⚠️  Warning: Correct index may not exist. The model should create it automatically.');
    }

    console.log('\n✅ Script completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

dropOldIndex();

