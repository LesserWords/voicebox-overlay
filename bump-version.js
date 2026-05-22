import fs from 'fs';

// Read the new version from npm environment variables
const newVersion = process.env.npm_package_version;
if (!newVersion) {
  console.error('Error: newVersion is undefined. Are you running this via npm version?');
  process.exit(1);
}

// Update tauri.conf.json
const tauriConfPath = './src-tauri/tauri.conf.json';
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = newVersion;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');

console.log(`Successfully bumped Tauri version to ${newVersion}`);
