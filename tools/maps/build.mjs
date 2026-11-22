// Build writes the holes of tools/maps/holes/ to maps/<file>.json: all of them, or those whose file
// name starts with one of the arguments.
//
//	node tools/maps/build.mjs            every hole
//	node tools/maps/build.mjs h02 h08    those two
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { emit } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const want = process.argv.slice(2);
const files = readdirSync(join(here, 'holes')).filter(f => f.endsWith('.mjs') && (!want.length || want.some(w => f.startsWith(w))));
if (!files.length) { console.error('no hole matches', want.join(' ')); process.exit(1); }
for (const f of files.sort()) {
  const mod = await import(pathToFileURL(join(here, 'holes', f)));
  const t = mod.default();
  const out = join(here, '..', '..', 'maps', f.replace(/\.mjs$/, '.json'));
  writeFileSync(out, emit(t.h));
  console.log('maps/' + f.replace(/\.mjs$/, '.json'), '·', t.h.name);
}
