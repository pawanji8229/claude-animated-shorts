// Naming + description generator for vault publication. The site's upload form (bottom of the page) accepts:
// title <= 80 chars, public creator name <= 50, description <= 280 (optional), GLB <= 16 MiB, JPG/PNG preview <= 2 MiB,
// licence in {CC0 1.0, CC BY 4.0, CC BY-SA 4.0}. There are NO category/tag fields, so the most useful search terms are
// written naturally into the title/description (no keyword stuffing). Generic names are rejected.
const GENERIC = /^(model|object|mesh|asset|final|untitled|scene|export|test)[\s_-]*\d*$/i;
export function titleFor({ subject, era, qualifier, kind = "3D Model" }) { const t = [era, subject].filter(Boolean).join(" ") + (qualifier ? ` — ${qualifier}` : ` — ${kind}`); return t.length <= 80 ? t : t.slice(0, 77).replace(/\s+\S*$/, "") + "…"; }
export function describe({ what, history, details, m, uses }) {
  const spec = `${m.sizeM.map((v) => v.toFixed(1)).join(" × ")} m, ${Math.round(m.triangles / 1000)}k tris, ${m.maxTexture >= 2048 ? "2K" : m.maxTexture >= 1024 ? "1K" : `${m.maxTexture}px`} PBR, Y-up GLB`;
  // priority: what it is, technical spec, details, intended uses; trim from the end until it fits the site's 280 chars
  const parts = [what, history, spec, details, uses].filter(Boolean); let d = parts.join(". ") + ".";
  while (d.length > 280 && parts.length > 2) { parts.pop(); d = parts.join(". ") + "."; } return d.length <= 280 ? d : d.slice(0, 279);
}
export function validate(meta) { const e = [];
  if (!meta.title || meta.title.length > 80) e.push("title missing or > 80 chars"); if (GENERIC.test(meta.title ?? "")) e.push("title is generic");
  if (!meta.author || meta.author.length > 50) e.push("creator name missing or > 50 chars"); if ((meta.description ?? "").length > 280) e.push("description > 280 chars");
  if (!["CC0 1.0", "CC BY 4.0", "CC BY-SA 4.0"].includes(meta.licence)) e.push("licence must be CC0 1.0, CC BY 4.0 or CC BY-SA 4.0");
  if (!meta.original && !meta.redistributionAllowed) e.push("not an original model and redistribution not confirmed"); return e; }
