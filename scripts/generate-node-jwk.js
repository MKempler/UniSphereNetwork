// Script to generate a real EC (P-256) JWK keypair for your node identity
// Usage: node scripts/generate-node-jwk.js
// Copy the public JWK to your .env as NODE_PUBLIC_KEY
// Save the private JWK somewhere safe for signing

import { generateKeyPairSync } from 'crypto';
import { exportJWK } from 'jose';

(async () => {
  // Generate an extractable EC (P-256) keypair
  const { publicKey, privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });

  const publicJwk = await exportJWK(publicKey);
  const privateJwk = await exportJWK(privateKey);

  console.log('Public JWK (NODE_PUBLIC_KEY):');
  console.log(JSON.stringify(publicJwk, null, 2));
  console.log('\nPrivate JWK (save this securely!):');
  console.log(JSON.stringify(privateJwk, null, 2));
})(); 