// Curated real-recording sound library (Mixkit SFX Free License + Kenney CC0 packs). Mixkit: full-quality WAV from the
// site's free download (no account); licence: free for commercial + personal projects, no attribution, NO standalone
// redistribution (kept in the gitignored cache only, never committed to the public repository).
// Each entry: [mixkitId, category, tags, era-suitability, use]. "any" = no era-specific sound (fine for the 1940s).
export const MIXKIT = [
  // footsteps (surfaces)
  [1921, "footsteps", ["grass", "walk"], "any", "walking on grass"], [1920, "footsteps", ["grass", "step", "single"], "any", "single grass step"], [1922, "footsteps", ["grass", "heavy", "single"], "any", "heavy grass step"],
  [1269, "footsteps", ["stone", "walk", "loop"], "any", "walking on stones"], [1274, "footsteps", ["gravel", "road", "fast", "loop"], "any", "crunchy road walk"], [542, "footsteps", ["heels", "pavement"], "any", "heels on pavement"],
  [543, "footsteps", ["tunnel", "concrete", "reverb", "loop"], "any", "footsteps in a tunnel (hangar-like reverb)"], [1222, "footsteps", ["leaves", "forest"], "any", "dry leaves"], [537, "footsteps", ["mud"], "any", "deep mud"],
  [630, "crowd", ["marching", "military", "troops"], "1900s", "small parade, marching troops"],
  // vehicles + engines
  [1536, "vehicles", ["car", "old", "arrive", "vintage"], "1930s", "old car arriving"], [1561, "vehicles", ["car", "start"], "1950s", "cars starting"], [1565, "vehicles", ["car", "horn", "classic"], "1930s", "classic car horn"],
  [1564, "vehicles", ["car", "door", "slam"], "any", "car door slam"], [1621, "vehicles", ["truck", "drive", "steady"], "1950s", "truck driving steady"], [1626, "vehicles", ["truck", "stop", "brake"], "1950s", "truck stopping"],
  [1620, "vehicles", ["truck", "slow"], "1950s", "truck slowing down"], [1623, "vehicles", ["truck", "start", "engine"], "1950s", "truck engine start"], [1599, "vehicles", ["tractor", "drive"], "1940s", "tractor driving away"],
  [2706, "vehicles", ["bus", "pass", "city"], "1960s", "bus passing"], [2756, "vehicles", ["tank", "military", "old", "tracks"], "1940s", "very old war tank (tracked machine)"],
  [1630, "vehicles", ["train", "steam", "pass"], "1900s", "steam train passing"], [1654, "vehicles", ["train", "horn", "distant"], "1930s", "distant train horn"], [1628, "vehicles", ["train", "old", "depart"], "1900s", "old train departure"],
  [1634, "vehicles", ["train", "station", "idle"], "1930s", "train waiting at station"], [3077, "vehicles", ["ship", "engine", "loop"], "1940s", "ship engine loop"], [3076, "vehicles", ["ship", "hull", "creak"], "any", "ship hull creak"],
  [1183, "vehicles", ["motorboat", "sea"], "1950s", "motorboat on the sea"], [1187, "vehicles", ["ship", "wooden", "sea"], "1900s", "wooden ship at sea"], [2715, "aircraft", ["helicopter", "far"], "1960s", "helicopter far away (no WWII prop aircraft recording available)"],
  // construction + factory + tools
  [833, "tools", ["hammer", "metal", "hit"], "any", "metal hammer hit"], [830, "tools", ["hammer", "wood", "hit"], "any", "hammer on wood"], [827, "tools", ["saw", "hand", "wood"], "any", "hand saw on wood"],
  [810, "tools", ["tape", "measure"], "1940s", "tape measure extend"], [831, "tools", ["metal", "tools", "search"], "any", "rummaging metal tools"], [853, "tools", ["wrench", "metal"], "any", "wrench metal noises"],
  [835, "tools", ["metal", "drop"], "any", "metal tool drop"], [837, "tools", ["hammer", "wood", "put-down"], "any", "wooden hammer put down"], [824, "factory", ["welding", "sparks"], "1930s", "welding and sparks"],
  [798, "factory", ["hammering", "metal", "light"], "any", "light hammering on metal (riveting feel)"], [2980, "factory", ["metal", "hit", "hard"], "any", "factory metal hard hit"], [200, "factory", ["door", "metal", "sliding", "industrial"], "any", "industrial metal sliding door"],
  [1534, "factory", ["door", "metal", "sliding"], "any", "metallic sliding door"], [2504, "factory", ["machine", "hum", "industrial", "ambience"], "any", "industrial machine hum"], [797, "construction", ["wooden", "assembly", "ambience"], "any", "wooden construction assembly ambience"],
  [801, "construction", ["site", "indoors", "ambience"], "any", "construction site indoors"], [803, "construction", ["machinery", "ambience"], "1950s", "construction machinery ambience"], [800, "construction", ["bulldozer", "ambience"], "1950s", "construction place + bulldozer"],
  [804, "construction", ["truck", "loading", "dirt"], "1950s", "truck loading dirt"], [813, "construction", ["cement", "mixer"], "1930s", "cement mixer stops"], [388, "construction", ["bricks", "falling"], "any", "falling bricks"],
  [1923, "tools", ["shovel", "stab"], "any", "shovel stab"], [834, "tools", ["drawer", "tool"], "any", "tool drawer opening"],
  // birds + nature + weather
  [17, "birds", ["songbirds", "trees"], "any", "little birds in trees"], [2472, "birds", ["morning", "dawn"], "any", "morning birds"], [20, "birds", ["geese", "flock"], "any", "flock of wild geese"],
  [1188, "birds", ["seagull", "sea"], "any", "sea birds squeak"], [62, "birds", ["raven", "crow"], "any", "raven call"], [2432, "birds", ["wings", "flap"], "any", "bird singing + flapping wings"],
  [2658, "wind", ["ambience", "blowing"], "any", "wind blowing ambience"], [2427, "wind", ["breeze", "trees"], "any", "breeze through trees"], [1267, "wind", ["mountain", "high"], "any", "wind on a mountain top (aerial bed)"],
  [1201, "wind", ["sea", "breeze", "strong"], "any", "strong sea breeze"], [1206, "water", ["sea", "waves", "coast"], "any", "sea coast waves"], [1208, "water", ["harbour", "waves", "rocks"], "any", "small waves at harbour rocks"],
  [2454, "water", ["river", "flowing"], "any", "river flowing"], [1311, "water", ["splash"], "any", "water splash"], [1253, "weather", ["rain", "light", "loop"], "any", "light rain"], [1265, "weather", ["rain", "metal", "roof"], "any", "heavy rain on a metal roof"],
  [2395, "weather", ["thunder", "storm"], "any", "thunder rumble"],
  // doors, office, clocks (period-safe)
  [201, "doors", ["metal", "door", "close"], "any", "metal door close"], [1637, "doors", ["train", "door", "open"], "1930s", "train door open"], [182, "doors", ["sliding", "door", "light"], "any", "light sliding door close"],
  [1372, "office", ["typewriter", "typing", "old"], "1900s", "old typewriter typing"], [1368, "office", ["typewriter", "bell", "return"], "1900s", "typewriter return bell"], [2379, "office", ["paper", "papers"], "any", "papers moved"],
  [2995, "office", ["stapler"], "any", "stapling paper"], [1350, "office", ["telephone", "ring"], "1960s", "office telephone ring (later style)"], [1060, "office", ["clock", "tick"], "any", "wall clock tick tock"], [1072, "office", ["clock", "pendulum"], "1900s", "old pendulum clock"],
  // crowd + city ambience (no shouting)
  [444, "crowd", ["restaurant", "talking", "ambience"], "any", "restaurant crowd talk"], [361, "crowd", ["city", "downtown", "ambience"], "any", "downtown crowd ambience"], [485, "crowd", ["applause", "medium"], "any", "medium crowd applause"],
  [2930, "city", ["traffic", "background"], "1960s", "city traffic background (modern-ish: use far under)"], [371, "city", ["suburban", "birds"], "any", "suburban ambience + birds"], [370, "city", ["rain", "traffic", "church-bells"], "any", "rain, traffic, church bells"],
  // cinematic transitions (subtle)
  [1489, "transitions", ["whoosh", "air", "soft"], "any", "air woosh"], [1486, "transitions", ["whoosh", "tunnel", "reverb"], "any", "cinematic tunnel woosh"], [1474, "transitions", ["swoosh", "wind"], "any", "windy transition swoosh"],
  [1482, "transitions", ["swoosh", "wind", "ending"], "any", "ending wind swoosh"], [163, "transitions", ["swoosh", "slow", "sweep"], "any", "slow sweeping swoosh"], [2282, "transitions", ["brass", "hum", "cinematic"], "any", "cinematic brass hum transition"],
];
