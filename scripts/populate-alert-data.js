/**
 * Script to populate calculated alert data in the database.
 * Run this after running the migration: backend/supabase/migration_add_alert_data.sql
 * 
 * Usage:
 *   node scripts/populate-alert-data.js
 * 
 * Or make it executable and run directly (Unix/Mac):
 *   chmod +x scripts/populate-alert-data.js
 *   ./scripts/populate-alert-data.js
 */

const https = require('https');
const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function populateAlertData() {
  const url = new URL(`${API_URL}/api/alerts/recalculate`);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (res.statusCode === 200 && result.success) {
              console.log(`✅ Success! Updated ${result.updated} shipment(s)`);
              resolve(result);
            } else {
              console.error(`❌ Error: ${result.message || data}`);
              reject(new Error(result.message || 'Unknown error'));
            }
          } catch (error) {
            console.error(`❌ Failed to parse response: ${data}`);
            reject(error);
          }
        });
      }
    );

    req.on('error', (error) => {
      console.error(`❌ Request failed: ${error.message}`);
      console.log(`\n💡 Make sure your Next.js server is running at ${API_URL}`);
      reject(error);
    });

    req.write(JSON.stringify({}));
    req.end();
  });
}

// Run the script
if (require.main === module) {
  console.log('🔄 Populating calculated alert data...\n');
  populateAlertData()
    .then(() => {
      console.log('\n✨ Done! Your alert data is now stored in the database.');
      console.log('   Both the alerts table and detail pages will now show identical data.\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed to populate data:', error.message);
      process.exit(1);
    });
}

module.exports = { populateAlertData };

