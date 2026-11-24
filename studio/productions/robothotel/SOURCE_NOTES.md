# Robot Hotel: source notes

These facts were used for planning only. The video shows an original, unbranded "robot hotel": no real logo, name or likeness.

## The story
- **The hotel:** Henn na Hotel ("Weird Hotel") opened in July 2015 at Huis Ten Bosch, near Nagasaki, Japan, staffed largely by robots.
  - Its robots included velociraptor-style check-in robots, humanoid receptionists, luggage robots and an in-room assistant doll (Churi).
- **The cuts:** in January 2019, as first reported by the Wall Street Journal, the hotel retired more than half of its 243 robots.
  - Velociraptor receptionists that needed human help, e.g. copying passports.
  - Concierge robots that couldn't answer simple questions.
  - Luggage robots that could reach only some rooms.
  - Churi, which mistook guests' snoring for voice commands and woke them up.
- **The reason:** staff kept having to fix the robots' mistakes, so the robots created work rather than saving it.

Coverage used:
- NPR: https://www.npr.org/2019/01/28/689473868/this-time-humans-triumph-over-robots-as-they-take-back-hotel-jobs
- Gizmodo: https://gizmodo.com/robots-ruin-robot-hotel-1831772555
- Engadget: https://engadget.com/2019/01/16/japan-robot-hotel-fires-over-half-its-robots

**Design choice:** the robots in the film are original designs (a bow-tied raptor, a capsule concierge, a luggage cart, an egg-shaped bedside assistant). They are not copies of the real products.

## 3D models and textures
- **Source:** Poly Haven, CC0 (no attribution required, redistribution allowed).
- **Furniture models:** listed with author and source URL in `studio/public/hotel/m/assets.json`.
- **Textures:** listed in `studio/public/hotel/t/textures.json`.
- **Processing:** models were converted with `tools/tf-ext/assets/prepare-set.mjs`: base-centre origin, textures capped at 512 px.
