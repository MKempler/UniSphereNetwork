import { v2 } from '@google-cloud/translate';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'my-first-project';

// Debug logging
console.log("=============== TRANSLATION DEBUG INFO ===============");
console.log("Project ID:", projectId);
console.log("Credentials path:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
try {
  const credFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credFile && fs.existsSync(credFile)) {
    const creds = JSON.parse(fs.readFileSync(credFile, 'utf8'));
    console.log("Service account email:", creds.client_email);
    console.log("Project ID in credentials:", creds.project_id);
  } else {
    console.log("Credentials file not found or not specified");
  }
} catch (e) {
  console.error("Error reading credentials:", e);
}
console.log("====================================================");

// Create a client with proper error handling
let translationClient: v2.Translate | null = null;
try {
  console.log("Attempting to initialize Google Cloud Translation client (v2 API)");
  console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
  console.log("GOOGLE_CLOUD_PROJECT_ID:", process.env.GOOGLE_CLOUD_PROJECT_ID);
  
  // Create v2 client instead of v3
  translationClient = new v2.Translate({
    projectId: projectId,
  });
  
  console.log("Google Cloud Translation client initialized successfully");
} catch (error) {
  console.warn("Failed to initialize Google Cloud Translation client:", error);
  console.log("Will use fallback translation functionality");
}

/**
 * Detects the language of the provided text
 * @param text The text to detect language for
 * @returns ISO language code (e.g., 'en', 'es', 'fr')
 */
export async function detectLanguage(text: string): Promise<string> {
  try {
    // Skip API call if client initialization failed
    if (!translationClient) {
      console.log("Using fallback language detection for:", text.substring(0, 30) + "...");
      // Simple fallback - just check for common characters in different languages
      // This is very basic and not accurate, but better than nothing
      
      // Add common Spanish words check
      const spanishWords = /\b(hola|como|estas|que|bien|gracias|buenos|dias|adios|por|favor|si|no|el|la|los|las|un|una|y|en|de|con|para|mi|tu|su|yo|te|se|lo|amigo|casa|vida|amor|tiempo|estoy|tan|cansada|hermosa)\b/i;
      if (spanishWords.test(text)) {
        console.log("Detected Spanish by common words");
        return 'es';
      }
      
      const langPatterns = {
        en: /^[a-zA-Z0-9\s.,!?'"-]+$/,  // English (Latin characters)
        es: /[áéíóúüñ¿¡]/i,             // Spanish
        fr: /[àâçéèêëîïôùûüÿ]/i,        // French
        de: /[äöüß]/i,                  // German
        zh: /[\u4e00-\u9fff]/,          // Chinese
        ja: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/,  // Japanese
        ko: /[\uAC00-\uD7AF\u1100-\u11FF]/,  // Korean
        ru: /[\u0400-\u04FF]/,          // Russian (Cyrillic)
        ar: /[\u0600-\u06FF]/,          // Arabic
      };
      
      for (const [lang, pattern] of Object.entries(langPatterns)) {
        if (pattern.test(text)) {
          return lang;
        }
      }
      
      return 'en';  // Default to English if no pattern matches
    }
    
    // Using Google Cloud Translation v2 API for detection
    try {
      console.log("Detecting language with v2 API for:", text.substring(0, 30) + "...");
      const [detection] = await translationClient.detect(text);
      console.log("Detection result:", detection);
      return detection.language;
    } catch (apiError) {
      console.error("Translation API call failed with error:", apiError);
      console.error("Falling back to pattern matching");
      // Fall back to pattern matching if API call fails
      const spanishWords = /\b(hola|como|estas|que|bien|gracias|buenos|dias|adios|por|favor|si|no|el|la|los|las|un|una|y|en|de|con|para|mi|tu|su|yo|te|se|lo|amigo|casa|vida|amor|tiempo|estoy|tan|cansada|hermosa)\b/i;
      if (spanishWords.test(text)) {
        console.log("Detected Spanish by common words");
        return 'es';
      }
      
      const langPatterns = {
        en: /^[a-zA-Z0-9\s.,!?'"-]+$/,  // English (Latin characters)
        es: /[áéíóúüñ¿¡]/i,             // Spanish
        fr: /[àâçéèêëîïôùûüÿ]/i,        // French
        de: /[äöüß]/i,                  // German
        zh: /[\u4e00-\u9fff]/,          // Chinese
        ja: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/,  // Japanese
        ko: /[\uAC00-\uD7AF\u1100-\u11FF]/,  // Korean
        ru: /[\u0400-\u04FF]/,          // Russian (Cyrillic)
        ar: /[\u0600-\u06FF]/,          // Arabic
      };
      
      for (const [lang, pattern] of Object.entries(langPatterns)) {
        if (pattern.test(text)) {
          return lang;
        }
      }
      
      return 'en';  // Default to English if no pattern matches
    }
  } catch (error) {
    console.error("Language detection failed:", error);
    // Default to English if detection fails
    return 'en';
  }
}

/**
 * Translates text from source language to target language
 * @param text Text to translate
 * @param sourceLanguage Source language code (or 'auto' for auto-detection)
 * @param targetLanguage Target language code
 * @returns Translated text
 */
export async function translateText(
  text: string,
  sourceLanguage: string = 'auto',
  targetLanguage: string
): Promise<string> {
  try {
    // Skip translation if source and target are the same
    if (sourceLanguage === targetLanguage && sourceLanguage !== 'auto') {
      return text;
    }
    
    // Skip API call if client initialization failed
    if (!translationClient) {
      console.log("Using fallback translation (no change) for:", text.substring(0, 30) + "...");
      return text; // Just return the original text as fallback
    }
    
    // Using Google Cloud Translation v2 API
    try {
      console.log(`Translating with v2 API from ${sourceLanguage} to ${targetLanguage}: ${text.substring(0, 30)}...`);
      
      const options: {[key: string]: any} = {
        to: targetLanguage,
      };
      
      // Add source language if it's not 'auto'
      if (sourceLanguage !== 'auto') {
        options.from = sourceLanguage;
      }
      
      const [translation] = await translationClient.translate(text, options);
      console.log(`Translation result: ${translation}`);
      return translation;
    } catch (apiError) {
      console.error("Translation API call failed:", apiError);
      // Return original if translation fails
      return text;
    }
  } catch (error) {
    console.error("Translation failed:", error);
    // Return original text if translation fails
    return text;
  }
} 