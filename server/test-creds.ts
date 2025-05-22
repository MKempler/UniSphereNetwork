import * as fs from 'fs';

const creds = JSON.parse(fs.readFileSync('tokyo-baton-460601-i3-d4a4da74f7ef.json', 'utf8'));
console.log('Service account email:', creds.client_email);
console.log('Project ID in credentials:', creds.project_id);
