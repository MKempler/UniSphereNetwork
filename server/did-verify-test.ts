import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto && typeof window === 'undefined') globalThis.crypto = webcrypto;

import { generateKeyPair, sign, verify as ionVerify } from '@decentralized-identity/ion-tools';

async function testDidVerification() {
  console.log('[TEST] Starting DID verification test...');
  try {
    // 1. Generate a key pair
    const { privateJwk, publicJwk } = await generateKeyPair('secp256k1');
    console.log('[TEST] Generated publicJwk:', JSON.stringify(publicJwk));
    console.log('[TEST] Generated privateJwk (d property):', privateJwk.d ? 'Exists' : 'Missing');

    // Simulate the server storing and retrieving the public key
    const stringifiedPublicJwk = JSON.stringify(publicJwk);
    console.log('[TEST] Stringified publicJwk for simulation:', stringifiedPublicJwk);
    const parsedPublicJwk = JSON.parse(stringifiedPublicJwk);
    console.log('[TEST] Parsed publicJwk after simulation:', JSON.stringify(parsedPublicJwk));
    console.log('[TEST] typeof parsedPublicJwk.crv:', typeof parsedPublicJwk.crv);

    // 2. Define a payload (challenge)
    const payload = 'test-challenge-string-' + Date.now();
    console.log('[TEST] Payload to sign:', payload);

    // 3. Sign the payload
    const jws = await sign({ payload, privateJwk });
    console.log('[TEST] Generated JWS:', jws);

    // 4. Verify the JWS
    console.log('[TEST] Attempting to verify JWS with publicJwk:', JSON.stringify(publicJwk));
    console.log('[TEST] Attempting to verify JWS with PARSED publicJwk:', JSON.stringify(parsedPublicJwk));
    let verifiedPayload;
    try {
      verifiedPayload = await ionVerify({ jws, publicKeyJwk: parsedPublicJwk });
      console.log('[TEST] ionVerify returned:', verifiedPayload);
    } catch (verificationError) {
      console.error('[TEST] ionVerify FAILED:', verificationError);
      return;
    }

    // 5. Check if verified payload matches original
    if (verifiedPayload === payload) {
      console.log('[TEST] SUCCESS: Verified payload matches original payload!');
    } else {
      console.error('[TEST] FAILURE: Verified payload does NOT match original payload.');
      console.error('[TEST] Expected:', payload);
      console.error('[TEST] Got:', verifiedPayload);
    }

  } catch (error) {
    console.error('[TEST] An unexpected error occurred during the test:', error);
  }
}

testDidVerification(); 