// Centennial cast: the approved earless odo5 cards (face glow + halo via the postoffice PoToon renderer, unchanged).
// Costumes per era: 1901 volunteers (red bib shirt / white shirt, moustaches, black leather fire helmets), the power
// company's electrician (bowler), 1912 + 1938 uniformed firemen (navy, peaked cap or helmet), 1970s firefighters
// (navy work shirt, tan turnout coat, black helmet), modern crew (station navy), townsfolk.
import { COSTUME, type Costume } from "../../char/odo5";
import { HERO } from "../postoffice/chars";
export { HERO };
export { PoToon as Toon, cardPx, handPx, type Placed } from "../postoffice/chars";

const C = (o: Partial<Costume> & { pal: Record<string, string> }): Costume => ({ goggles: false, hairs: false, tufts: true, hat: null, stache: false, suit: false, apron: false, ...o });
const helmet = (col = "#17130f", shade = "#2e2620", shield = "#1f1a16") => ({ hat: col, hatShade: shade, band: shield });
// ---- 1901 volunteers + the electrician
export const VOL_RED = C({ hat: "fire", stache: true, pal: { shirt: "#a8322a", shirtShade: "#86241e", collar: "#f2e8d2", hair: "#3a2a1e", belt: "#2a1e14", buckle: "#c9a040", ...helmet() } });
export const VOL_WHITE = C({ stache: false, pal: { shirt: "#ece4d2", shirtShade: "#cfc4ac", collar: "#f6f0e2", hair: "#7a5a3a", belt: "#3a2a1e", buckle: "#c9a040", tie: "#2a2a30" } });
export const VOL_NAVY = C({ hat: "fire", stache: true, pal: { shirt: "#2b3a5c", shirtShade: "#1e2a44", collar: "#e8e0cc", hair: "#1e1a16", belt: "#1a1410", buckle: "#c9a040", ...helmet("#1a1612", "#30281f", "#7a1f1a") } });
export const ELECTRICIAN = { ...COSTUME.clerk, stache: true, pal: { ...COSTUME.clerk.pal, shirt: "#5a4a3a", shirtShade: "#433628", tie: "#7a2d22", hat: "#2a2420", hatShade: "#1a1612", hair: "#3a2a20" } } as Costume;
export const TOWN_A = { ...COSTUME.clerk, pal: { ...COSTUME.clerk.pal, shirt: "#3a3a2e", shirtShade: "#2a2a20", hat: "#3a3028", hatShade: "#2a2018", tie: "#6a2a22" } } as Costume;
export const TOWN_B = C({ hat: "cowboy", stache: true, pal: { shirt: "#7a5a38", shirtShade: "#5a4028", hair: "#4a3020", hat: "#c9a87a", hatShade: "#a8885a", band: "#4a3020", collar: "#efe6d0" } });
// ---- 1912 / 1938 uniformed firemen
export const FIRE12 = C({ hat: "fire", stache: true, pal: { shirt: "#24304a", shirtShade: "#182236", collar: "#d9b24a", hair: "#2a201a", belt: "#141210", buckle: "#d9b24a", ...helmet() } });
export const FIRE38 = C({ hat: "pilot", stache: false, pal: { shirt: "#1f2b44", shirtShade: "#141d30", collar: "#f2ecdc", tie: "#141414", hair: "#2a201a", hat: "#1f2b44", hatShade: "#141d30", band: "#0e1422", pocket: "#d9b24a" } });
export const FIRE38B = C({ hat: null, stache: true, pal: { shirt: "#2a3654", shirtShade: "#1c2640", collar: "#f2ecdc", tie: "#141414", hair: "#6a4a2e" } });
// ---- 1970s / modern
export const FIRE76 = C({ hat: "fire", stache: true, pal: { shirt: "#b39a62", shirtShade: "#8f7a48", collar: "#2a2a28", hair: "#5a3a22", belt: "#e8ef6a", buckle: "#2a2a28", ...helmet("#151515", "#2c2c2c", "#f2f0ea") } });
export const FIRE76B = C({ hat: null, stache: false, pal: { shirt: "#22304a", shirtShade: "#162236", collar: "#22304a", hair: "#2a1e16", tie: "#22304a" } });
export const FIRE_MOD = C({ hat: null, stache: false, pal: { shirt: "#1d2a40", shirtShade: "#131d2e", collar: "#1d2a40", hair: "#3a2a20", belt: "#141414", buckle: "#9aa3ad" } });
export const FIRE_MOD_GEAR = C({ hat: "fire", stache: true, pal: { shirt: "#b8a066", shirtShade: "#92804a", collar: "#2a2a28", hair: "#1e1a16", belt: "#e8ef6a", buckle: "#2a2a28", ...helmet("#e8b81e", "#c49610", "#151515") } });
