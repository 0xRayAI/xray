import { readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadLaws(lawsDir) {
  const files = readdirSync(lawsDir)
    .filter((name) => name.endsWith('.mjs'))
    .sort();
  const laws = [];
  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(lawsDir, file)).href);
    laws.push(mod.law);
  }
  return laws;
}
