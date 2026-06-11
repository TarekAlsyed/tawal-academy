const SftpClient = require('ssh2-sftp-client');
const { Client } = require('ssh2');
const path = require('path');

const CONFIG = {
  host: 'ssh-tawal-academy.alwaysdata.net',
  port: 22,
  username: 'tawal-academy',
  password: 'Ww0566861863'
};

const LOCAL_FILE = path.resolve(__dirname, 'backend_update.tar.gz');
const REMOTE_DIR = '/home/tawal-academy/www/backend';
const REMOTE_FILE = REMOTE_DIR + '/backend_update.tar.gz';

async function deploy() {
  console.log('=== Tawal Academy Backend Deploy ===');
  
  // Step 1: Upload via SFTP
  console.log('[1/3] Uploading backend archive...');
  const sftp = new SftpClient();
  try {
    await sftp.connect(CONFIG);
    await sftp.put(LOCAL_FILE, REMOTE_FILE);
    console.log('[1/3] ✅ Upload complete!');
  } catch (err) {
    console.error('[1/3] ❌ Upload failed:', err.message);
    process.exit(1);
  } finally {
    await sftp.end();
  }

  // Step 2: Extract on server via SSH
  console.log('[2/3] Extracting files on server...');
  await new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      const cmd = `cd ${REMOTE_DIR} && tar -xzf backend_update.tar.gz && rm -f backend_update.tar.gz && npm install --production 2>/dev/null && echo 'EXTRACT_OK'`;
      conn.exec(cmd, (err, stream) => {
        if (err) { reject(err); return; }
        let output = '';
        stream.on('data', (data) => { 
          output += data.toString();
          process.stdout.write(data.toString());
        });
        stream.stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
        stream.on('close', () => {
          conn.end();
          if (output.includes('EXTRACT_OK')) {
            console.log('\n[2/3] ✅ Extract complete!');
            resolve();
          } else {
            reject(new Error('Extract failed'));
          }
        });
      });
    });
    conn.on('error', (err) => reject(err));
    conn.connect(CONFIG);
  });

  // Step 3: Verify health
  console.log('[3/3] Verifying backend health...');
  const https = require('https');
  await new Promise((resolve) => {
    setTimeout(() => {
      https.get('https://tawal-academy.alwaysdata.net/api/health', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          console.log(`[3/3] Health check: ${res.statusCode} - ${data}`);
          if (res.statusCode === 200) {
            console.log('[3/3] ✅ Backend is healthy!');
          } else {
            console.log('[3/3] ⚠️  Backend may need restart from AlwaysData dashboard');
          }
          resolve();
        });
      }).on('error', () => {
        console.log('[3/3] ⚠️  Health check failed - restart site from AlwaysData dashboard');
        resolve();
      });
    }, 3000);
  });

  console.log('\n=== ✅ DEPLOY COMPLETE ===');
  console.log('If needed, restart the site from: https://admin.alwaysdata.com/');
}

deploy().catch(err => {
  console.error('Deploy failed:', err.message);
  process.exit(1);
});
