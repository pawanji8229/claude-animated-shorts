# London Bridge — full film production plan (v2, benchmark = approved Reopening v2)

Master audio: `input/narration.mp3` (= user's c1.mp3, 59.0106 s, 1771 frames @ 30 fps). Never edited.
Final: 1080×1920 composition `LondonBridgeFull` (Post supersampling ss=1 at 1080 = same internal pixel count as the
approved 540 preview with ss=2). Preview: `LondonBridgeFullPreview` 540×960.

## One take, four worlds, joined by atmosphere (no cuts)
The camera never cuts. Between worlds it travels THROUGH atmosphere — clouds, sea fog, heat haze, river spray, a
desert dust gust — a full-frame procedural veil (`Veil.tsx`, no text) that peaks opaque for ~4 frames while the
camera keeps moving; the world behind is swapped at the peak.

| frames | world | narration | content |
|---|---|---|---|
| 0–339 | Desert hook (existing Act 1, `desert/LondonBridgeFilm`) | 1–4 | car, Hal ta-da, reveal, dry riverbed cringe; camera cranes to the sky |
| 333–347 | veil: clouds | — | camera rises through cloud |
| 340–984 | London (new `london/LondonSet`) | 5–10 | dusk Thames, old bridge + new bridge works, embankment blueprint, cheque with clerk, dismantling (chalk numbers, crane), ship loading & departure |
| 978–992 | veil: sea fog | — | |
| 985–1063 | Sea + Panama (new `sea/SeaSet`) | 11 | cargo ship of numbered blocks on open ocean, then through canal lock gates |
| 1057–1071 | veil: heat haze | — | |
| 1064–1480 | Desert works (new `desert2/DesertWorks`) | 12–16 | trucks deliver blocks, rebuild around concrete core (scaffold), no-river callback (Hal cringe), excavators dig, water floods channel |
| 1473–1487 | veil: river spray | — | |
| 1481–1770 | Reopening (APPROVED benchmark scene, unchanged, `<Sequence from={1481}>`) | 17–20 | audio offset verified by cross-correlation: 49.37 s = frame 1481.1 |
| 1756–1770 + 0–14 | veil: desert dust gust | loop | end → start continuity (same gust) |

## Rules carried from the benchmark
earless odo5 characters + face glow, crowdLife for every group (crews too), narration-first mixer, event-derived
sounds, check-crowd gate, QC incl. glitch + intelligibility + loop.
