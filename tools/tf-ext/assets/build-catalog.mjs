#!/usr/bin/env node
// Build asset-library/catalog.json (committed; metadata only, no binaries) from: the curated selections, the verified
// download manifests (sha256, files), the static quality report, Kenney sound tags and the Sketchfab research list.
// status: "ready" = downloaded + verified + inspected ok | "catalog-only" = researched, needs an account/token to download.
import fs from "node:fs"; import path from "node:path";
import { ROOT } from "./fetch.mjs"; import { SELECTION } from "./selection.mjs"; import { MIXKIT } from "./sound-selection.mjs"; import { SKETCHFAB } from "./sketchfab-shortlist.mjs";
const LIB = path.resolve(ROOT, ".."), rel = (p) => path.relative(LIB, p);
const Q = JSON.parse(fs.readFileSync(path.join(LIB, "quality-report.json"), "utf8"));
const man = (src, id) => { const f = path.join(ROOT, src, String(id), "manifest.json"); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null; };
const bytes = (m) => m ? m.files.reduce((s, f) => s + f.bytes, 0) : 0;
const assets = [];
for (const a of SELECTION) { const m = man(a.source, a.id), q = a.kind === "model" ? Q.models[a.id] : a.kind === "texture" ? Q.textures[a.id] : a.kind === "hdri" ? Q.hdris[a.id] : Q.materials[a.id];
  assets.push({ id: `${a.source}:${a.id}`, type: a.kind === "material" ? "texture" : a.kind, name: m?.name ?? a.id, category: a.category, sub: a.sub, era: a.era, setting: a.setting, style: a.style, use: a.use, tags: m?.tags ?? [],
    source: a.source, sourceUrl: a.source === "polyhaven" ? `https://polyhaven.com/a/${a.id}` : `https://ambientcg.com/view?id=${a.id}`, licence: "CC0-1.0", authors: m?.authors ?? (a.source === "ambientcg" ? ["ambientCG (Lennart Demes)"] : []),
    attribution: "not required (CC0); credit appreciated", redistributable: true, res: a.res, local: m ? rel(path.join(ROOT, a.source, a.id, m.entry)) : null, bytes: bytes(m), sha256: m ? Object.fromEntries(m.files.map((f) => [f.rel, f.sha256])) : null,
    quality: q ?? null, status: m && q?.ready ? "ready" : m ? "downloaded-needs-review" : "missing" }); }
for (const [id, cat, tags, era, use] of MIXKIT) { const m = man("mixkit", id), q = Q.sounds[`mixkit:${id}`];
  assets.push({ id: `mixkit:${id}`, type: "sound", name: use, category: cat, sub: tags[0], era, setting: [], style: "recording", use, tags, source: "mixkit", sourceUrl: `https://mixkit.co/free-sound-effects/?q=${id}`, licence: "Mixkit Sound Effects Free License", licenceUrl: "https://mixkit.co/license/#sfxFree",
    attribution: "not required", redistributable: false, note: "use inside your videos only; never publish the raw file (kept out of the public repo)", local: m ? rel(path.join(ROOT, "mixkit", String(id), m.entry)) : null, bytes: bytes(m), sha256: m?.files[0].sha256 ?? null, quality: q ?? null, status: m && q?.ready ? "ready" : "missing" }); }
