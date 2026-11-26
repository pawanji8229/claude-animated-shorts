"""Orkney terrain generator for the "flight" production (offline, deterministic).

World: metres, +x east, +z south, origin = centre of the Westray (WRY) runway. Papa Westray (PPW) runway ~2.75 km east.
Everything is a pure function of world (x, z): coast distance (signed, from hand-traced, noise-roughened outlines),
height, ground colour/material. It is sampled at several grid levels that line up exactly:
  outer 40 m (21 x 23 km) > mid 6 m (6 x 3 km, both airfields + Papa Sound) > near 2 m (each airfield).
Outputs (studio/public/flight/): terrain_<lvl>.bin (float32 heights, row-major z then x), ground_<lvl>.png (RGB colour,
A = material class), shore_<lvl>.png (R depth, G shore distance, B foam/rock factor) and src/.../flight/data/places.json.
Coastlines are approximations traced from general map knowledge, not survey data.
"""
import json, os, sys, zlib, struct
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))   # studio/
OUT = os.path.join(ROOT, "public", "flight"); os.makedirs(OUT, exist_ok=True)
DATA = os.path.join(ROOT, "src", "productions", "flight", "data"); os.makedirs(DATA, exist_ok=True)

# ------------------------------------------------------------------ hand-traced outlines (x east, z south)
WESTRAY = [  # clockwise from the Aikerness tip; south end runs off the map (Rapness area)
    (300, -900), (-300, -1010), (-900, -1150), (-1500, -1060), (-2100, -1250), (-2600, -1600), (-3100, -1520), (-3700, -1720),
    (-4400, -2010), (-5300, -2100), (-6200, -1930), (-6450, -1250), (-6050, -320), (-5700, 600), (-5250, 1500), (-5000, 2600),
    (-4600, 3600), (-4250, 4700), (-3650, 5800), (-3050, 7000), (-2350, 8300), (-1550, 9600), (-850, 11000), (-650, 14500),
    (2700, 14500), (2400, 12000), (1900, 10500), (1500, 9250), (2100, 8250), (1400, 7300), (700, 6600), (300, 5600),
    (-200, 4800), (-650, 4000), (-750, 3300), (-1500, 2900), (-1950, 2300), (-1550, 1700), (-950, 1420), (-300, 1120),
    (200, 820), (308, 380), (318, -60), (315, -420), (285, -720)]
PAPA = [  # Papa Westray, clockwise from Mull Head
    (3900, -5200), (4300, -4620), (4220, -3600), (4020, -2600), (3820, -1600), (3700, -700), (3640, 200), (3520, 1100),
    (3320, 2000), (3030, 3000), (2650, 3620), (2360, 3120), (2210, 2200), (2260, 1300), (2160, 500), (2190, -220),
    (2290, -920), (2480, -1720), (2660, -2600), (3010, -3300), (2960, -3900), (3290, -4500), (3600, -5000)]
HOLM = [(3980, 150), (4330, 40), (4650, 220), (4720, 560), (4500, 820), (4150, 760), (3960, 480)]
ISLANDS = [("westray", WESTRAY, 7), ("papa", PAPA, 11), ("holm", HOLM, 13)]

WRY = dict(x0=-300.0, x1=290.0, z=0.0, w=18.0, elev=9.0)          # gravel runway E-W
PPW = dict(x0=2560.0, x1=3060.0, z=-155.0, w=22.0, elev=7.0)      # grass runway E-W

LEVELS = {  # x0, z0, step, nx, nz  (grids line up: near inside mid inside outer, on shared grid lines)
    "outer": (-11000.0, -10000.0, 40.0, 526, 576),
    "mid": (-1400.0, -1800.0, 6.0, 1001, 501),
    "wry": (-440.0, -300.0, 2.0, 502, 271),
    "ppw": (2380.0, -462.0, 2.0, 442, 301),
}
TEX = {  # texture px size per level (metres per px follows)
    "outer": (2100, 2300), "mid": (4000, 2000), "wry": (2008, 1080), "ppw": (1768, 1200),
}

# ------------------------------------------------------------------ noise (hash lattice value noise, vectorised)
def _hash(ix, iz, seed):
    h = (ix.astype(np.int64) * 374761393 + iz.astype(np.int64) * 668265263 + seed * 2246822519) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFFFF) / float(0xFFFFFF)

