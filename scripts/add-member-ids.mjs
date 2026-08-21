// One-time migration: assigns a permanent, stable `id` to every member in
// data/familyData.js. Run once with `node scripts/add-member-ids.mjs`, review
// the diff, then commit. Do not re-run after ids exist -- see README note
// this script prints if it finds ids already present.
import familyTree from '../data/familyData.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '..', 'data', 'familyData.js');

function slugify(name) {
  return (name || 'member')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'member';
}

function assignIds(node, usedIds) {
  if (!node) return;
  if (node.id) {
    console.error(`Refusing to run: "${node.name}" already has an id ("${node.id}"). Ids look already assigned -- aborting without writing anything.`);
    process.exit(1);
  }
  const base = slugify(node.name);
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  node.id = id;
  if (node.children) {
    node.children.forEach((child) => assignIds(child, usedIds));
  }
}

assignIds(familyTree, new Set());

const FIELD_ORDER = ['id', 'name', 'gujaratiName', 'photo', 'birthDate', 'deathDate', 'children'];

function serializeString(str) {
  return JSON.stringify(str);
}

function serializeNode(node, indent) {
  const pad = '  '.repeat(indent);
  const childPad = '  '.repeat(indent + 1);
  const lines = [];
  for (const key of FIELD_ORDER) {
    if (!(key in node)) continue;
    if (key === 'children') {
      const children = node[key];
      if (!children || children.length === 0) {
        lines.push(`${childPad}children: []`);
      } else {
        const serializedChildren = children
          .map((child) => serializeNode(child, indent + 2))
          .join(',\n');
        lines.push(`${childPad}children: [\n${serializedChildren}\n${childPad}]`);
      }
    } else {
      lines.push(`${childPad}${key}: ${serializeString(node[key])}`);
    }
  }
  return `${pad}{\n${lines.join(',\n')}\n${pad}}`;
}

const body = serializeNode(familyTree, 0).replace(/^\{\n/, '').replace(/\n\}$/, '');
const output = `// src/data/familyData.js\nconst familyTree = {\n${body}\n};\n\nexport default familyTree;\n`;

writeFileSync(outPath, output, 'utf8');
console.log(`Assigned ids to all members and wrote ${outPath}`);
