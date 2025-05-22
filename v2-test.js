// Simple test using the v2 API instead of v3
require('dotenv').config();
const {Translate} = require('@google-cloud/translate').v2;

// Your credentials will be detected automatically from GOOGLE_APPLICATION_CREDENTIALS env var
const translate = new Translate({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

async function quickStart() {
  console.log("V2 API TEST");
  console.log("Project ID:", process.env.GOOGLE_CLOUD_PROJECT_ID);
  console.log("Credentials:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
  
  try {
    // Detect language
    console.log("Testing language detection...");
    const text = 'Hello, world!';
    const [detection] = await translate.detect(text);
    console.log(`Detected language: ${detection.language}`);
    
    // Translate text
    console.log("\nTesting translation...");
    const target = 'es';
    const [translation] = await translate.translate(text, target);
    console.log(`Translation: ${translation}`);
    
    console.log("\nSUCCESS - V2 API is working!");
  } catch (error) {
    console.error("ERROR:", error);
    
    if (error.message && error.message.includes("API has not been used")) {
      console.error("\nERROR: You need to enable the Cloud Translation API for this project.");
      console.error("Go to: https://console.cloud.google.com/apis/library/translate.googleapis.com?project=" + process.env.GOOGLE_CLOUD_PROJECT_ID);
    }
    
    if (error.message && error.message.includes("PERMISSION_DENIED")) {
      console.error("\nERROR: Permission denied. This usually means:");
      console.error("1. The service account doesn't have the necessary permissions");
      console.error("2. The API is not enabled");
      console.error("3. There might be an issue with billing");
      console.error("\nTry generating a new service account key and use that instead.");
    }
  }
}

quickStart(); 