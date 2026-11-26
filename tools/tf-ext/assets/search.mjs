#!/usr/bin/env node
// Search the TwistFrame asset catalog.  node search.mjs [--type model|texture|hdri|sound] [--category x] [--sub x]
//   [--era 1940s] (assets plausible in that decade: era "any" or an earlier-or-equal decade) [--setting factory]
//   [--style photoreal] [--tag x] [--text words] [--status ready|catalog-only] [--boeing] [--json]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
export const CATALOG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../asset-library/catalog.json");
const decade = (e) => (e === "any" ? -Infinity : parseInt(e, 10));
export const loadCatalog = () => JSON.parse(fs.readFileSync(CATALOG, "utf8")).assets;
export function search(assets, q = {}) {
  const has = (v, x) => (Array.isArray(v) ? v : [v]).some((s) => String(s).toLowerCase().includes(String(x).toLowerCase()));
  return assets.filter((a) => (!q.type || a.type === q.type) && (!q.category || a.category === q.category) && (!q.sub || a.sub === q.sub) && (!q.status || a.status === q.status)
    && (!q.era || decade(a.era) <= decade(q.era)) && (!q.setting || has(a.setting, q.setting)) && (!q.style || has(a.style, q.style)) && (!q.tag || has(a.tags, q.tag))
    && (!q.text || q.text.split(/\s+/).every((w) => has([a.name, a.use, a.sub, a.category, ...(a.tags ?? [])], w))) && (!q.boeing || a.boeing || (a.setting ?? []).some((s) => ["factory", "rooftop", "camouflage", "airfield"].includes(s))));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const q = {}; const av = process.argv.slice(2); for (let i = 0; i < av.length; i++) if (av[i].startsWith("--")) { const k = av[i].slice(2), v = av[i + 1] && !av[i + 1].startsWith("--") ? av[++i] : true; q[k] = v; }
  const r = search(loadCatalog(), q);
  if (q.json) console.log(JSON.stringify(r, null, 1)); else { for (const a of r) console.log(`${a.status.padEnd(12)} ${a.id.padEnd(46)} ${a.type.padEnd(7)} ${String(a.era).padEnd(5)} ${a.category}/${a.sub}  ${a.use ?? a.name}`); console.log(`\n${r.length} assets`); }
}
