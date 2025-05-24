const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Setting up messaging demo...');

try {
  // Run the migration to enhance messaging
  console.log('📊 Running database migration...');
  execSync('npx drizzle-kit push', { stdio: 'inherit' });
  
  console.log('✅ Messaging setup complete!');
  console.log('');
  console.log('🎯 What\'s new:');
  console.log('  • Message reactions (👍 ❤️ 😂 etc.)');
  console.log('  • Reply to messages');
  console.log('  • File and image sharing');
  console.log('  • Group chat management');
  console.log('  • Message search');
  console.log('');
  console.log('💡 To test:');
  console.log('  1. Start the server: npm run dev');
  console.log('  2. Go to /messages in your app');
  console.log('  3. Click the + button to start a new conversation');
  console.log('  4. Search for users to message');
  
} catch (error) {
  console.error('❌ Error setting up messaging:', error.message);
  console.log('');
  console.log('🔧 Manual setup:');
  console.log('  1. Run: npx drizzle-kit push');
  console.log('  2. Make sure your database is running');
} 