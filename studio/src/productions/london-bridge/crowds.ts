// Crowd gate input for the new London + Arizona groups (scripts/check-crowd.ts). The approved Reopening crowd is
// checked by its own module (unchanged).
import { LONDON_PEOPLE } from "./londonTimeline";
import { CREW } from "./worksTimeline";
import { personPose, type Persona } from "../../char/crowdLife";
export const FILM_FRAMES = 1771;
const G = [...LONDON_PEOPLE, ...CREW];
export const PERSONAS: Persona[] = G.map((g) => g.P);
export const crowdPose = (i: number, f: number) => personPose(PERSONAS[i], f, { loop: 100000, subjectX: () => 0.3 });
