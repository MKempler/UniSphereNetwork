import { TranslationServiceClient } from '@google-cloud/translate';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

async function main() {
  console.log("=== TRANSLATION API TEST ===");
  // Read and validate environment variables
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  console.log("Project ID:", projectId);
  console.log("Credentials path:", credentialsPath);
  
  if (!projectId) {
    console.error("ERROR: GOOGLE_CLOUD_PROJECT_ID not set in .env file");
    process.exit(1);
  }
  
  if (!credentialsPath) {
    console.error("ERROR: GOOGLE_APPLICATION_CREDENTIALS not set in .env file");
    process.exit(1);
  }
  
  if (!fs.existsSync(credentialsPath)) {
    console.error(`ERROR: Credentials file not found at path: ${credentialsPath}`);
    process.exit(1);
  }
  
  try {
    const credentialData = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    console.log("Service Account Email:", credentialData.client_email);
    console.log("Project ID in credentials:", credentialData.project_id);
    
    if (credentialData.project_id !== projectId) {
      console.warn("WARNING: Project ID in credentials doesn't match GOOGLE_CLOUD_PROJECT_ID in .env");
    }
  } catch (e) {
    console.error("ERROR: Failed to parse credentials file:", e);
    process.exit(1);
  }
  
  // Test API connection
  console.log("\nTesting Translation API connection...");
  const client = new TranslationServiceClient();
  
  try {
    const testText = "Hello world";
    console.log(`Testing language detection for: "${testText}"`);
    
    const request = {
      parent: `projects/${projectId}/locations/global`,
      content: testText,
    };
    
    console.log("Request:", JSON.stringify(request));
    
    const [response] = await client.detectLanguage(request);
    console.log("Success! API responded with:", JSON.stringify(response, null, 2));
    
    console.log("\nEverything looks good!");
    process.exit(0);
  } catch (error) {
    console.error("API TEST FAILED with error:", error);
    console.error("This indicates an issue with your Google Cloud setup.");
    
    if (error.code === 7) {
      console.error("\nPERMISSION_DENIED usually means one of these issues:");
      console.error("1. The service account doesn't have the necessary permissions");
      console.error("2. The API isn't enabled for your project");
      console.error("3. Billing is not set up for your project");
      console.error("\nRecommended actions:");
      console.error("- Go to https://console.cloud.google.com/apis/library/translate.googleapis.com");
      console.error("- Ensure the API is enabled for project:", projectId);
      console.error("- Go to IAM settings and make sure your service account has 'Cloud Translation API User' role");
      console.error("- Check that billing is enabled for your project");
    }
    
    process.exit(1);
  }
}

main(); 