const KTAG = { footstep_carpet: ["footsteps", ["carpet", "step"]], footstep_concrete: ["footsteps", ["concrete", "step"]], footstep_grass: ["footsteps", ["grass", "step"]], footstep_snow: ["footsteps", ["snow", "step"]], footstep_wood: ["footsteps", ["wood", "step"]],
  impactMetal_heavy: ["impacts", ["metal", "heavy"]], impactMetal_medium: ["impacts", ["metal", "medium"]], impactMetal_light: ["impacts", ["metal", "light"]], impactPlank_medium: ["impacts", ["plank", "wood", "board"]], impactWood_heavy: ["impacts", ["wood", "heavy"]],
  impactWood_medium: ["impacts", ["wood", "medium"]], impactWood_light: ["impacts", ["wood", "light"]], impactPlate_heavy: ["impacts", ["plate", "metal", "sheet"]], impactPlate_medium: ["impacts", ["plate", "metal"]], impactPlate_light: ["impacts", ["plate", "metal"]],
  impactMining: ["impacts", ["pick", "rock", "mining"]], impactTin_medium: ["impacts", ["tin", "can"]], impactGlass_heavy: ["impacts", ["glass"]], impactGlass_medium: ["impacts", ["glass"]], impactGlass_light: ["impacts", ["glass"]], impactBell_heavy: ["impacts", ["bell"]],
  impactSoft_heavy: ["impacts", ["soft", "thud"]], impactSoft_medium: ["impacts", ["soft", "thud"]], impactGeneric_light: ["impacts", ["generic"]], impactPunch_heavy: ["impacts", ["punch"]], impactPunch_medium: ["impacts", ["punch"]],
  doorOpen: ["doors", ["door", "open", "wood"]], doorClose: ["doors", ["door", "close", "wood"]], creak: ["doors", ["creak", "wood"]], metalLatch: ["doors", ["latch", "metal"]], metalClick: ["tools", ["click", "metal"]], cloth: ["foley", ["cloth"]], clothBelt: ["foley", ["cloth", "belt"]],
  footstep: ["footsteps", ["step", "dirt"]], bookFlip: ["office", ["book", "paper"]], bookOpen: ["office", ["book"]], bookClose: ["office", ["book"]], bookPlace: ["office", ["book", "place"]], metalPot: ["impacts", ["pot", "metal"]], chop: ["tools", ["chop", "axe"]],
  handleCoins: ["foley", ["coins"]], beltHandle: ["foley", ["belt"]], dropLeather: ["foley", ["leather", "drop"]], handleSmallLeather: ["foley", ["leather"]], drawKnife: ["foley", ["knife"]], knifeSlice: ["foley", ["knife"]] };
for (const pack of ["impact-sounds", "rpg-audio"]) { const d = path.join(ROOT, "kenney", pack, "files", "Audio"); if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".ogg"))) { const key = f.replace(/_?\d+\.ogg$/, "").replace(/_$/, ""), t = KTAG[key] ?? ["foley", [key]], q = Q.sounds[`kenney:${pack}/${f}`];
    assets.push({ id: `kenney:${pack}/${f.replace(".ogg", "")}`, type: "sound", name: `${key} (${f})`, category: t[0], sub: t[1][0], era: "any", setting: [], style: "recording", use: key, tags: t[1], source: "kenney", sourceUrl: `https://kenney.nl/assets/${pack}`,
      licence: "CC0-1.0", attribution: "not required (CC0)", redistributable: true, local: rel(path.join(d, f)), bytes: fs.statSync(path.join(d, f)).size, quality: q ?? null, status: q?.ready ? "ready" : "missing" }); } }
for (const s of SKETCHFAB) assets.push({ id: `sketchfab:${s.uid}`, type: "model", name: s.name, category: s.category, sub: s.sub, era: s.era, setting: s.setting, style: "photoreal", use: s.use, tags: [], source: "sketchfab", sourceUrl: s.url,
  licence: s.licence, attribution: `"${s.name}" by ${s.author} (Sketchfab) is licensed under ${s.licence}`, redistributable: s.licence !== "CC0 Public Domain" ? "with attribution" : true, faces: s.faces, local: null, status: "catalog-only", note: "download needs your Sketchfab account (API token); then run prepare.mjs" });
const out = { generated: new Date().toISOString().slice(0, 10), counts: {}, assets };
for (const a of assets) { const k = `${a.type}:${a.status}`; out.counts[k] = (out.counts[k] ?? 0) + 1; }
fs.writeFileSync(path.join(LIB, "catalog.json"), JSON.stringify(out, null, 1)); console.log(out.counts);
