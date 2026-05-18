#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCES = [
  { source: 'locales/en.json', target: '_locales/en/messages.json' },
  { source: 'locales/zh.json', target: '_locales/zh_CN/messages.json' }
];

async function readJson(filePath) {
  const text = await fs.readFile(path.join(ROOT, filePath), 'utf8');
  return JSON.parse(text);
}

function buildMessages(localeData, filePath) {
  if (!localeData.manifest || !localeData.manifest.appName || !localeData.manifest.appDesc) {
    throw new Error(`Missing manifest section in ${filePath}`);
  }

  return {
    appName: localeData.manifest.appName,
    appDesc: localeData.manifest.appDesc
  };
}

async function writeJson(filePath, data) {
  const fullPath = path.join(ROOT, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function main() {
  for (const entry of SOURCES) {
    const localeData = await readJson(entry.source);
    const messages = buildMessages(localeData, entry.source);
    await writeJson(entry.target, messages);
    console.log(`Generated ${entry.target}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
