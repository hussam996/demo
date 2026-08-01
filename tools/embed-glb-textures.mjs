/**
 * Rewrites Kenney GLB files so their external `Textures/colormap.png`
 * reference becomes an inline data URI. Self-contained GLBs can then be
 * base64-inlined by Vite for the single-file build, where a sandboxed host
 * cannot fetch sibling files.
 *
 * Usage: node tools/embed-glb-textures.mjs assets/models
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const GLB_MAGIC = 0x46546c67; // 'glTF'
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.toLowerCase().endsWith('.glb')) out.push(full);
  }
  return out;
}

function parseGlb(buffer) {
  if (buffer.readUInt32LE(0) !== GLB_MAGIC) throw new Error('not a GLB');
  const chunks = [];
  let offset = 12;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    chunks.push({ type, data: buffer.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  return chunks;
}

function pad4(length) {
  return (4 - (length % 4)) % 4;
}

function buildGlb(json, bin) {
  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = Buffer.alloc(pad4(jsonBuf.length), 0x20);
  const jsonChunk = Buffer.concat([jsonBuf, jsonPad]);

  const parts = [];
  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(CHUNK_JSON, 4);
  parts.push(jsonHeader, jsonChunk);

  if (bin) {
    const binPad = Buffer.alloc(pad4(bin.length), 0);
    const binChunk = Buffer.concat([bin, binPad]);
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(binChunk.length, 0);
    binHeader.writeUInt32LE(CHUNK_BIN, 4);
    parts.push(binHeader, binChunk);
  }

  const body = Buffer.concat(parts);
  header.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([header, body]);
}

const root = resolve(process.argv[2] ?? 'assets/models');
let changed = 0;

for (const file of walk(root)) {
  const original = readFileSync(file);
  const chunks = parseGlb(original);
  const jsonChunk = chunks.find((c) => c.type === CHUNK_JSON);
  const binChunk = chunks.find((c) => c.type === CHUNK_BIN);
  const json = JSON.parse(jsonChunk.data.toString('utf8'));

  const images = json.images ?? [];
  let touched = false;
  for (const image of images) {
    if (!image.uri || image.uri.startsWith('data:')) continue;
    const imagePath = join(dirname(file), decodeURIComponent(image.uri));
    const bytes = readFileSync(imagePath);
    const mime = image.uri.toLowerCase().endsWith('.jpg') ? 'image/jpeg' : 'image/png';
    image.uri = `data:${mime};base64,${bytes.toString('base64')}`;
    image.mimeType = mime;
    touched = true;
  }
  if (!touched) continue;

  writeFileSync(file, buildGlb(json, binChunk?.data));
  changed++;
  console.log(`embedded: ${file}`);
}

console.log(`\n${changed} GLB file(s) made self-contained.`);
