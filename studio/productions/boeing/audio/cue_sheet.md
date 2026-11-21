# Sound cue sheet (0–51.64 s; loop-safe: True)

Narration-priority mix. Narration -25.4 LUFS is the reference; event levels are peak dB under the narration peak, beds are LU under the narration loudness. Ducking under speech: {'sfx': -4, 'crowd': -8, 'ambience': -6, 'music': -10}. Word masking guard: every word ≥ 15 dB above all other layers in the 300–4000 Hz speech band (worst word before guard 16.0 dB, after 16.0 dB; 0 guard cuts). Master +9.4 dB → -16.1 LUFS, -1.1 dBTP.

Measured stem loudness vs narration (LU): {'sfx': np.float64(-24.1), 'crowd': None, 'ambience': np.float64(-30.8), 'music': np.float64(-32.5)}

All effects are procedurally synthesised in `studio/audio/` (no third-party recordings).

| frame | start s | end s | source / object | generator | stem | level | pan |
|---|---|---|---|---|---|---|---|
| 0 | 0.000 | 5.867 | ambience segment: roof_day (0.5 s equal-power crossfades) | ambience_roof_day | bed | see preset | stereo wide |
| 0 | 0.000 | 51.644 | sparse soft 1930s-style piano + brushes (original) (continuous, loop-safe) | music | bed | -24 LU re narration | stereo wide |
| 96 | 2.200 | 3.800 | camera glides over the roof edge (scale reveal) | soft_whoosh | sfx | -32.0 dB re narration peak | +0.10 |
| 176 | 5.867 | 8.400 | ambience segment: aerial_high (0.5 s equal-power crossfades) | ambience_aerial_high | bed | see preset | stereo wide |
| 214 | 6.133 | 7.733 | camera climbs to the high aerial | soft_whoosh | sfx | -31.8 dB re narration peak | -0.20 |
| 252 | 8.400 | 13.800 | ambience segment: street1942 (0.5 s equal-power crossfades) | ambience_street1942 | bed | see preset | stereo wide |
| 257 | 8.567 | 8.807 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -44.4 dB re narration peak | -0.05 |
| 262 | 8.733 | 11.933 | a steel door leaf rolls open on its track | hangar_door | sfx | -23.4 dB re narration peak | -0.10 |
| 264 | 8.800 | 9.040 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -39.3 dB re narration peak | +0.04 |
| 270 | 9.000 | 9.240 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -38.1 dB re narration peak | +0.12 |
| 277 | 9.233 | 9.473 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -36.4 dB re narration peak | +0.24 |
| 284 | 9.467 | 9.707 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -35.7 dB re narration peak | +0.37 |
| 288 | 9.600 | 9.840 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -39.3 dB re narration peak | -0.26 |
| 290 | 9.667 | 9.907 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -36.0 dB re narration peak | +0.50 |
| 294 | 9.800 | 10.040 | C: walker 1 footstep (concrete) | step_concrete_r | sfx | -39.4 dB re narration peak | -0.19 |
| 297 | 9.900 | 10.140 | C: walker 0 footstep (concrete) | step_concrete_r | sfx | -38.2 dB re narration peak | -0.23 |
| 297 | 9.900 | 10.140 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -33.3 dB re narration peak | +0.67 |
| 378 | 10.000 | 14.500 | a 1940s truck rolls along Marginal Way and brakes at the plant | truck42 | sfx | -19.3 dB re narration peak | +0.30 |
| 301 | 10.033 | 10.273 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -38.5 dB re narration peak | -0.11 |
| 302 | 10.067 | 13.267 | the next leaf follows | hangar_door | sfx | -26.9 dB re narration peak | +0.25 |
| 303 | 10.100 | 10.340 | C: walker 0 footstep (concrete) | step_concrete_l | sfx | -37.1 dB re narration peak | -0.17 |
| 304 | 10.133 | 10.373 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -34.8 dB re narration peak | +0.85 |
| 307 | 10.233 | 10.473 | C: walker 1 footstep (concrete) | step_concrete_r | sfx | -37.0 dB re narration peak | -0.05 |
| 310 | 10.333 | 10.573 | C: walker 0 footstep (concrete) | step_concrete_r | sfx | -37.6 dB re narration peak | -0.10 |
| 310 | 10.333 | 10.573 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -34.2 dB re narration peak | +0.85 |
| 313 | 10.433 | 10.673 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -37.9 dB re narration peak | +0.01 |
| 316 | 10.533 | 10.773 | C: walker 0 footstep (concrete) | step_concrete_l | sfx | -38.5 dB re narration peak | -0.05 |
| 317 | 10.567 | 10.807 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -33.1 dB re narration peak | +0.85 |
| 319 | 10.633 | 10.873 | C: walker 1 footstep (concrete) | step_concrete_r | sfx | -36.0 dB re narration peak | +0.07 |
| 323 | 10.767 | 11.007 | C: walker 0 footstep (concrete) | step_concrete_r | sfx | -35.6 dB re narration peak | +0.01 |
| 324 | 10.800 | 11.040 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -32.0 dB re narration peak | +0.85 |
| 326 | 10.867 | 11.107 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -36.2 dB re narration peak | +0.13 |
| 329 | 10.967 | 11.207 | C: walker 0 footstep (concrete) | step_concrete_l | sfx | -35.2 dB re narration peak | +0.05 |
| 330 | 11.000 | 11.240 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -30.1 dB re narration peak | +0.85 |
| 332 | 11.067 | 11.307 | C: walker 1 footstep (concrete) | step_concrete_r | sfx | -34.7 dB re narration peak | +0.18 |
| 335 | 11.167 | 11.407 | C: walker 0 footstep (concrete) | step_concrete_r | sfx | -35.1 dB re narration peak | +0.09 |
| 337 | 11.233 | 11.473 | C: walker 2 footstep (concrete) | step_concrete_r | sfx | -38.8 dB re narration peak | -0.45 |
| 337 | 11.233 | 11.473 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -31.1 dB re narration peak | +0.85 |
| 338 | 11.267 | 11.507 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -34.6 dB re narration peak | +0.22 |
| 342 | 11.400 | 11.640 | C: walker 0 footstep (concrete) | step_concrete_l | sfx | -36.9 dB re narration peak | +0.13 |
| 344 | 11.467 | 11.707 | C: walker 1 footstep (concrete) | step_concrete_r | sfx | -35.0 dB re narration peak | +0.26 |
| 344 | 11.467 | 11.707 | C: walker 2 footstep (concrete) | step_concrete_l | sfx | -38.6 dB re narration peak | -0.45 |
| 344 | 11.467 | 11.707 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -30.9 dB re narration peak | +0.85 |
| 348 | 11.600 | 11.840 | C: walker 0 footstep (concrete) | step_concrete_r | sfx | -36.4 dB re narration peak | +0.16 |
| 350 | 11.667 | 11.907 | C: walker 2 footstep (concrete) | step_concrete_r | sfx | -38.8 dB re narration peak | -0.45 |
| 350 | 11.667 | 11.907 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -28.3 dB re narration peak | +0.85 |
| 351 | 11.700 | 11.940 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -33.9 dB re narration peak | +0.31 |
| 355 | 11.833 | 12.073 | C: walker 0 footstep (concrete) | step_concrete_l | sfx | -33.7 dB re narration peak | +0.19 |
| 357 | 11.900 | 12.140 | C: walker 1 footstep (concrete) | step_concrete_r | sfx | -33.6 dB re narration peak | +0.34 |
| 357 | 11.900 | 12.140 | C: walker 2 footstep (concrete) | step_concrete_l | sfx | -36.2 dB re narration peak | -0.45 |
| 357 | 11.900 | 12.140 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -30.6 dB re narration peak | +0.85 |
| 361 | 12.033 | 12.273 | C: walker 0 footstep (concrete) | step_concrete_r | sfx | -33.5 dB re narration peak | +0.22 |
| 363 | 12.100 | 12.340 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -32.6 dB re narration peak | +0.37 |
| 364 | 12.133 | 12.373 | C: walker 2 footstep (concrete) | step_concrete_r | sfx | -36.7 dB re narration peak | -0.46 |
| 364 | 12.133 | 12.373 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -29.7 dB re narration peak | +0.85 |
| 367 | 12.233 | 12.473 | C: walker 0 footstep (concrete) | step_concrete_l | sfx | -34.4 dB re narration peak | +0.24 |
| 369 | 12.300 | 12.540 | C: walker 1 footstep (concrete) | step_concrete_r | sfx | -33.5 dB re narration peak | +0.41 |
| 370 | 12.333 | 12.573 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -27.9 dB re narration peak | +0.85 |
| 371 | 12.367 | 12.607 | C: walker 2 footstep (concrete) | step_concrete_l | sfx | -36.1 dB re narration peak | -0.47 |
| 373 | 12.433 | 12.673 | C: walker 4 footstep (concrete) | step_concrete_r | sfx | -39.6 dB re narration peak | -0.85 |
| 374 | 12.467 | 12.707 | C: walker 0 footstep (concrete) | step_concrete_r | sfx | -32.3 dB re narration peak | +0.27 |
| 376 | 12.533 | 12.773 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -33.9 dB re narration peak | +0.44 |
| 377 | 12.567 | 12.807 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -27.9 dB re narration peak | +0.85 |
| 378 | 12.600 | 12.840 | C: walker 2 footstep (concrete) | step_concrete_r | sfx | -35.1 dB re narration peak | -0.48 |
| 380 | 12.667 | 12.907 | C: walker 0 footstep (concrete) | step_concrete_l | sfx | -33.6 dB re narration peak | +0.29 |
| 381 | 12.700 | 12.940 | C: walker 4 footstep (concrete) | step_concrete_l | sfx | -37.5 dB re narration peak | -0.85 |
| 382 | 12.733 | 12.973 | C: walker 1 footstep (concrete) | step_concrete_r | sfx | -32.3 dB re narration peak | +0.48 |
| 383 | 12.767 | 13.007 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -27.5 dB re narration peak | +0.85 |
| 384 | 12.800 | 13.040 | C: walker 2 footstep (concrete) | step_concrete_l | sfx | -36.8 dB re narration peak | -0.49 |
| 387 | 12.900 | 13.140 | C: walker 0 footstep (concrete) | step_concrete_r | sfx | -32.3 dB re narration peak | +0.31 |
| 388 | 12.933 | 13.173 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -33.4 dB re narration peak | +0.51 |
| 388 | 12.933 | 13.173 | C: walker 4 footstep (concrete) | step_concrete_r | sfx | -38.6 dB re narration peak | -0.85 |
| 390 | 13.000 | 13.240 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -28.9 dB re narration peak | +0.85 |
| 391 | 13.033 | 13.273 | C: walker 2 footstep (concrete) | step_concrete_r | sfx | -34.7 dB re narration peak | -0.51 |
| 393 | 13.100 | 13.340 | C: walker 0 footstep (concrete) | step_concrete_l | sfx | -32.1 dB re narration peak | +0.34 |
| 394 | 13.133 | 13.373 | C: walker 1 footstep (concrete) | step_concrete_r | sfx | -32.6 dB re narration peak | +0.56 |
| 395 | 13.167 | 13.407 | C: walker 4 footstep (concrete) | step_concrete_l | sfx | -37.5 dB re narration peak | -0.85 |
| 397 | 13.233 | 13.473 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -30.3 dB re narration peak | +0.85 |
| 398 | 13.267 | 13.507 | C: walker 2 footstep (concrete) | step_concrete_l | sfx | -35.4 dB re narration peak | -0.52 |
| 399 | 13.300 | 13.540 | C: walker 0 footstep (concrete) | step_concrete_r | sfx | -32.2 dB re narration peak | +0.37 |
| 401 | 13.367 | 13.607 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -29.9 dB re narration peak | +0.61 |
| 403 | 13.433 | 13.673 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -28.2 dB re narration peak | +0.85 |
| 403 | 13.433 | 13.673 | C: walker 4 footstep (concrete) | step_concrete_r | sfx | -38.5 dB re narration peak | -0.85 |
| 405 | 13.500 | 13.740 | C: walker 2 footstep (concrete) | step_concrete_r | sfx | -34.8 dB re narration peak | -0.52 |
| 406 | 13.533 | 13.773 | C: walker 0 footstep (concrete) | step_concrete_l | sfx | -30.7 dB re narration peak | +0.42 |
| 407 | 13.567 | 13.807 | C: walker 1 footstep (concrete) | step_concrete_r | sfx | -31.4 dB re narration peak | +0.67 |
| 410 | 13.667 | 13.907 | C: walker 3 footstep (concrete) | step_concrete_l | sfx | -29.6 dB re narration peak | +0.85 |
| 410 | 13.667 | 13.907 | C: walker 4 footstep (concrete) | step_concrete_l | sfx | -35.8 dB re narration peak | -0.85 |
| 412 | 13.733 | 13.973 | C: walker 0 footstep (concrete) | step_concrete_r | sfx | -33.4 dB re narration peak | +0.47 |
| 412 | 13.733 | 13.973 | C: walker 2 footstep (concrete) | step_concrete_l | sfx | -35.6 dB re narration peak | -0.51 |
| 413 | 13.767 | 14.007 | C: walker 1 footstep (concrete) | step_concrete_l | sfx | -32.0 dB re narration peak | +0.74 |
| 414 | 13.800 | 17.133 | ambience segment: factory_floor (0.5 s equal-power crossfades) | ambience_factory_floor | bed | see preset | stereo wide |
| 415 | 13.833 | 14.073 | D: walker 19 footstep (concrete) | step_concrete_r | sfx | -43.3 dB re narration peak | +0.65 |
| 417 | 13.900 | 14.140 | C: walker 3 footstep (concrete) | step_concrete_r | sfx | -36.4 dB re narration peak | +0.85 |
| 417 | 13.900 | 14.140 | C: walker 4 footstep (concrete) | step_concrete_r | sfx | -43.3 dB re narration peak | -0.85 |
| 421 | 14.033 | 14.273 | D: walker 19 footstep (concrete) | step_concrete_l | sfx | -34.1 dB re narration peak | +0.74 |
| 425 | 14.167 | 15.597 | D: riveter 17 drives a rivet | rivet_burst | sfx | -37.7 dB re narration peak | +0.72 |
| 427 | 14.233 | 14.473 | D: walker 19 footstep (concrete) | step_concrete_r | sfx | -32.3 dB re narration peak | +0.81 |
| 432 | 14.400 | 14.640 | D: walker 20 footstep (concrete) | step_concrete_l | sfx | -38.1 dB re narration peak | +0.28 |
| 434 | 14.467 | 14.707 | D: walker 19 footstep (concrete) | step_concrete_l | sfx | -31.3 dB re narration peak | +0.81 |
| 438 | 14.600 | 14.840 | D: walker 20 footstep (concrete) | step_concrete_r | sfx | -37.3 dB re narration peak | +0.35 |
| 440 | 14.667 | 14.907 | D: walker 19 footstep (concrete) | step_concrete_r | sfx | -28.3 dB re narration peak | +0.72 |
| 440 | 14.667 | 15.635 | D: riveter 16 drives a rivet | rivet_burst | sfx | -34.5 dB re narration peak | +0.85 |
| 444 | 14.800 | 15.040 | D: walker 20 footstep (concrete) | step_concrete_l | sfx | -36.0 dB re narration peak | +0.40 |
| 446 | 14.867 | 15.107 | D: walker 19 footstep (concrete) | step_concrete_l | sfx | -26.0 dB re narration peak | +0.51 |
| 449 | 14.967 | 15.207 | D: walker 20 footstep (concrete) | step_concrete_r | sfx | -37.9 dB re narration peak | +0.44 |
| 450 | 15.000 | 15.240 | D: walker 18 footstep (concrete) | step_concrete_l | sfx | -38.5 dB re narration peak | +0.85 |
| 452 | 15.067 | 15.307 | D: walker 19 footstep (concrete) | step_concrete_r | sfx | -24.4 dB re narration peak | +0.12 |
| 455 | 15.167 | 15.407 | D: walker 20 footstep (concrete) | step_concrete_l | sfx | -36.8 dB re narration peak | +0.48 |
| 458 | 15.267 | 15.507 | D: walker 18 footstep (concrete) | step_concrete_r | sfx | -37.9 dB re narration peak | +0.85 |
| 458 | 15.267 | 16.550 | D: riveter 14 drives a rivet | rivet_burst | sfx | -38.2 dB re narration peak | -0.47 |
| 459 | 15.300 | 15.540 | D: walker 19 footstep (concrete) | step_concrete_l | sfx | -23.7 dB re narration peak | -0.64 |
| 461 | 15.367 | 15.607 | D: walker 20 footstep (concrete) | step_concrete_r | sfx | -34.9 dB re narration peak | +0.53 |
| 463 | 15.433 | 16.751 | D: riveter 15 drives a rivet | rivet_burst | sfx | -37.9 dB re narration peak | -0.23 |
| 463 | 15.433 | 16.638 | D: riveter 17 drives a rivet | rivet_burst | sfx | -32.5 dB re narration peak | +0.85 |
| 464 | 15.467 | 15.707 | D: walker 18 footstep (concrete) | step_concrete_l | sfx | -37.1 dB re narration peak | +0.85 |
| 465 | 15.500 | 15.740 | D: walker 19 footstep (concrete) | step_concrete_r | sfx | -23.8 dB re narration peak | -0.85 |
| 467 | 15.567 | 15.807 | D: walker 20 footstep (concrete) | step_concrete_l | sfx | -32.9 dB re narration peak | +0.59 |
| 470 | 15.667 | 16.167 | a bucking bar set down on the scaffold | tool_clink | sfx | -34.8 dB re narration peak | -0.30 |
| 471 | 15.700 | 15.940 | D: walker 18 footstep (concrete) | step_concrete_r | sfx | -36.8 dB re narration peak | +0.85 |
| 471 | 15.700 | 15.940 | D: walker 19 footstep (concrete) | step_concrete_l | sfx | -23.4 dB re narration peak | -0.85 |
| 473 | 15.767 | 16.007 | D: walker 20 footstep (concrete) | step_concrete_r | sfx | -33.5 dB re narration peak | +0.67 |
| 479 | 15.967 | 16.207 | D: walker 18 footstep (concrete) | step_concrete_l | sfx | -36.2 dB re narration peak | +0.85 |
| 479 | 15.967 | 16.207 | D: walker 20 footstep (concrete) | step_concrete_l | sfx | -31.2 dB re narration peak | +0.77 |
| 485 | 16.167 | 16.407 | D: walker 18 footstep (concrete) | step_concrete_r | sfx | -36.7 dB re narration peak | +0.85 |
| 485 | 16.167 | 16.407 | D: walker 20 footstep (concrete) | step_concrete_r | sfx | -31.2 dB re narration peak | +0.85 |
| 490 | 16.333 | 16.573 | D: walker 20 footstep (concrete) | step_concrete_l | sfx | -30.2 dB re narration peak | +0.85 |
| 492 | 16.400 | 16.640 | D: walker 18 footstep (concrete) | step_concrete_l | sfx | -34.7 dB re narration peak | +0.85 |
| 494 | 16.467 | 17.680 | D: riveter 16 drives a rivet | rivet_burst | sfx | -25.5 dB re narration peak | +0.85 |
| 496 | 16.533 | 16.773 | D: walker 20 footstep (concrete) | step_concrete_r | sfx | -29.7 dB re narration peak | +0.85 |
| 498 | 16.600 | 17.821 | D: riveter 14 drives a rivet | rivet_burst | sfx | -33.1 dB re narration peak | -0.30 |
| 499 | 16.633 | 16.873 | D: walker 18 footstep (concrete) | step_concrete_r | sfx | -35.1 dB re narration peak | +0.85 |
| 500 | 16.667 | 17.167 | a wrench on the wing jig | tool_clink | sfx | -36.2 dB re narration peak | +0.40 |
| 501 | 16.700 | 17.827 | D: riveter 17 drives a rivet | rivet_burst | sfx | -27.8 dB re narration peak | +0.85 |
| 502 | 16.733 | 16.973 | D: walker 20 footstep (concrete) | step_concrete_l | sfx | -29.6 dB re narration peak | +0.85 |
| 503 | 16.767 | 17.718 | D: riveter 13 drives a rivet | rivet_burst | sfx | -39.3 dB re narration peak | -0.79 |
| 506 | 16.867 | 17.107 | D: walker 18 footstep (concrete) | step_concrete_l | sfx | -36.9 dB re narration peak | +0.85 |
| 508 | 16.933 | 17.173 | D: walker 20 footstep (concrete) | step_concrete_r | sfx | -26.7 dB re narration peak | +0.85 |
| 510 | 17.000 | 18.410 | D: riveter 15 drives a rivet | rivet_burst | sfx | -34.9 dB re narration peak | +0.14 |
| 513 | 17.100 | 17.340 | D: walker 18 footstep (concrete) | step_concrete_r | sfx | -39.8 dB re narration peak | +0.85 |
| 514 | 17.133 | 17.373 | D: walker 20 footstep (concrete) | step_concrete_l | sfx | -30.1 dB re narration peak | +0.85 |
| 514 | 17.133 | 29.733 | ambience segment: office1942 (0.5 s equal-power crossfades) | ambience_office1942 | bed | see preset | stereo wide |
| 536 | 17.867 | 18.567 | plans slid across the model table | paper_slide | sfx | -33.1 dB re narration peak | +0.00 |
| 764 | 25.467 | 25.717 | the hero sets a tiny tree beside the model plant | model_tick | sfx | -24.9 dB re narration peak | +0.15 |
| 766 | 25.533 | 25.783 | the officer's disbelief | brow_pluck | sfx | -30.4 dB re narration peak | -0.30 |
| 797 | 26.567 | 26.817 | a second tiny tree | model_tick | sfx | -28.0 dB re narration peak | -0.10 |
| 816 | 27.200 | 28.400 | the hero gets the idea | idea_ding | sfx | -30.3 dB re narration peak | +0.25 |
| 868 | 28.933 | 29.113 | the officer's double-take | double_take | sfx | -35.3 dB re narration peak | -0.30 |
| 872 | 29.067 | 29.317 | the tiny house goes on the model roof | model_tick | sfx | -25.6 dB re narration peak | +0.05 |
| 874 | 29.133 | 29.733 | lot 40: first boards lifted off the pile | board_pick | sfx | -32.0 dB re narration peak | +0.00 |
| 892 | 29.733 | 41.333 | ambience segment: roof_day (0.5 s equal-power crossfades) | ambience_roof_day | bed | see preset | stereo wide |
| 894 | 29.800 | 30.400 | lot 39: first boards lifted off the pile | board_pick | sfx | -32.3 dB re narration peak | +0.00 |
| 899 | 29.967 | 30.287 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -30.7 dB re narration peak | +0.15 |
| 899 | 29.967 | 30.287 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -32.7 dB re narration peak | -0.25 |
| 900 | 30.000 | 30.900 | lot 40: a board sawn | saw_stroke | sfx | -36.2 dB re narration peak | +0.00 |
| 901 | 30.033 | 30.383 | F: hammerer 0 drives a nail | hammer_wood | sfx | -34.9 dB re narration peak | -0.85 |
| 902 | 30.067 | 32.667 | the derrick's hand winch hoists a lumber bundle up from the street | winch_ratchet | sfx | -29.1 dB re narration peak | +0.40 |
| 905 | 30.167 | 30.487 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -30.8 dB re narration peak | +0.23 |
| 905 | 30.167 | 30.487 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -30.5 dB re narration peak | -0.20 |
| 909 | 30.300 | 30.650 | F: hammerer 1 drives a nail | hammer_wood | sfx | -27.0 dB re narration peak | +0.85 |
| 910 | 30.333 | 31.133 | lot 40: canvas walls stretched up | canvas_flap | sfx | -31.2 dB re narration peak | +0.00 |
| 912 | 30.400 | 30.720 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -30.5 dB re narration peak | +0.33 |
| 912 | 30.400 | 30.720 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -28.7 dB re narration peak | -0.14 |
| 914 | 30.467 | 31.067 | lot 41: first boards lifted off the pile | board_pick | sfx | -33.2 dB re narration peak | +0.00 |
| 916 | 30.533 | 30.883 | F: hammerer 0 drives a nail | hammer_wood | sfx | -34.9 dB re narration peak | -0.85 |
| 919 | 30.633 | 30.953 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -28.6 dB re narration peak | +0.44 |
| 919 | 30.633 | 30.953 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -28.8 dB re narration peak | -0.07 |
| 920 | 30.667 | 31.567 | lot 39: a board sawn | saw_stroke | sfx | -36.0 dB re narration peak | +0.00 |
| 926 | 30.867 | 31.187 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -29.1 dB re narration peak | +0.56 |
| 926 | 30.867 | 31.187 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -28.2 dB re narration peak | +0.01 |
| 926 | 30.867 | 31.217 | F: hammerer 1 drives a nail | hammer_wood | sfx | -28.6 dB re narration peak | +0.85 |
| 930 | 31.000 | 31.800 | lot 39: canvas walls stretched up | canvas_flap | sfx | -31.6 dB re narration peak | +0.00 |
| 931 | 31.033 | 31.383 | F: hammerer 0 drives a nail | hammer_wood | sfx | -34.2 dB re narration peak | -0.85 |
| 934 | 31.133 | 31.453 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -27.5 dB re narration peak | +0.72 |
| 934 | 31.133 | 31.453 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -29.8 dB re narration peak | +0.12 |
| 940 | 31.333 | 31.653 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -27.0 dB re narration peak | +0.85 |
| 940 | 31.333 | 32.233 | lot 41: a board sawn | saw_stroke | sfx | -34.5 dB re narration peak | +0.00 |
| 941 | 31.367 | 31.687 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -28.2 dB re narration peak | +0.22 |
| 943 | 31.433 | 31.783 | F: hammerer 1 drives a nail | hammer_wood | sfx | -28.3 dB re narration peak | +0.85 |
| 944 | 31.467 | 32.067 | lot 42: first boards lifted off the pile | board_pick | sfx | -33.4 dB re narration peak | +0.00 |
| 946 | 31.533 | 31.883 | F: hammerer 0 drives a nail | hammer_wood | sfx | -31.3 dB re narration peak | -0.85 |
| 947 | 31.567 | 31.887 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -27.0 dB re narration peak | +0.85 |
| 947 | 31.567 | 31.887 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -29.7 dB re narration peak | +0.31 |
| 948 | 31.600 | 32.400 | lot 40: roof canvas pulled over | canvas_flap | sfx | -32.7 dB re narration peak | +0.00 |
| 950 | 31.667 | 32.467 | lot 41: canvas walls stretched up | canvas_flap | sfx | -32.2 dB re narration peak | +0.00 |
| 954 | 31.800 | 32.120 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -28.1 dB re narration peak | +0.85 |
| 954 | 31.800 | 33.200 | the roller lays the road stripe | paint_roll | sfx | -30.4 dB re narration peak | -0.45 |
| 955 | 31.833 | 32.153 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -29.2 dB re narration peak | +0.45 |
| 959 | 31.967 | 32.287 | F: walker 2 footstep (gravel) | step_gravel_r | sfx | -31.6 dB re narration peak | -0.46 |
| 961 | 32.033 | 32.353 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -29.3 dB re narration peak | +0.85 |
| 961 | 32.033 | 32.383 | F: hammerer 0 drives a nail | hammer_wood | sfx | -32.5 dB re narration peak | -0.85 |
| 961 | 32.033 | 32.383 | F: hammerer 1 drives a nail | hammer_wood | sfx | -25.7 dB re narration peak | +0.85 |
| 962 | 32.067 | 32.387 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -27.4 dB re narration peak | +0.58 |
| 966 | 32.200 | 32.520 | F: walker 2 footstep (gravel) | step_gravel_l | sfx | -30.3 dB re narration peak | -0.43 |
| 968 | 32.267 | 33.067 | lot 39: roof canvas pulled over | canvas_flap | sfx | -33.2 dB re narration peak | +0.00 |
| 969 | 32.300 | 32.620 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -27.6 dB re narration peak | +0.85 |
| 969 | 32.300 | 32.620 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -27.0 dB re narration peak | +0.72 |
| 969 | 32.300 | 32.900 | lot 43: first boards lifted off the pile | board_pick | sfx | -34.7 dB re narration peak | +0.00 |
| 970 | 32.333 | 33.233 | lot 42: a board sawn | saw_stroke | sfx | -35.9 dB re narration peak | +0.00 |
| 975 | 32.500 | 32.820 | F: walker 2 footstep (gravel) | step_gravel_r | sfx | -31.6 dB re narration peak | -0.39 |
| 975 | 32.500 | 32.820 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -28.8 dB re narration peak | +0.85 |
| 976 | 32.533 | 32.853 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -27.5 dB re narration peak | +0.85 |
| 976 | 32.533 | 32.883 | F: hammerer 0 drives a nail | hammer_wood | sfx | -30.0 dB re narration peak | -0.85 |
| 978 | 32.600 | 32.950 | F: hammerer 1 drives a nail | hammer_wood | sfx | -28.0 dB re narration peak | +0.85 |
| 980 | 32.667 | 33.467 | lot 42: canvas walls stretched up | canvas_flap | sfx | -31.1 dB re narration peak | +0.00 |
| 982 | 32.733 | 33.053 | F: walker 2 footstep (gravel) | step_gravel_l | sfx | -31.8 dB re narration peak | -0.35 |
| 982 | 32.733 | 33.053 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -29.5 dB re narration peak | +0.85 |
| 983 | 32.767 | 33.087 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -27.9 dB re narration peak | +0.85 |
| 988 | 32.933 | 33.733 | lot 41: roof canvas pulled over | canvas_flap | sfx | -33.0 dB re narration peak | +0.00 |
| 989 | 32.967 | 33.287 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -29.1 dB re narration peak | +0.85 |
| 990 | 33.000 | 33.320 | F: walker 2 footstep (gravel) | step_gravel_r | sfx | -31.9 dB re narration peak | -0.31 |
| 990 | 33.000 | 33.320 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -28.3 dB re narration peak | +0.85 |
| 991 | 33.033 | 33.383 | F: hammerer 0 drives a nail | hammer_wood | sfx | -31.3 dB re narration peak | -0.85 |
| 994 | 33.133 | 33.733 | lot 44: first boards lifted off the pile | board_pick | sfx | -32.9 dB re narration peak | +0.00 |
| 994 | 33.133 | 34.533 | the roller lays the road stripe | paint_roll | sfx | -29.8 dB re narration peak | -0.19 |
| 995 | 33.167 | 34.067 | lot 43: a board sawn | saw_stroke | sfx | -35.8 dB re narration peak | +0.00 |
| 996 | 33.200 | 33.520 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -27.8 dB re narration peak | +0.85 |
| 996 | 33.200 | 33.520 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -27.2 dB re narration peak | +0.85 |
| 996 | 33.200 | 33.550 | F: hammerer 1 drives a nail | hammer_wood | sfx | -27.3 dB re narration peak | +0.85 |
| 999 | 33.300 | 33.620 | F: walker 2 footstep (gravel) | step_gravel_l | sfx | -31.2 dB re narration peak | -0.26 |
| 1003 | 33.433 | 33.753 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -28.0 dB re narration peak | +0.85 |
| 1004 | 33.467 | 33.787 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -29.0 dB re narration peak | +0.85 |
| 1005 | 33.500 | 34.300 | lot 43: canvas walls stretched up | canvas_flap | sfx | -32.9 dB re narration peak | +0.00 |
| 1006 | 33.533 | 33.883 | F: hammerer 0 drives a nail | hammer_wood | sfx | -30.4 dB re narration peak | -0.85 |
| 1007 | 33.567 | 33.887 | F: walker 2 footstep (gravel) | step_gravel_r | sfx | -31.8 dB re narration peak | -0.20 |
| 1010 | 33.667 | 33.987 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -30.0 dB re narration peak | +0.85 |
| 1011 | 33.700 | 34.020 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -29.4 dB re narration peak | +0.85 |
| 1013 | 33.767 | 34.117 | F: hammerer 1 drives a nail | hammer_wood | sfx | -28.1 dB re narration peak | +0.85 |
| 1014 | 33.800 | 34.120 | F: walker 2 footstep (gravel) | step_gravel_l | sfx | -29.1 dB re narration peak | -0.15 |
| 1017 | 33.900 | 34.220 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -28.3 dB re narration peak | +0.85 |
| 1017 | 33.900 | 34.220 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -28.5 dB re narration peak | +0.85 |
| 1018 | 33.933 | 34.733 | lot 42: roof canvas pulled over | canvas_flap | sfx | -34.1 dB re narration peak | +0.00 |
| 1020 | 34.000 | 34.900 | lot 44: a board sawn | saw_stroke | sfx | -36.1 dB re narration peak | +0.00 |
| 1021 | 34.033 | 34.383 | F: hammerer 0 drives a nail | hammer_wood | sfx | -28.6 dB re narration peak | -0.85 |
| 1022 | 34.067 | 34.387 | F: walker 2 footstep (gravel) | step_gravel_r | sfx | -29.4 dB re narration peak | -0.09 |
| 1024 | 34.133 | 34.453 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -29.8 dB re narration peak | +0.85 |
| 1025 | 34.167 | 34.487 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -29.3 dB re narration peak | +0.85 |
| 1030 | 34.333 | 34.653 | F: walker 2 footstep (gravel) | step_gravel_l | sfx | -31.3 dB re narration peak | -0.02 |
| 1030 | 34.333 | 35.133 | lot 44: canvas walls stretched up | canvas_flap | sfx | -31.7 dB re narration peak | +0.00 |
| 1031 | 34.367 | 34.687 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -30.8 dB re narration peak | +0.85 |
| 1031 | 34.367 | 34.687 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -27.4 dB re narration peak | +0.85 |
| 1031 | 34.367 | 34.717 | F: hammerer 1 drives a nail | hammer_wood | sfx | -29.3 dB re narration peak | +0.85 |
| 1032 | 34.400 | 35.100 | the bundle is swung in and set down | bundle_land | sfx | -27.5 dB re narration peak | +0.40 |
| 1034 | 34.467 | 35.867 | the roller lays the road stripe | paint_roll | sfx | -29.5 dB re narration peak | +0.22 |
| 1036 | 34.533 | 34.883 | F: hammerer 0 drives a nail | hammer_wood | sfx | -28.2 dB re narration peak | -0.85 |
| 1038 | 34.600 | 34.920 | F: walker 2 footstep (gravel) | step_gravel_r | sfx | -30.8 dB re narration peak | +0.05 |
| 1038 | 34.600 | 34.920 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -30.2 dB re narration peak | +0.85 |
| 1039 | 34.633 | 34.953 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -28.4 dB re narration peak | +0.85 |
| 1043 | 34.767 | 35.567 | lot 43: roof canvas pulled over | canvas_flap | sfx | -34.1 dB re narration peak | +0.00 |
| 1045 | 34.833 | 35.153 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -31.5 dB re narration peak | +0.85 |
| 1046 | 34.867 | 35.187 | F: walker 2 footstep (gravel) | step_gravel_l | sfx | -30.2 dB re narration peak | +0.13 |
| 1046 | 34.867 | 35.187 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -28.5 dB re narration peak | +0.85 |
| 1048 | 34.933 | 35.283 | F: hammerer 1 drives a nail | hammer_wood | sfx | -28.7 dB re narration peak | +0.85 |
| 1051 | 35.033 | 35.383 | F: hammerer 0 drives a nail | hammer_wood | sfx | -29.1 dB re narration peak | -0.85 |
| 1052 | 35.067 | 35.387 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -31.3 dB re narration peak | +0.85 |
| 1053 | 35.100 | 35.420 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -29.4 dB re narration peak | +0.85 |
| 1054 | 35.133 | 35.453 | F: walker 2 footstep (gravel) | step_gravel_r | sfx | -30.7 dB re narration peak | +0.21 |
| 1059 | 35.300 | 35.620 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -29.7 dB re narration peak | +0.85 |
| 1060 | 35.333 | 35.653 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -31.0 dB re narration peak | +0.85 |
| 1063 | 35.433 | 35.753 | F: walker 2 footstep (gravel) | step_gravel_l | sfx | -30.3 dB re narration peak | +0.30 |
| 1066 | 35.533 | 35.853 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -31.1 dB re narration peak | +0.85 |
| 1066 | 35.533 | 35.853 | F: walker 4 footstep (gravel) | step_gravel_l | sfx | -29.9 dB re narration peak | +0.85 |
| 1066 | 35.533 | 35.883 | F: hammerer 0 drives a nail | hammer_wood | sfx | -28.5 dB re narration peak | -0.85 |
| 1066 | 35.533 | 35.883 | F: hammerer 1 drives a nail | hammer_wood | sfx | -31.5 dB re narration peak | +0.85 |
| 1068 | 35.600 | 36.400 | lot 44: roof canvas pulled over | canvas_flap | sfx | -34.5 dB re narration peak | +0.00 |
| 1070 | 35.667 | 35.987 | F: walker 2 footstep (gravel) | step_gravel_r | sfx | -31.0 dB re narration peak | +0.36 |
| 1073 | 35.767 | 36.087 | F: walker 3 footstep (gravel) | step_gravel_r | sfx | -32.8 dB re narration peak | +0.85 |
| 1074 | 35.800 | 36.120 | F: walker 4 footstep (gravel) | step_gravel_r | sfx | -31.3 dB re narration peak | +0.85 |
| 1074 | 35.800 | 37.200 | the roller lays the road stripe | paint_roll | sfx | -29.6 dB re narration peak | +0.69 |
| 1078 | 35.933 | 36.253 | F: walker 2 footstep (gravel) | step_gravel_l | sfx | -30.8 dB re narration peak | +0.44 |
| 1080 | 36.000 | 36.320 | F: walker 3 footstep (gravel) | step_gravel_l | sfx | -30.5 dB re narration peak | +0.85 |
| 1081 | 36.033 | 36.383 | F: hammerer 0 drives a nail | hammer_wood | sfx | -26.6 dB re narration peak | -0.85 |
| 1083 | 36.100 | 36.450 | F: hammerer 1 drives a nail | hammer_wood | sfx | -31.2 dB re narration peak | +0.85 |
| 1086 | 36.200 | 36.520 | F: walker 2 footstep (gravel) | step_gravel_r | sfx | -31.0 dB re narration peak | +0.51 |
| 1094 | 36.467 | 36.787 | F: walker 2 footstep (gravel) | step_gravel_l | sfx | -28.8 dB re narration peak | +0.58 |
| 1096 | 36.533 | 36.883 | F: hammerer 0 drives a nail | hammer_wood | sfx | -26.5 dB re narration peak | -0.70 |
| 1101 | 36.700 | 37.050 | F: hammerer 1 drives a nail | hammer_wood | sfx | -31.6 dB re narration peak | +0.85 |
| 1103 | 36.767 | 37.087 | F: walker 2 footstep (gravel) | step_gravel_r | sfx | -32.0 dB re narration peak | +0.64 |
| 1107 | 36.900 | 37.220 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -45.5 dB re narration peak | +0.22 |
| 1113 | 37.100 | 37.420 | G: walker 1 footstep (gravel) | step_gravel_l | sfx | -40.1 dB re narration peak | +0.21 |
| 1119 | 37.300 | 37.620 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -40.2 dB re narration peak | +0.20 |
| 1126 | 37.533 | 37.853 | G: walker 1 footstep (gravel) | step_gravel_l | sfx | -37.1 dB re narration peak | +0.18 |
| 1132 | 37.733 | 38.053 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -37.9 dB re narration peak | +0.16 |
| 1138 | 37.933 | 38.253 | G: walker 1 footstep (gravel) | step_gravel_l | sfx | -38.3 dB re narration peak | +0.14 |
| 1145 | 38.167 | 38.487 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -39.0 dB re narration peak | +0.12 |
| 1150 | 38.333 | 38.583 | the hero's side-eye at the hollow backs | brow_pluck | sfx | -33.1 dB re narration peak | +0.00 |
| 1151 | 38.367 | 38.687 | G: walker 1 footstep (gravel) | step_gravel_l | sfx | -37.2 dB re narration peak | +0.10 |
| 1157 | 38.567 | 38.887 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -36.0 dB re narration peak | +0.08 |
| 1163 | 38.767 | 39.087 | G: walker 1 footstep (gravel) | step_gravel_l | sfx | -36.6 dB re narration peak | +0.05 |
| 1170 | 39.000 | 39.320 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -35.2 dB re narration peak | +0.03 |
| 1176 | 39.200 | 39.520 | G: walker 1 footstep (gravel) | step_gravel_l | sfx | -34.7 dB re narration peak | +0.00 |
| 1182 | 39.400 | 39.720 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -34.8 dB re narration peak | -0.03 |
| 1189 | 39.633 | 39.953 | G: walker 1 footstep (gravel) | step_gravel_l | sfx | -36.7 dB re narration peak | -0.06 |
| 1195 | 39.833 | 40.153 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -34.9 dB re narration peak | -0.09 |
| 1201 | 40.033 | 40.353 | G: walker 1 footstep (gravel) | step_gravel_l | sfx | -34.3 dB re narration peak | -0.13 |
| 1208 | 40.267 | 40.587 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -33.8 dB re narration peak | -0.17 |
| 1214 | 40.467 | 40.787 | G: walker 1 footstep (gravel) | step_gravel_l | sfx | -34.6 dB re narration peak | -0.22 |
| 1220 | 40.667 | 40.987 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -34.8 dB re narration peak | -0.26 |
| 1226 | 40.867 | 41.187 | G: walker 1 footstep (gravel) | step_gravel_l | sfx | -32.6 dB re narration peak | -0.32 |
| 1262 | 41.067 | 42.667 | camera sweeps up into the sky | soft_whoosh | sfx | -31.9 dB re narration peak | +0.20 |
| 1233 | 41.100 | 41.420 | G: walker 1 footstep (gravel) | step_gravel_r | sfx | -33.1 dB re narration peak | -0.38 |
| 1240 | 41.333 | 47.333 | ambience segment: aerial_high (0.5 s equal-power crossfades) | ambience_aerial_high | bed | see preset | stereo wide |
| 1432 | 46.533 | 49.133 | the roof turns transparent: the real factory below | reveal_shimmer | sfx | -25.8 dB re narration peak | +0.00 |
| 1420 | 47.333 | 50.067 | ambience segment: factory_floor (0.5 s equal-power crossfades) | ambience_factory_floor | bed | see preset | stereo wide |
| 1458 | 48.600 | 49.793 | J2: riveter 14 drives a rivet | rivet_burst | sfx | -40.6 dB re narration peak | -0.25 |
| 1461 | 48.700 | 49.897 | J2: riveter 12 drives a rivet | rivet_burst | sfx | -41.7 dB re narration peak | -0.85 |
| 1466 | 48.867 | 50.074 | J2: riveter 16 drives a rivet | rivet_burst | sfx | -43.4 dB re narration peak | +0.85 |
| 1512 | 49.400 | 51.000 | the camera rises back over the rooftop town (loop) | soft_whoosh | sfx | -34.9 dB re narration peak | -0.10 |
| 1489 | 49.633 | 51.011 | J2: riveter 17 drives a rivet | rivet_burst | sfx | -41.7 dB re narration peak | +0.85 |
| 1497 | 49.900 | 50.937 | J2: riveter 15 drives a rivet | rivet_burst | sfx | -40.5 dB re narration peak | -0.58 |
| 1498 | 49.933 | 51.165 | J2: riveter 14 drives a rivet | rivet_burst | sfx | -39.0 dB re narration peak | -0.52 |
| 1502 | 50.067 | 51.644 | ambience segment: roof_day (0.5 s equal-power crossfades) | ambience_roof_day | bed | see preset | stereo wide |
| 1506 | 50.200 | 50.440 | J2: walker 18 footstep (concrete) | step_concrete_r | sfx | -38.8 dB re narration peak | +0.31 |
| 1510 | 50.333 | 51.416 | J2: riveter 12 drives a rivet | rivet_burst | sfx | -39.5 dB re narration peak | -0.85 |
| 1511 | 50.367 | 51.861 | J2: riveter 13 drives a rivet | rivet_burst | sfx | -43.0 dB re narration peak | -0.85 |
| 1512 | 50.400 | 50.640 | J2: walker 18 footstep (concrete) | step_concrete_l | sfx | -37.5 dB re narration peak | +0.34 |
| 1517 | 50.567 | 50.807 | J2: walker 18 footstep (concrete) | step_concrete_r | sfx | -40.2 dB re narration peak | +0.37 |
| 1520 | 50.667 | 51.606 | J2: riveter 16 drives a rivet | rivet_burst | sfx | -40.5 dB re narration peak | +0.85 |
| 1523 | 50.767 | 51.007 | J2: walker 18 footstep (concrete) | step_concrete_l | sfx | -38.5 dB re narration peak | +0.41 |
| 1527 | 50.900 | 52.113 | J2: riveter 17 drives a rivet | rivet_burst | sfx | -40.6 dB re narration peak | +0.85 |
| 1528 | 50.933 | 51.173 | J2: walker 18 footstep (concrete) | step_concrete_r | sfx | -37.0 dB re narration peak | +0.43 |
| 1534 | 51.133 | 51.373 | J2: walker 18 footstep (concrete) | step_concrete_l | sfx | -37.4 dB re narration peak | +0.47 |
| 1538 | 51.267 | 52.524 | J2: riveter 14 drives a rivet | rivet_burst | sfx | -37.7 dB re narration peak | -0.85 |
| 1540 | 51.333 | 51.573 | J2: walker 18 footstep (concrete) | step_concrete_r | sfx | -37.0 dB re narration peak | +0.51 |
| 1544 | 51.467 | 52.959 | J2: riveter 15 drives a rivet | rivet_burst | sfx | -38.4 dB re narration peak | -0.85 |
| 1545 | 51.500 | 51.740 | J2: walker 18 footstep (concrete) | step_concrete_l | sfx | -36.9 dB re narration peak | +0.55 |
