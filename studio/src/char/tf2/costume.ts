// TF2 costumes: the TwistFrame hero for Character 2.0. Extends the approved odo5 Costume type WITHOUT modifying odo5 or the
// approved PoToon costume definitions (the approved films keep their goggles + brown gloves untouched).
import type { Costume } from "../odo5";
import { HERO } from "../../productions/postoffice/chars";

/** glasses designs available to TF2 characters (geometry in glasses.ts) */
export type GlassesKind = "panto" | "none";
export type TF2Costume = Costume & { glasses?: GlassesKind; whiteHands?: boolean };
/** BEFORE the visual fix (identical to the earlier Character 2.0 hero): forehead goggles, brown gloves */
export const TF2_HERO_V0: TF2Costume = { ...HERO };
/** the Character 2.0 hero: same identity, white hands, modern panto glasses instead of the forehead goggles */
export const TF2_HERO: TF2Costume = { ...HERO, goggles: false, glasses: "panto", whiteHands: true };
