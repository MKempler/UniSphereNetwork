// ION DID and key management utility for UniSphere
// Uses @decentralized-identity/ion-tools for standards-compliant did:ion
// Client-side keypair generation and storage

// @ts-ignore: No type definitions for @decentralized-identity/ion-tools
import * as IonSdk from '@decentralized-identity/ion-tools';
console.log("[did.ts] Imported IonSdk object:", IonSdk);

// Log the DID property specifically
if (IonSdk && IonSdk.DID) {
  console.log("[did.ts] IonSdk.DID object:", IonSdk.DID);
  console.log("[did.ts] typeof IonSdk.DID.createLongFormDid:", typeof IonSdk.DID.createLongFormDid);
} else {
  console.log("[did.ts] IonSdk.DID is not available.");
}

const LOCAL_KEY_STORAGE = 'unisphere_private_key';

export async function generateKeyPair() {
  console.log("[did.ts] Attempting to generate key pair using IonSdk.generateKeyPair...");
  if (typeof IonSdk.generateKeyPair === 'function') {
    const keyPair = await IonSdk.generateKeyPair('secp256k1');
    console.log("[did.ts] Key pair generated via IonSdk.generateKeyPair:", keyPair);
    return keyPair;
  } else {
    console.error("[did.ts] IonSdk.generateKeyPair is not a function. IonSdk keys:", IonSdk ? Object.keys(IonSdk) : "N/A");
    throw new Error("generateKeyPair function not found in @decentralized-identity/ion-tools");
  }
}

export async function createIonDid(publicJwk: JsonWebKey) {
  console.log("[did.ts] Attempting to create ION DID with publicJwk (using new IonSdk.DID() and instance.getURI()):", publicJwk);

  if (IonSdk.DID && typeof IonSdk.DID === 'function') { // Check if DID is a class (constructor function)
    console.log("[did.ts] IonSdk.DID is a class. Attempting to instantiate...");
    try {
      const didInstance = new IonSdk.DID({
        content: {
          publicKeys: [
            {
              id: 'key-1',
              type: 'EcdsaSecp256k1VerificationKey2019',
              publicKeyJwk: publicJwk,
              purposes: ['authentication', 'assertionMethod']
            }
          ],
          services: []
        }
      });
      console.log("[did.ts] IonSdk.DID instance created:", didInstance);
      console.log("[did.ts] typeof didInstance.getURI:", typeof didInstance.getURI);

      if (typeof didInstance.getURI === 'function') {
        const longFormDid = await didInstance.getURI(); // Default is long-form DID
        console.log("[did.ts] ION Long-Form DID created via didInstance.getURI():", longFormDid);
        return longFormDid;
      } else {
        console.error("[did.ts] getURI is not a function on IonSdk.DID instance.");
        if (didInstance) {
            console.error("[did.ts] Keys of didInstance (prototype chain might be more relevant for methods):", Object.keys(didInstance), "Instance itself:", didInstance);
        }
        throw new Error("getURI is not a function on IonSdk.DID instance.");
      }
    } catch (error) {
      console.error("[did.ts] Error during IonSdk.DID instantiation or instance.getURI() call:", error);
      throw error; // Re-throw to be caught by generateDidAndStoreKey
    }
  } else {
    console.error("[did.ts] IonSdk.DID is not a class/constructor. IonSdk.DID:", IonSdk.DID);
    throw new Error("IonSdk.DID is not a constructor in @decentralized-identity/ion-tools");
  }
}

export function storePrivateKey(privateJwk: JsonWebKey) {
  // Store the private key in localStorage (MVP; migrate to secure storage for production)
  localStorage.setItem(LOCAL_KEY_STORAGE, JSON.stringify(privateJwk));
}

export function loadPrivateKey(): JsonWebKey | null {
  const key = localStorage.getItem(LOCAL_KEY_STORAGE);
  if (!key) return null;
  try {
    return JSON.parse(key);
  } catch {
    return null;
  }
}

export function clearPrivateKey() {
  localStorage.removeItem(LOCAL_KEY_STORAGE);
}

// Example: Full DID registration flow
export async function generateDidAndStoreKey() {
  try {
    console.log("[did.ts] Entering generateDidAndStoreKey...");
    const { publicJwk, privateJwk } = await generateKeyPair();
    console.log("[did.ts] publicJwk:", publicJwk, "privateJwk:", privateJwk);
    const did = await createIonDid(publicJwk);
    console.log("[did.ts] Storing private key...");
    storePrivateKey(privateJwk);
    console.log("[did.ts] Private key stored. DID and publicJwk ready.");
    return { did, publicJwk }; // did here is the long-form URI string
  } catch (e) {
    console.error("[did.ts] Error in generateDidAndStoreKey:", e);
    if (e instanceof Error && (e.message.includes("getURI is not a function") || e.message.includes("IonSdk.DID is not a constructor"))) {
        console.error("[did.ts] Detailed IonSdk object during error:", IonSdk);
        if (IonSdk && IonSdk.DID) {
            console.error("[did.ts] Detailed IonSdk.DID (class/constructor) object during error:", IonSdk.DID);
        }
    }
    throw e; // Re-throw the error to be caught by the registration form
  }
}

// Export the private key as a JSON string for backup/migration
export function exportPrivateKey(): string | null {
  const key = loadPrivateKey();
  if (!key) return null;
  return JSON.stringify(key);
}

// Import a private key from a JSON string (for migration/restore)
export function importPrivateKey(json: string): boolean {
  try {
    const key = JSON.parse(json);
    storePrivateKey(key);
    return true;
  } catch {
    return false;
  }
} 