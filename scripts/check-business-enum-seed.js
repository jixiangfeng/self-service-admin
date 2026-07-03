import fs from 'node:fs';
import path from 'node:path';

const adminRoot = process.cwd();
const backendDmlPath = path.resolve(adminRoot, '../self-service-backend/src/main/resources/db/dml.sql');
const catalogPath = path.join(adminRoot, 'src/constants/businessCatalog.ts');

const catalogText = fs.readFileSync(catalogPath, 'utf8');
const dmlText = fs.readFileSync(backendDmlPath, 'utf8');

const enumBlocks = [...catalogText.matchAll(/^\s{2}([A-Za-z0-9_]+Options):\s*\[([\s\S]*?)^\s*\],/gm)];
const fallbackEnums = new Map();
for (const match of enumBlocks) {
  const key = match[1];
  const body = match[2];
  const values = [...body.matchAll(/\{\s*value:\s*(?:'([^']*)'|(\d+))\s*,\s*label:\s*'([^']*)'/g)].map((item) => ({
    value: String(item[1] ?? item[2]),
    label: item[3],
  }));
  fallbackEnums.set(key, values);
}

const seededCodes = new Set();
const dictIdToCode = new Map();

const directDictPattern = /INSERT INTO `dictionary`[^\n]*VALUES \((\d+),'[^']+','([A-Za-z0-9_]+Options)'\s*,\s*'业务枚举：/g;
for (const match of dmlText.matchAll(directDictPattern)) {
  dictIdToCode.set(match[1], match[2]);
  seededCodes.add(match[2]);
}

const selectDictPattern = /SELECT\s+'[^']+'\s*,\s*'([A-Za-z0-9_]+Options)'\s*,\s*'业务枚举：/g;
for (const match of dmlText.matchAll(selectDictPattern)) {
  seededCodes.add(match[1]);
}

const seededItems = new Map();
function addSeededItem(key, value) {
  if (!key) return;
  if (!seededItems.has(key)) seededItems.set(key, new Set());
  seededItems.get(key).add(String(value));
}

const directItemPattern = /INSERT INTO `dictionary_item`[^\n]*VALUES \([^,]+,(\d+),'[^']*','([^']*)'/g;
for (const match of dmlText.matchAll(directItemPattern)) {
  addSeededItem(dictIdToCode.get(match[1]), match[2]);
}

const selectItemPattern = /FROM\s+`dictionary`\s+d\s+WHERE\s+d\.`code`\s*=\s*'([A-Za-z0-9_]+Options)'[\s\S]{0,280}?AND\s+NOT\s+EXISTS\s*\(SELECT\s+1\s+FROM\s+`dictionary_item`\s+di\s+WHERE\s+di\.`dict_id`\s*=\s*d\.`id`\s+AND\s+di\.`value`\s*=\s*('([^']*)'|\d+)\)/g;
for (const match of dmlText.matchAll(selectItemPattern)) {
  addSeededItem(match[1], match[3] ?? match[2].replace(/'/g, ''));
}


const missingCodes = [];
for (const key of fallbackEnums.keys()) {
  if (!seededCodes.has(key)) missingCodes.push(key);
}

const missingItems = [];
for (const [key, items] of fallbackEnums.entries()) {
  const seeded = seededItems.get(key) || new Set();
  const miss = items.map((item) => item.value).filter((value) => !seeded.has(value));
  if (miss.length) {
    missingItems.push({ key, miss });
  }
}

if (missingCodes.length || missingItems.length) {
  console.error('Business enum seed check failed:');
  if (missingCodes.length) {
    console.error(`- missing dictionary codes: ${missingCodes.join(', ')}`);
  }
  for (const item of missingItems) {
    console.error(`- missing items in ${item.key}: ${item.miss.join(', ')}`);
  }
  process.exit(1);
}

console.log('Business enum seed check passed: frontend fallback enums are seeded in backend dml.sql.');