def vnoise(x, z, scale, seed=0):
    u, v = x / scale, z / scale; i, j = np.floor(u), np.floor(v); fu, fv = u - i, v - j
    fu, fv = fu * fu * (3 - 2 * fu), fv * fv * (3 - 2 * fv)
    a, b, c, d = _hash(i, j, seed), _hash(i + 1, j, seed), _hash(i, j + 1, seed), _hash(i + 1, j + 1, seed)
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv

def fbm(x, z, scale, oct=4, seed=0):
    s, amp, tot, norm = scale, 1.0, 0.0, 0.0
    for o in range(oct):
        tot = tot + amp * vnoise(x, z, s, seed + o * 17); norm += amp; amp *= 0.5; s *= 0.5
    return tot / norm  # 0..1

# ------------------------------------------------------------------ coast distance
def densify(poly, step=35.0, seed=1):
    pts = []
    n = len(poly)
    for k in range(n):
        a, b = np.array(poly[k], float), np.array(poly[(k + 1) % n], float)
        L = np.linalg.norm(b - a); m = max(1, int(L / step))
        for t in np.arange(m) / m: pts.append(a + (b - a) * t)
    P = np.array(pts)
    # roughen along the outline normal: big wobbles (headlands/geos) + small ones; keep the hand-traced airfield coasts calm
    nrm = np.roll(P, -1, 0) - np.roll(P, 1, 0); nrm = np.stack([nrm[:, 1], -nrm[:, 0]], 1); nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
    w = (fbm(P[:, 0], P[:, 1], 420, 3, seed) - 0.5) * 110 + (fbm(P[:, 0], P[:, 1], 90, 3, seed + 5) - 0.5) * 34
    calm = np.minimum(np.hypot(P[:, 0] - 0, P[:, 1] - 0), np.hypot(P[:, 0] - 2810, P[:, 1] + 155))
    w = w * (0.12 + 0.88 * np.clip((calm - 450) / 600, 0, 1))
    return P + nrm * w[:, None]

from scipy.spatial import cKDTree
OUTLINES = [(name, densify(poly, seed=s)) for name, poly, s in ISLANDS]
def _resample(P, step=3.0):
    pts = []
    for a, b in zip(P, np.roll(P, -1, 0)):
        m = max(1, int(np.linalg.norm(b - a) / step)); pts.append(a + (b - a) * (np.arange(m) / m)[:, None])
    return np.concatenate(pts)
COAST_PTS = np.concatenate([_resample(P) for _, P in OUTLINES]); COAST_TREE = cKDTree(COAST_PTS)
MASK_X0, MASK_Z0, MASK_ST = -7500.0, -6500.0, 3.0
_mw, _mh = int(13500 / MASK_ST), int(22000 / MASK_ST)
_img = Image.new("L", (_mw, _mh), 0); _dr = ImageDraw.Draw(_img)
for k, (name, P) in enumerate(OUTLINES): _dr.polygon([((x - MASK_X0) / MASK_ST, (z - MASK_Z0) / MASK_ST) for x, z in P], fill=k + 1)
MASK = np.array(_img)

def coast(px, pz):
    """signed distance to the nearest coast (m, + on land) and which island (0 at sea)"""
    d = COAST_TREE.query(np.stack([px.ravel(), pz.ravel()], 1), workers=-1)[0].reshape(px.shape)
    i = np.clip(((px - MASK_X0) / MASK_ST).astype(int), 0, _mw - 1); j = np.clip(((pz - MASK_Z0) / MASK_ST).astype(int), 0, _mh - 1)
    isl = MASK[j, i]; best = np.where(isl > 0, d, -d)
    best = best + (fbm(px, pz, 26, 3, 41) - 0.5) * 9      # fine jaggedness of the waterline (rock ledges)
    return best, isl

# ------------------------------------------------------------------ height
def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

def runway_mask(px, pz, R, pad):
    dx = np.maximum(0, np.maximum(R["x0"] - pad - px, px - R["x1"] - pad)); dz = np.maximum(0, np.abs(pz - R["z"]) - R["w"] / 2 - pad)
    return 1 - smoothstep(0, 45, np.hypot(dx, dz))

