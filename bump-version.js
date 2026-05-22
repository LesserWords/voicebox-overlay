import fs from 'fs';

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

// Update Cargo.toml
const cargoPath = './src-tauri/Cargo.toml';
const cargo = fs.readFileSync(cargoPath, 'utf8');
const updated = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`);
fs.writeFileSync(cargoPath, updated);

console.log(`Successfully bumped version to ${newVersion} (tauri.conf.json + Cargo.toml)`);
