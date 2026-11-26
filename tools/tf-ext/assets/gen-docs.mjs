#!/usr/bin/env node
// Generate asset-library/CATALOG.md and SOUND_LIBRARY.md from catalog.json (human-readable inventory with licences).
import fs from "node:fs"; import path from "node:path"; import { CATALOG, loadCatalog } from "./search.mjs";
const A = loadCatalog(), LIB = path.dirname(CATALOG), mb = (b) => (b / 1e6).toFixed(1);
const lines = ["# TwistFrame premium asset catalog", "", `Generated from \`catalog.json\` (${new Date().toISOString().slice(0, 10)}). **ready** = downloaded, integrity-verified and statically inspected. **catalog-only** = researched, licence checked, download needs your account.`, ""];
const sec = (title, rows, head, fn) => { if (!rows.length) return; lines.push(`## ${title} (${rows.length})`, "", `| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((a) => `| ${fn(a).join(" | ")} |`), ""); };
const models = A.filter((a) => a.type === "model");
for (const cat of [...new Set(models.map((a) => a.category))]) sec(`Models: ${cat}`, models.filter((a) => a.category === cat), ["id", "status", "era", "use", "triangles", "size (m)", "tex", "licence", "notes"],
  (a) => [`\`${a.id}\``, a.status, a.era, a.use, a.quality?.triangles?.toLocaleString("en") ?? (a.faces ? `${a.faces.toLocaleString("en")} faces` : ""), a.quality?.sizeM?.map((v) => v.toFixed(2)).join(" × ") ?? "", a.quality?.textureRes ? `${a.quality.textureRes[1]}px` : "", a.licence, (a.quality?.flags ?? []).join("; ") || (a.note ?? "")]);
sec("PBR materials", A.filter((a) => a.type === "texture"), ["id", "era", "use", "res", "maps", "MB", "licence"], (a) => [`\`${a.id}\``, a.era, a.use, a.res, a.quality?.maps ? Object.entries(a.quality.maps).filter(([, v]) => v).map(([k]) => k).join(", ") : "", mb(a.bytes), a.licence]);
sec("HDRI environments", A.filter((a) => a.type === "hdri"), ["id", "use", "resolution", "MB", "licence"], (a) => [`\`${a.id}\``, a.use, `${a.quality?.width}×${a.quality?.height}`, mb(a.bytes), a.licence]);
fs.writeFileSync(path.join(LIB, "CATALOG.md"), lines.join("\n"));
const S = A.filter((a) => a.type === "sound"), sl = ["# TwistFrame sound-effect library", "", "Real recordings to layer with (or replace) the synthesised generators. Mixkit files are licensed for use inside your videos but **may not be redistributed on their own**; they stay in the gitignored cache. Kenney files are CC0.", ""];
for (const cat of [...new Set(S.map((a) => a.category))].sort()) { const r = S.filter((a) => a.category === cat); sl.push(`## ${cat} (${r.length})`, "", "| id | use | tags | era | duration | format | peak | licence |", "|---|---|---|---|---|---|---|---|",
  ...r.map((a) => `| \`${a.id}\` | ${a.use} | ${(a.tags ?? []).join(", ")} | ${a.era} | ${a.quality?.duration ?? ""} s | ${a.quality ? `${a.quality.codec} ${a.quality.sampleRate / 1000} kHz ${a.quality.channels}ch` : ""} | ${a.quality?.peakDb ?? ""} dB | ${a.licence} |`), ""); }
fs.writeFileSync(path.join(LIB, "SOUND_LIBRARY.md"), sl.join("\n")); console.log(`CATALOG.md (${models.length} models), SOUND_LIBRARY.md (${S.length} sounds)`);