def height(px, pz):
    d, isl = coast(px, pz)
    n1 = fbm(px, pz, 300, 3, 3)                                   # coastal character: 0 sandy bay .. 1 rocky low cliff
    rim = 1.2 + 7.5 * smoothstep(0.35, 0.8, n1)
    land = rim * smoothstep(0, 6 + 34 * (1 - n1), d)
    land += 0.022 * np.minimum(np.maximum(d, 0), 900) * smoothstep(0, 120, d)
    hills = [(-3000, 3500, 1300, 150), (-2500, 900, 900, 45), (-4700, -900, 1000, 60), (-1600, -500, 700, 18), (300, 3200, 900, 25),
             (-1000, 6500, 1300, 70), (3300, -3800, 700, 40), (3000, 1800, 700, 14)]
    for hx, hz, s, a in hills: land += a * np.exp(-((px - hx) ** 2 + (pz - hz) ** 2) / (2 * s * s)) * smoothstep(0, 200, d)
    land += ((fbm(px, pz, 260, 4, 7) - 0.5) * 9 + (fbm(px, pz, 45, 3, 9) - 0.5) * 1.6) * smoothstep(0, 150, d)
    noup = smoothstep(-4200, -5200, px) * smoothstep(-2600, -1600, pz) * (1 - smoothstep(1000, 2500, pz))   # Noup Head cliffs (far west)
    land += noup * 55 * smoothstep(0, 25, d)
    sea = np.where(d > -10, -0.25 - 0.13 * (-d), -1.55 - np.minimum(-d - 10, 600) * 0.06) + (fbm(px, pz, 60, 2, 21) - 0.5) * 0.5 * smoothstep(-10, -60, d)
    h = np.where(d > 0, land, sea)
    for R, (sx0, sx1, sz0, sz1) in ((WRY, (-340, 330, -135, 45)), (PPW, (2520, 3100, -275, -105))):
        dx = np.maximum(0, np.maximum(sx0 - px, px - sx1)); dz = np.maximum(0, np.maximum(sz0 - pz, pz - sz1))
        m = (1 - smoothstep(0, 55, np.hypot(dx, dz))) * smoothstep(8, 30, d)
        h = h * (1 - m) + R["elev"] * m
    return h.astype(np.float32), d, isl, n1

# ------------------------------------------------------------------ roads, farms, fields (world-space)
ROADS = [  # polylines (x, z); widths ~3.5 m single-track
    [(80, -100), (-60, -150), (-250, -250), (-900, -300), (-1300, 100), (-1620, 800), (-1900, 1600), (-2000, 2300)],
    [(-900, -300), (-2000, -700), (-3200, -900), (-4300, -1100)],
    [(-2000, 2300), (-2400, 3200), (-2200, 4300), (-1600, 5600), (-900, 7000), (0, 8300), (800, 9500)],
    [(-1300, 100), (-600, 650), (0, 700)],
    [(3100, 3200), (2900, 2200), (2800, 1200), (2700, 300), (2650, -330), (2800, -1300), (3000, -2300), (3250, -3400), (3500, -4300)],
    [(2650, -330), (2690, -232), (2760, -224)],
    [(2800, 1200), (3300, 1150)],
    [(3000, -2300), (3600, -2200)],
]
def seg_min(px, pz, line):
    d = np.full(px.shape, 1e9)
    for (ax, az), (bx, bz) in zip(line[:-1], line[1:]):
        ex, ez = bx - ax, bz - az; L2 = ex * ex + ez * ez
        t = np.clip(((px - ax) * ex + (pz - az) * ez) / L2, 0, 1); d = np.minimum(d, np.hypot(px - ax - t * ex, pz - az - t * ez))
    return d

