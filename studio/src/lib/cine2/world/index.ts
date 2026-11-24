// World 2.0 public API (opt-in). Importing it registers the whole object library.
import "./objects/street";
import "./objects/works";
export * from "./kit";
export * from "./place";
export * from "./recipes";
export * from "./life";
export { building, buildingBox, type BuildingSpec, type BuildingStyle } from "./building";
