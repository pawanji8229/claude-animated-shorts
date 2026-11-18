// Profiling switches (render with --props='{"off":["reef",...]}'); empty in production renders.
import { getInputProps } from "remotion";
let off: string[] = []; try { off = ((getInputProps() as { off?: string[] }).off) ?? []; } catch { off = []; }
export const OFF = (k: string) => off.includes(k);
export const PROFILE = off.length > 0;