rs = np.random.RandomState(5)
class Parcels:
    """rectangular Orkney field parcels: rows (bands) along v with random depths, each row split along u at random
    breaks; boundaries wobble a little (old dykes are never quite straight). Pure function of world position."""
    def __init__(self, cx, cz, ang, seed, row=(70, 150), col=(90, 260)):
        r = np.random.RandomState(seed); self.cx, self.cz, self.ca, self.sa, self.seed = cx, cz, np.cos(ang), np.sin(ang), seed
        self.vb = np.cumsum(r.uniform(*row, 400)) - 400 * np.mean(row) / 2
        self.ub = [np.cumsum(r.uniform(*col, 260)) - 260 * np.mean(col) / 2 + r.uniform(0, 200) for _ in range(len(self.vb))]
        self.ubm = np.array(self.ub)
    def __call__(self, px, pz):
        u0 = (px - self.cx) * self.ca + (pz - self.cz) * self.sa; v0 = -(px - self.cx) * self.sa + (pz - self.cz) * self.ca
        u = u0 + (fbm(px, pz, 300, 2, self.seed) - 0.5) * 30; v = v0 + (fbm(px, pz, 260, 2, self.seed + 3) - 0.5) * 26
        j = np.clip(np.searchsorted(self.vb, v), 1, len(self.vb) - 1)
        dv = np.minimum(v - self.vb[j - 1], self.vb[j] - v)
        ub = self.ubm[j]                                       # (..., 260)
        flat = ub.reshape(-1, ub.shape[-1]); uf = u.ravel()
        i = (flat < uf[:, None]).sum(1).reshape(u.shape); i = np.clip(i, 1, ub.shape[-1] - 1)
        lo = np.take_along_axis(ub, (i - 1)[..., None], -1)[..., 0]; hi = np.take_along_axis(ub, i[..., None], -1)[..., 0]
        du = np.minimum(u - lo, hi - u)
        fid = (j * 1000 + i) * 7 + self.seed
        return fid, np.minimum(du, dv), u0
PARCELS = [Parcels(-1200, 1500, 0.35, 101), Parcels(2900, -800, 0.08, 202)]
FIELD_COL = np.array([[98, 140, 60], [106, 148, 64], [114, 154, 68], [92, 132, 56], [102, 144, 62], [124, 160, 76], [96, 136, 58], [110, 150, 66],
                      [156, 160, 96], [172, 164, 104], [126, 108, 80], [132, 158, 82]], float)
FIELD_CUM = np.cumsum(np.array([12, 12, 10, 9, 10, 6, 9, 9, 2.5, 1.5, 1, 4], float)); FIELD_CUM /= FIELD_CUM[-1]

FARMS = []  # (x, z, rot, variant) placed along the roads
def place_farms():
    r = np.random.RandomState(11)
    for line in ROADS:
        for (ax, az), (bx, bz) in zip(line[:-1], line[1:]):
            L = np.hypot(bx - ax, bz - az); n = int(L / 330)
            for k in range(n):
                t = (k + r.uniform(0.2, 0.8)) / max(1, n); x, z = ax + (bx - ax) * t, az + (bz - az) * t
                side = r.choice([-1, 1]); nx, nz = -(bz - az) / L, (bx - ax) / L; off = r.uniform(30, 70)
                x, z = x + nx * off * side, z + nz * off * side
                FARMS.append((x, z, float(np.arctan2(bz - az, bx - ax) + r.uniform(-0.15, 0.15)), int(r.randint(0, 4))))
place_farms()
FARMS += [(70, -112, 0.02, 4)]    # (variant 4/5 = the airfield terminals are built separately; keep their yards)
FARM_ARR = np.array([(x, z) for x, z, _, _ in FARMS])

