const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './env.config' });

console.log('Testing MongoDB connection...');
console.log('Connection string:', process.env.MONGODB_URI);

// Test connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ Successfully connected to MongoDB Atlas!');
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB connection failed:');
  console.error(err.message);
  
  if (err.code === 8000) {
    console.log('\n🔍 This is an authentication error. Please check:');
    console.log('1. Username and password are correct');
    console.log('2. User exists in MongoDB Atlas Database Access');
    console.log('3. User has proper permissions');
  }
  
  process.exit(1);
}); 