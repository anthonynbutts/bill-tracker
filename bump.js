#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = __dirname;
const configPath = path.join(rootDir, 'config.js');
const packagePath = path.join(rootDir, 'package.json');
const swPath = path.join(rootDir, 'sw.js');
const indexPath = path.join(rootDir, 'index.html');

// Read existing config
let currentVersion = '0.1.0';
if (fs.existsSync(configPath)) {
  const content = fs.readFileSync(configPath, 'utf8');
  const match = content.match(/version:\s*['"]([^'"]+)['"]/);
  if (match) currentVersion = match[1];
}

// Check CLI arguments for version bump
const arg = process.argv[2];
let targetVersion = currentVersion;
if (arg) {
  if (arg === 'patch') {
    const parts = currentVersion.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    targetVersion = parts.join('.');
  } else if (arg === 'minor') {
    const parts = currentVersion.split('.').map(Number);
    parts[1] = (parts[1] || 0) + 1;
    parts[2] = 0;
    targetVersion = parts.join('.');
  } else if (/^\d+\.\d+\.\d+.*$/.test(arg)) {
    targetVersion = arg;
  }
}

// Generate randomized 7-character build ID
const buildId = crypto.randomBytes(4).toString('hex').slice(0, 7);
const buildTimestamp = new Date().toISOString();
const tag = `${targetVersion}-${buildId}`;

console.log(`Bumping build: version=${targetVersion}, buildId=${buildId}`);

// 1. Write config.js
const configContent = `// School Bill Tracker - Runtime Configuration & Version Control
// Update version and randomize buildId on every build/release

const APP_CONFIG = {
  version: '${targetVersion}',
  buildId: '${buildId}',
  buildTimestamp: '${buildTimestamp}',
  appName: 'School Bill Tracker',
  author: 'Anthony'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = APP_CONFIG;
}
`;
fs.writeFileSync(configPath, configContent, 'utf8');

// 2. Update package.json
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.version = targetVersion;
  if (!pkg.scripts) pkg.scripts = {};
  pkg.scripts.bump = 'node bump.js';
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

// 3. Update sw.js
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  swContent = swContent.replace(/const CACHE_NAME = ['"][^'"]+['"];/, `const CACHE_NAME = 'school-bill-tracker-v${tag}';`);
  swContent = swContent.replace(/['"]\.\/styles\.css\?v=[^'"]+['"]/, `'./styles.css?v=${tag}'`);
  swContent = swContent.replace(/['"]\.\/app\.js\?v=[^'"]+['"]/, `'./app.js?v=${tag}'`);
  if (!swContent.includes('config.js')) {
    swContent = swContent.replace(
      "  './app.js',",
      "  './config.js',\n  './config.js?v=" + tag + "',\n  './app.js',"
    );
  } else {
    swContent = swContent.replace(/['"]\.\/config\.js\?v=[^'"]+['"]/, `'./config.js?v=${tag}'`);
  }
  fs.writeFileSync(swPath, swContent, 'utf8');
}

// 4. Update index.html
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  indexContent = indexContent.replace(/href="styles\.css(?:\?v=[^"]*)?"/, `href="styles.css?v=${tag}"`);
  indexContent = indexContent.replace(/src="config\.js(?:\?v=[^"]*)?"/, `src="config.js?v=${tag}"`);
  indexContent = indexContent.replace(/src="app\.js(?:\?v=[^"]*)?"/, `src="app.js?v=${tag}"`);
  fs.writeFileSync(indexPath, indexContent, 'utf8');
}

console.log(`Successfully updated config.js, package.json, sw.js, and index.html to v${targetVersion} (${buildId})`);