def ground(px, pz, h, d, isl, n1, mpp):
    """RGB + material class for each sample. mpp = metres per pixel (line widths)."""
    fidW, eW, uW = PARCELS[0](px, pz); fidP, eP, uP = PARCELS[1](px, pz)
    onP = (isl == 2) | (isl == 3)
    fid = np.where(onP, fidP, fidW); edged = np.where(onP, eP, eW); u = np.where(onP, uP, uW)
    rnd = _hash(fid, fid * 3 + 1, 5); kind = np.searchsorted(FIELD_CUM, rnd); col = FIELD_COL[kind].copy()
    col *= (0.93 + 0.14 * fbm(px, pz, 40, 3, 51))[..., None]
    stripe = (_hash(fid, fid + 7, 9) < 0.2) & (kind < 8)
    col = np.where(stripe[..., None], col * (0.93 + 0.12 * (np.sin(u / 2.4) > 0))[..., None] + np.array([12, 10, -4]), col)
    edge = edged < max(0.9, mpp * 0.35)
    dyke = edge & (_hash(fid // 7, fid // 11, 3) < 0.55)
    ek = min(1.0, 2.2 / max(mpp, 1.0)); col = np.where(dyke[..., None], col * (1 - ek) + np.array([118, 116, 104], float) * ek, np.where(edge[..., None], col * (1 - 0.28 * ek), col))
    mat = np.full(px.shape, 255, np.uint8)
    # coastal rough grazing, rock shelf, sand bays
    rough = smoothstep(55, 12, d)
    rough_col = np.array([128, 132, 82]) * (0.9 + 0.2 * fbm(px, pz, 20, 3, 61))[..., None]
    col = col * (1 - rough[..., None]) + rough_col * rough[..., None]; mat = np.where(rough > 0.5, 200, mat)
    sandy = n1 < 0.33
    rockband = (d < 1.5 + 8 * smoothstep(0.3, 0.8, n1)) & ~sandy
    sandband = (d < 9) & sandy
    rock_col = np.array([118, 114, 104]) * (0.75 + 0.4 * fbm(px, pz, 6, 3, 71))[..., None]
    col = np.where(rockband[..., None], rock_col, col); mat = np.where(rockband, 100, mat)
    col = np.where(sandband[..., None], np.array([214, 200, 160]) * (0.92 + 0.12 * fbm(px, pz, 8, 2, 81))[..., None], col); mat = np.where(sandband, 50, mat)
    # roads (tarmac with grass verge) + farm yards
    rd = np.full(px.shape, 1e9)
    for line in ROADS: rd = np.minimum(rd, seg_min(px, pz, line))
    verge = rd < 3.4; road = rd < 1.9
    col = np.where(verge[..., None], col * 0.85 + np.array([10, 8, 2]), col)
    col = np.where(road[..., None], np.array([92, 92, 90]) * (0.9 + 0.15 * fbm(px, pz, 3, 2, 91))[..., None], col); mat = np.where(road, 150, mat)
    if len(FARM_ARR):
        fd = cKDTree(FARM_ARR).query(np.stack([px.ravel(), pz.ravel()], 1))[0].reshape(px.shape)
        yard = fd < 22 + 8 * fbm(px, pz, 10, 2, 99)
        col = np.where(yard[..., None], np.array([138, 132, 116]) * (0.85 + 0.25 * fbm(px, pz, 4, 2, 97))[..., None], col); mat = np.where(yard, 150, mat)
    # airfields
    for R, gravel in ((WRY, True), (PPW, False)):
        dx = np.maximum(0, np.maximum(R["x0"] - px, px - R["x1"])); dz = np.abs(pz - R["z"])
        strip = (dx <= 0) & (dz < R["w"] / 2)
        mown = (dx < 30) & (dz < R["w"] / 2 + 32)
        mcol = np.array([112, 158, 72]) * (0.95 + 0.08 * (np.sin(px / 3.0) > 0))[..., None]
        col = np.where(mown[..., None], mcol, col); mat = np.where(mown, 255, mat)
        if gravel:
            gcol = np.array([150, 142, 128]) * (0.86 + 0.24 * fbm(px, pz, 2.5, 3, 111))[..., None]
            gcol = np.where((np.abs(np.abs(pz - R["z"]) - 3.0) < 1.2)[..., None], gcol * 0.86, gcol)   # wheel-worn tracks
            col = np.where(strip[..., None], gcol, col); mat = np.where(strip, 150, mat)
        else:
            gcol = np.array([126, 168, 78]) * (0.95 + 0.1 * (np.sin(px / 4.0) > 0))[..., None] * (0.92 + 0.12 * fbm(px, pz, 5, 2, 113))[..., None]
            worn = np.abs(pz - R["z"]) < 4.5
            gcol = np.where(worn[..., None], gcol * 0.9 + np.array([12, 6, 0]), gcol)
            col = np.where(strip[..., None], gcol, col)
    # aprons + access (gravel)
    for (ax0, ax1, az0, az1) in [(20, 175, -118, -24), (2665, 2765, -232, -168)]:
        ap = (px > ax0) & (px < ax1) & (pz > az0) & (pz < az1)
        col = np.where(ap[..., None], np.array([150, 144, 132]) * (0.86 + 0.22 * fbm(px, pz, 2.0, 3, 121))[..., None], col); mat = np.where(ap, 150, mat)
    # sea (beneath the water; only seen through shallow water)
    col = np.where((d <= 0)[..., None], np.array([150, 140, 112]) * (0.8 + 0.3 * fbm(px, pz, 10, 2, 131))[..., None], col)
    return np.clip(col, 0, 255).astype(np.uint8), mat

# ------------------------------------------------------------------ build
def grid(lvl, nx=None, nz=None):
    x0, z0, st, gx, gz = LEVELS[lvl]
    if nx is None: return np.meshgrid(x0 + np.arange(gx) * st, z0 + np.arange(gz) * st)
    w, hgt = (gx - 1) * st, (gz - 1) * st
    return np.meshgrid(x0 + (np.arange(nx) + 0.5) * w / nx, z0 + (np.arange(nz) + 0.5) * hgt / nz)

def chunked(fn, X, Z, rows=64):
    outs = None
    for r in range(0, X.shape[0], rows):
        o = fn(X[r:r + rows], Z[r:r + rows])
        o = o if isinstance(o, tuple) else (o,)
        if outs is None: outs = [[] for _ in o]
        for k, v in enumerate(o): outs[k].append(v)
    return [np.concatenate(v, 0) for v in outs]

def main(levels):
    meta = {}
    for lvl in levels:
        x0, z0, st, gx, gz = LEVELS[lvl]
        X, Z = grid(lvl)
        H, D, I, N1 = chunked(height, X, Z)
        H.astype("<f4").tofile(os.path.join(OUT, f"terrain_{lvl}.bin"))
        tw, th = TEX[lvl]; TXX, TZZ = grid(lvl, tw, th); mpp = (gx - 1) * st / tw
        def gfn(x, z):
            h, d, i, n1 = height(x, z); c, m = ground(x, z, h, d, i, n1, mpp)
            depth = np.clip(-h, 0, 25.5) * 10; sh = np.clip(np.abs(d), 0, 255); foam = np.clip(n1 * 255, 0, 255)
            return c, m, depth, sh, foam
        C, M, DE, SH, FO = chunked(gfn, TXX, TZZ, rows=48)
        Image.fromarray(np.dstack([C, M]), "RGBA").save(os.path.join(OUT, f"ground_{lvl}.png"), optimize=True)
        Image.fromarray(np.dstack([DE, SH, FO]).astype(np.uint8), "RGB").save(os.path.join(OUT, f"shore_{lvl}.png"), optimize=True)
        meta[lvl] = dict(x0=x0, z0=z0, step=st, nx=gx, nz=gz, w=(gx - 1) * st, h=(gz - 1) * st, tex=[tw, th],
                         hmin=float(H.min()), hmax=float(H.max()))
        print(lvl, H.shape, "h", round(float(H.min()), 1), round(float(H.max()), 1), "tex", tw, th, flush=True)
    # placements (heights from the same function)
    fx = np.array([f[0] for f in FARMS]); fz = np.array([f[1] for f in FARMS]); fh, fd, _, _ = height(fx, fz)
    farms = [dict(x=float(x), z=float(z), y=float(y), rot=r, v=v) for (x, z, r, v), y, dd in zip(FARMS, fh, fd) if dd > 35 and v < 4
             and runway_mask(np.array([x]), np.array([z]), WRY, 40)[0] < 0.05 and runway_mask(np.array([x]), np.array([z]), PPW, 40)[0] < 0.05]
    r = np.random.RandomState(17); sx, sz = [], []
    for cx, cz, n, rad in [(-260, 160, 14, 140), (2700, 60, 16, 160), (2980, -420, 10, 120), (-500, -500, 12, 200), (3100, 700, 12, 200), (-1100, 600, 14, 300)]:
        a = r.uniform(0, 2 * np.pi, n); rr = rad * np.sqrt(r.uniform(0, 1, n)); sx += list(cx + rr * np.cos(a)); sz += list(cz + rr * np.sin(a))
    sx, sz = np.array(sx), np.array(sz); sh, sd, _, _ = height(sx, sz)
    ok = (sd > 25) & (runway_mask(sx, sz, WRY, 25) < 0.05) & (runway_mask(sx, sz, PPW, 25) < 0.05)
    sheep = [dict(x=float(x), z=float(z), y=float(y), rot=float(r.uniform(0, 6.28)), s=int(r.randint(0, 1000))) for x, z, y in zip(sx[ok], sz[ok], sh[ok])]
    places = dict(levels={k: meta.get(k) for k in levels}, WRY=WRY, PPW=PPW, farms=farms, sheep=sheep, roads=ROADS,
                  outlines={name: P.round(1).tolist() for name, P in OUTLINES})
    old = {}
    p = os.path.join(DATA, "places.json")
    if os.path.exists(p): old = json.load(open(p))
    if "levels" in old: places["levels"] = {**old["levels"], **places["levels"]}
    json.dump(places, open(p, "w"))
    print("farms", len(farms), "sheep", len(sheep))

if __name__ == "__main__":
    main(sys.argv[1:] or list(LEVELS))
