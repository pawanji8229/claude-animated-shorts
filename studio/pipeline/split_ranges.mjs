#!/usr/bin/env node
// Split a frame range into N contiguous chunks for parallel renderers. Prints a GitHub Actions matrix JSON.
// node pipeline/split_ranges.mjs 0-236 4  ->  {"include":[{"idx":0,"from":0,"to":59}, ...]}
const [a, b] = process.argv[2].split("-").map(Number), n = Math.max(1, Number(process.argv[3] || 1)), total = b - a + 1;
const include = []; let s = a;
for (let i = 0; i < n && s <= b; i++) { const len = Math.round(total / n * (i + 1)) - Math.round(total / n * i); const e = Math.min(b, s + len - 1); include.push({ idx: i, from: s, to: e }); s = e + 1; }
console.log(JSON.stringify({ include }));
