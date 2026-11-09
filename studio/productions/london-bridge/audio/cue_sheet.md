# Sound cue sheet (0–59.01 s; loop-safe: True)

Narration-priority mix. Narration -24.4 LUFS is the reference; event levels are peak dB under the narration peak, beds are LU under the narration loudness. Ducking under speech: {'sfx': -4, 'crowd': -8, 'ambience': -6, 'music': -10}. Word masking guard: every word ≥ 15 dB above all other layers in the 300–4000 Hz speech band (worst word before guard 2.5 dB, after 15.3 dB; 32 guard cuts). Master +8.4 dB → -16.1 LUFS, -1.1 dBTP.

Measured stem loudness vs narration (LU): {'sfx': np.float64(-18.2), 'crowd': np.float64(-33.9), 'ambience': np.float64(-29.0), 'music': None}

All effects are procedurally synthesised in `studio/audio/` (no third-party recordings).

| frame | start s | end s | source / object | generator | stem | level | pan |
|---|---|---|---|---|---|---|---|
| 0 | 0.000 | 1.450 | 1960s V8 approaches on gravel, decelerates, brakes (f0-40) | car_arrive | sfx | -7.7 dB re narration peak | -0.60 |
| 0 | 0.000 | 3.400 | tumbleweed crosses foreground L->R (f0-100) | tumble_roll_1 | sfx | -18.1 dB re narration peak | moving |
| 0 | 0.000 | 11.867 | ambience segment: desert (0.5 s equal-power crossfades) | ambience_desert | bed | see preset | stereo wide |
| 29 | 0.967 | 1.467 | brakes squeak as the car stops | brake_squeak | sfx | -28.3 dB re narration peak | -0.60 |
| 40 | 1.333 | 2.533 | ignition off: engine shudder + tick | engine_off | sfx | -21.5 dB re narration peak | -0.60 |
| 41 | 1.367 | 1.867 | car door latch + hinge (far side) | door_open | sfx | -20.9 dB re narration peak | -0.60 |
| 49 | 1.633 | 2.333 | car door shuts | door_close | sfx | -15.6 dB re narration peak | -0.60 |
| 54 | 1.800 | 2.120 | far foot heel strike | step_sand | sfx | -14.4 dB re narration peak | -0.82 |
| 63 | 2.100 | 2.420 | near foot heel strike | step_sand | sfx | -15.1 dB re narration peak | -0.66 |
| 70 | 2.333 | 3.683 | distant hawk | hawk | sfx | -32.8 dB re narration peak | +0.60 |
| 71 | 2.367 | 2.687 | far foot heel strike | step_sand | sfx | -14.8 dB re narration peak | -0.55 |
| 79 | 2.633 | 2.953 | near foot heel strike | step_sand | sfx | -15.9 dB re narration peak | -0.45 |
| 87 | 2.900 | 3.220 | far foot heel strike | step_sand | sfx | -14.3 dB re narration peak | -0.36 |
| 95 | 3.167 | 3.487 | near foot heel strike | step_sand | sfx | -13.7 dB re narration peak | -0.28 |
| 103 | 3.433 | 3.753 | far foot heel strike | step_sand | sfx | -14.4 dB re narration peak | -0.21 |
| 111 | 3.700 | 4.020 | near foot heel strike | step_sand | sfx | -14.1 dB re narration peak | -0.13 |
| 125 | 4.167 | 4.517 | Hal turns to camera (foot reposition) | turn_scuff | sfx | -18.0 dB re narration peak | -0.30 |
| 126 | 4.200 | 4.620 | ta-da arms sweep up | fabric_swish_big | sfx | -21.3 dB re narration peak | -0.20 |
| 154 | 5.133 | 5.413 | arms come down | fabric_swish | sfx | -30.5 dB re narration peak | -0.20 |
| 160 | 5.333 | 5.493 | hand pats chest pocket | wallet_pat | sfx | -15.6 dB re narration peak | -0.15 |
| 161 | 5.367 | 5.717 | coins in wallet | coin_jingle | sfx | -28.0 dB re narration peak | -0.15 |
| 186 | 5.600 | 7.500 | camera rises / pulls back to reveal the bridge | whoosh_reveal | sfx | -24.4 dB re narration peak | +0.00 |
| 170 | 5.667 | 5.827 | hand pats chest pocket | wallet_pat | sfx | -16.5 dB re narration peak | -0.15 |
| 171 | 5.700 | 6.050 | coins in wallet | coin_jingle | sfx | -28.3 dB re narration peak | -0.15 |
| 180 | 6.000 | 6.160 | hand pats chest pocket | wallet_pat | sfx | -16.3 dB re narration peak | -0.15 |
| 181 | 6.033 | 6.383 | coins in wallet | coin_jingle | sfx | -29.1 dB re narration peak | -0.15 |
| 190 | 6.333 | 6.613 | hands to hips | fabric_swish | sfx | -31.4 dB re narration peak | -0.20 |
| 205 | 6.833 | 8.183 | distant hawk over the reveal | hawk | sfx | -34.0 dB re narration peak | -0.50 |
| 228 | 7.600 | 10.600 | tumbleweed rolls away under the arch | tumble_roll_2 | sfx | -28.0 dB re narration peak | moving |
| 236 | 7.867 | 8.567 | vulture shifts on the dead tree | vulture_flap | sfx | -35.5 dB re narration peak | +0.70 |
| 250 | 8.333 | 9.053 | pebble tips off parapet | pebble_whistle | sfx | -35.3 dB re narration peak | +0.20 |
| 272 | 9.067 | 9.967 | pebble hits dry riverbed | pebble_clack | sfx | -13.8 dB re narration peak | +0.25 |
| 274 | 9.133 | 9.313 | Hal freezes (comic tick) | freeze_sting | sfx | -27.4 dB re narration peak | +0.00 |
| 286 | 9.533 | 9.853 | nervous gulp as cringe starts | gulp | sfx | -21.5 dB re narration peak | -0.20 |
| 356 | 11.867 | 32.833 | ambience segment: london (0.5 s equal-power crossfades) | ambience_london | bed | see preset | stereo wide |
| 366 | 12.200 | 13.100 | gull cry over the river | gull | sfx | -32.0 dB re narration peak | -1.00 |
| 380 | 12.667 | 16.267 | distant city clock bell (original) | bell_chime | sfx | -30.1 dB re narration peak | +0.40 |
| 423 | 14.100 | 14.260 | Hal's shoes on the paving | step_stone | sfx | -15.6 dB re narration peak | -0.20 |
| 424 | 14.133 | 14.293 | Hal's shoes on the paving | step_stone | sfx | -16.2 dB re narration peak | -0.20 |
| 426 | 14.200 | 14.360 | Hal's shoes on the paving | step_stone | sfx | -15.6 dB re narration peak | -0.20 |
| 428 | 14.267 | 14.427 | Hal's shoes on the paving | step_stone | sfx | -16.7 dB re narration peak | -0.20 |
| 429 | 14.300 | 14.460 | Hal's shoes on the paving | step_stone | sfx | -16.0 dB re narration peak | -0.20 |
| 431 | 14.367 | 14.527 | Hal's shoes on the paving | step_stone | sfx | -17.3 dB re narration peak | -0.20 |
| 432 | 14.400 | 15.300 | gull cry over the river | gull | sfx | -29.6 dB re narration peak | -1.00 |
| 433 | 14.433 | 14.593 | Hal's shoes on the paving | step_stone | sfx | -15.6 dB re narration peak | -0.20 |
| 434 | 14.467 | 14.627 | Hal's shoes on the paving | step_stone | sfx | -17.0 dB re narration peak | -0.20 |
| 436 | 14.533 | 14.693 | Hal's shoes on the paving | step_stone | sfx | -16.2 dB re narration peak | -0.20 |
| 438 | 14.600 | 14.760 | Hal's shoes on the paving | step_stone | sfx | -15.6 dB re narration peak | -0.20 |
| 439 | 14.633 | 14.793 | Hal's shoes on the paving | step_stone | sfx | -16.7 dB re narration peak | -0.20 |
| 441 | 14.700 | 14.860 | Hal's shoes on the paving | step_stone | sfx | -15.6 dB re narration peak | -0.20 |
| 443 | 14.767 | 14.927 | Hal's shoes on the paving | step_stone | sfx | -17.4 dB re narration peak | -0.20 |
| 444 | 14.800 | 14.960 | Hal's shoes on the paving | step_stone | sfx | -15.2 dB re narration peak | -0.20 |
| 446 | 14.867 | 15.027 | Hal's shoes on the paving | step_stone | sfx | -16.0 dB re narration peak | -0.20 |
| 448 | 14.933 | 15.093 | Hal's shoes on the paving | step_stone | sfx | -15.9 dB re narration peak | -0.20 |
| 452 | 15.067 | 15.417 | Hal turns to camera | turn_scuff | sfx | -19.5 dB re narration peak | -0.10 |
| 476 | 15.867 | 16.567 | blueprint unrolls | paper_unroll | sfx | -21.2 dB re narration peak | -0.05 |
| 512 | 17.067 | 17.417 | blueprint shown to camera | paper_rustle | sfx | -29.3 dB re narration peak | -0.05 |
| 548 | 18.267 | 19.167 | gull cry over the river | gull | sfx | -31.0 dB re narration peak | +1.00 |
| 562 | 18.733 | 19.083 | blueprint rolled into one hand | paper_rustle | sfx | -32.1 dB re narration peak | -0.10 |
| 562 | 18.733 | 19.099 | person 2 lapel | cloth_soft | sfx | -32.5 dB re narration peak | -0.10 |
| 570 | 19.000 | 20.150 | Hal's exaggerated yawn (nobody would visit) | yawn | sfx | -20.5 dB re narration peak | -0.05 |
| 607 | 20.233 | 21.433 | lightbulb moment: soft bell | idea_ding | sfx | -24.5 dB re narration peak | +0.00 |
| 612 | 20.400 | 20.560 | the seller walks up with the deed | step_stone | sfx | -23.3 dB re narration peak | -0.40 |
| 622 | 20.733 | 20.893 | the seller walks up with the deed | step_stone | sfx | -22.4 dB re narration peak | -0.40 |
| 632 | 21.067 | 21.227 | the seller walks up with the deed | step_stone | sfx | -23.1 dB re narration peak | -0.40 |
| 642 | 21.400 | 21.844 | Hal pulls the cheque book from his jacket | cloth_soft | sfx | -32.6 dB re narration peak | -0.05 |
| 658 | 21.933 | 22.073 | pen writes the cheque | pen_scratch | sfx | -26.1 dB re narration peak | -0.05 |
| 663 | 22.100 | 22.240 | pen writes the cheque | pen_scratch | sfx | -26.0 dB re narration peak | -0.05 |
| 668 | 22.267 | 22.407 | pen writes the cheque | pen_scratch | sfx | -26.1 dB re narration peak | -0.05 |
| 673 | 22.433 | 22.573 | pen writes the cheque | pen_scratch | sfx | -28.3 dB re narration peak | -0.05 |
| 678 | 22.600 | 22.740 | pen writes the cheque | pen_scratch | sfx | -26.6 dB re narration peak | -0.05 |
| 683 | 22.767 | 22.907 | pen writes the cheque | pen_scratch | sfx | -28.4 dB re narration peak | -0.05 |
| 688 | 22.933 | 23.073 | pen writes the cheque | pen_scratch | sfx | -26.6 dB re narration peak | -0.05 |
| 693 | 23.100 | 23.240 | pen writes the cheque | pen_scratch | sfx | -26.8 dB re narration peak | -0.05 |
| 704 | 23.467 | 23.817 | cheque torn from the book | paper_rustle | sfx | -26.0 dB re narration peak | -0.05 |
| 718 | 23.933 | 24.283 | cheque handed to the seller | paper_rustle | sfx | -29.6 dB re narration peak | -0.15 |
| 745 | 24.833 | 24.993 | dismantling crew walk in | step_stone | sfx | -24.4 dB re narration peak | -0.50 |
| 746 | 24.867 | 25.248 | seller tucks the cheque into his breast pocket | cloth_soft | sfx | -36.0 dB re narration peak | -0.15 |
| 746 | 24.867 | 25.027 | dismantling crew walk in | step_stone | sfx | -25.5 dB re narration peak | -0.50 |
| 748 | 24.933 | 25.093 | dismantling crew walk in | step_stone | sfx | -23.2 dB re narration peak | -0.50 |
| 749 | 24.967 | 25.127 | dismantling crew walk in | step_stone | sfx | -25.5 dB re narration peak | -0.50 |
| 751 | 25.033 | 25.193 | dismantling crew walk in | step_stone | sfx | -23.5 dB re narration peak | -0.50 |
| 752 | 25.067 | 25.227 | dismantling crew walk in | step_stone | sfx | -24.7 dB re narration peak | -0.50 |
| 752 | 25.067 | 25.227 | dismantling crew walk in | step_stone | sfx | -25.6 dB re narration peak | -0.50 |
| 754 | 25.133 | 25.574 | handshake | cloth_soft | sfx | -34.0 dB re narration peak | -0.10 |
| 754 | 25.133 | 25.293 | dismantling crew walk in | step_stone | sfx | -24.4 dB re narration peak | -0.50 |
| 754 | 25.133 | 25.293 | dismantling crew walk in | step_stone | sfx | -24.6 dB re narration peak | -0.50 |
| 755 | 25.167 | 25.327 | dismantling crew walk in | step_stone | sfx | -23.3 dB re narration peak | -0.50 |
| 755 | 25.167 | 25.327 | dismantling crew walk in | step_stone | sfx | -24.1 dB re narration peak | -0.50 |
| 756 | 25.200 | 25.360 | dismantling crew walk in | step_stone | sfx | -25.1 dB re narration peak | -0.50 |
| 757 | 25.233 | 25.393 | dismantling crew walk in | step_stone | sfx | -24.8 dB re narration peak | -0.50 |
| 757 | 25.233 | 25.393 | dismantling crew walk in | step_stone | sfx | -24.2 dB re narration peak | -0.50 |
| 758 | 25.267 | 25.427 | dismantling crew walk in | step_stone | sfx | -25.0 dB re narration peak | -0.50 |
| 758 | 25.267 | 25.427 | dismantling crew walk in | step_stone | sfx | -25.6 dB re narration peak | -0.50 |
| 759 | 25.300 | 25.460 | dismantling crew walk in | step_stone | sfx | -23.1 dB re narration peak | -0.50 |
| 759 | 25.300 | 25.460 | dismantling crew walk in | step_stone | sfx | -24.7 dB re narration peak | -0.50 |
| 760 | 25.333 | 25.493 | dismantling crew walk in | step_stone | sfx | -24.8 dB re narration peak | -0.50 |
| 761 | 25.367 | 25.527 | dismantling crew walk in | step_stone | sfx | -25.4 dB re narration peak | -0.50 |
| 761 | 25.367 | 25.527 | dismantling crew walk in | step_stone | sfx | -24.8 dB re narration peak | -0.50 |
| 762 | 25.400 | 25.560 | dismantling crew walk in | step_stone | sfx | -24.5 dB re narration peak | -0.50 |
| 762 | 25.400 | 25.560 | dismantling crew walk in | step_stone | sfx | -24.5 dB re narration peak | -0.50 |
| 762 | 25.400 | 25.560 | dismantling crew walk in | step_stone | sfx | -23.8 dB re narration peak | -0.50 |
| 763 | 25.433 | 25.593 | dismantling crew walk in | step_stone | sfx | -23.4 dB re narration peak | -0.50 |
| 763 | 25.433 | 25.593 | dismantling crew walk in | step_stone | sfx | -23.6 dB re narration peak | -0.50 |
| 764 | 25.467 | 25.627 | dismantling crew walk in | step_stone | sfx | -25.3 dB re narration peak | -0.50 |
| 764 | 25.467 | 25.627 | dismantling crew walk in | step_stone | sfx | -25.0 dB re narration peak | -0.50 |
| 764 | 25.467 | 25.627 | dismantling crew walk in | step_stone | sfx | -25.2 dB re narration peak | -0.50 |
| 765 | 25.500 | 25.660 | dismantling crew walk in | step_stone | sfx | -22.8 dB re narration peak | -0.50 |
| 765 | 25.500 | 25.660 | dismantling crew walk in | step_stone | sfx | -25.1 dB re narration peak | -0.50 |
| 765 | 25.500 | 25.660 | dismantling crew walk in | step_stone | sfx | -23.2 dB re narration peak | -0.50 |
| 766 | 25.533 | 25.693 | dismantling crew walk in | step_stone | sfx | -23.0 dB re narration peak | -0.50 |
| 766 | 25.533 | 25.693 | dismantling crew walk in | step_stone | sfx | -23.2 dB re narration peak | -0.50 |
| 766 | 25.533 | 25.693 | dismantling crew walk in | step_stone | sfx | -24.0 dB re narration peak | -0.50 |
| 767 | 25.567 | 25.727 | dismantling crew walk in | step_stone | sfx | -24.1 dB re narration peak | -0.50 |
| 768 | 25.600 | 25.760 | dismantling crew walk in | step_stone | sfx | -24.4 dB re narration peak | -0.50 |
| 768 | 25.600 | 25.760 | dismantling crew walk in | step_stone | sfx | -25.4 dB re narration peak | -0.50 |
| 768 | 25.600 | 25.760 | dismantling crew walk in | step_stone | sfx | -22.7 dB re narration peak | -0.50 |
| 768 | 25.600 | 25.760 | dismantling crew walk in | step_stone | sfx | -25.2 dB re narration peak | -0.50 |
| 768 | 25.600 | 25.760 | dismantling crew walk in | step_stone | sfx | -23.2 dB re narration peak | -0.50 |
| 769 | 25.633 | 25.793 | dismantling crew walk in | step_stone | sfx | -24.8 dB re narration peak | -0.50 |
| 769 | 25.633 | 25.793 | dismantling crew walk in | step_stone | sfx | -22.8 dB re narration peak | -0.50 |
| 770 | 25.667 | 25.827 | dismantling crew walk in | step_stone | sfx | -25.1 dB re narration peak | -0.50 |
| 770 | 25.667 | 25.827 | dismantling crew walk in | step_stone | sfx | -25.6 dB re narration peak | -0.50 |
| 770 | 25.667 | 25.827 | dismantling crew walk in | step_stone | sfx | -23.0 dB re narration peak | -0.50 |
| 770 | 25.667 | 25.827 | dismantling crew walk in | step_stone | sfx | -24.6 dB re narration peak | -0.50 |
| 771 | 25.700 | 25.860 | dismantling crew walk in | step_stone | sfx | -23.0 dB re narration peak | -0.50 |
| 771 | 25.700 | 25.860 | dismantling crew walk in | step_stone | sfx | -24.1 dB re narration peak | -0.50 |
| 771 | 25.700 | 25.860 | dismantling crew walk in | step_stone | sfx | -24.1 dB re narration peak | -0.50 |
| 771 | 25.700 | 25.860 | dismantling crew walk in | step_stone | sfx | -25.3 dB re narration peak | -0.50 |
| 772 | 25.733 | 26.083 | the deed changes hands | paper_rustle | sfx | -27.7 dB re narration peak | -0.10 |
| 772 | 25.733 | 25.893 | dismantling crew walk in | step_stone | sfx | -24.0 dB re narration peak | -0.50 |
| 772 | 25.733 | 25.893 | dismantling crew walk in | step_stone | sfx | -25.5 dB re narration peak | -0.50 |
| 772 | 25.733 | 25.893 | dismantling crew walk in | step_stone | sfx | -25.2 dB re narration peak | -0.50 |
| 773 | 25.767 | 25.927 | dismantling crew walk in | step_stone | sfx | -24.4 dB re narration peak | -0.50 |
| 773 | 25.767 | 25.927 | dismantling crew walk in | step_stone | sfx | -23.8 dB re narration peak | -0.50 |
| 774 | 25.800 | 25.960 | dismantling crew walk in | step_stone | sfx | -23.9 dB re narration peak | -0.50 |
| 774 | 25.800 | 25.960 | dismantling crew walk in | step_stone | sfx | -23.4 dB re narration peak | -0.50 |
| 774 | 25.800 | 25.960 | dismantling crew walk in | step_stone | sfx | -23.1 dB re narration peak | -0.50 |
| 774 | 25.800 | 25.960 | dismantling crew walk in | step_stone | sfx | -25.3 dB re narration peak | -0.50 |
| 775 | 25.833 | 25.993 | dismantling crew walk in | step_stone | sfx | -24.8 dB re narration peak | -0.50 |
| 775 | 25.833 | 25.993 | dismantling crew walk in | step_stone | sfx | -23.4 dB re narration peak | -0.50 |
| 775 | 25.833 | 25.993 | dismantling crew walk in | step_stone | sfx | -23.4 dB re narration peak | -0.50 |
| 776 | 25.867 | 26.027 | dismantling crew walk in | step_stone | sfx | -23.0 dB re narration peak | -0.50 |
| 776 | 25.867 | 26.027 | dismantling crew walk in | step_stone | sfx | -22.9 dB re narration peak | -0.50 |
| 776 | 25.867 | 26.027 | dismantling crew walk in | step_stone | sfx | -23.1 dB re narration peak | -0.50 |
| 776 | 25.867 | 26.027 | dismantling crew walk in | step_stone | sfx | -22.9 dB re narration peak | -0.50 |
| 777 | 25.900 | 26.060 | dismantling crew walk in | step_stone | sfx | -23.9 dB re narration peak | -0.50 |
| 777 | 25.900 | 26.060 | dismantling crew walk in | step_stone | sfx | -23.8 dB re narration peak | -0.50 |
| 777 | 25.900 | 26.060 | dismantling crew walk in | step_stone | sfx | -24.1 dB re narration peak | -0.50 |
| 777 | 25.900 | 26.060 | dismantling crew walk in | step_stone | sfx | -24.3 dB re narration peak | -0.50 |
| 778 | 25.933 | 26.093 | dismantling crew walk in | step_stone | sfx | -24.5 dB re narration peak | -0.50 |
| 778 | 25.933 | 26.093 | dismantling crew walk in | step_stone | sfx | -23.9 dB re narration peak | -0.50 |
| 778 | 25.933 | 26.093 | dismantling crew walk in | step_stone | sfx | -24.5 dB re narration peak | -0.50 |
| 779 | 25.967 | 26.127 | dismantling crew walk in | step_stone | sfx | -23.9 dB re narration peak | -0.50 |
| 779 | 25.967 | 26.127 | dismantling crew walk in | step_stone | sfx | -23.4 dB re narration peak | -0.50 |
| 780 | 26.000 | 26.160 | dismantling crew walk in | step_stone | sfx | -23.1 dB re narration peak | -0.50 |
| 780 | 26.000 | 26.160 | dismantling crew walk in | step_stone | sfx | -24.1 dB re narration peak | -0.50 |
| 780 | 26.000 | 26.160 | dismantling crew walk in | step_stone | sfx | -24.2 dB re narration peak | -0.50 |
| 780 | 26.000 | 26.160 | dismantling crew walk in | step_stone | sfx | -24.5 dB re narration peak | -0.50 |
| 781 | 26.033 | 26.193 | dismantling crew walk in | step_stone | sfx | -23.1 dB re narration peak | -0.50 |
| 781 | 26.033 | 26.193 | dismantling crew walk in | step_stone | sfx | -23.1 dB re narration peak | -0.50 |
| 781 | 26.033 | 26.193 | dismantling crew walk in | step_stone | sfx | -24.1 dB re narration peak | -0.50 |
| 782 | 26.067 | 26.227 | dismantling crew walk in | step_stone | sfx | -25.0 dB re narration peak | -0.50 |
| 782 | 26.067 | 26.227 | dismantling crew walk in | step_stone | sfx | -22.6 dB re narration peak | -0.50 |
| 782 | 26.067 | 26.227 | dismantling crew walk in | step_stone | sfx | -24.4 dB re narration peak | -0.50 |
| 783 | 26.100 | 26.260 | dismantling crew walk in | step_stone | sfx | -24.3 dB re narration peak | -0.50 |
| 783 | 26.100 | 26.260 | dismantling crew walk in | step_stone | sfx | -24.7 dB re narration peak | -0.50 |
| 783 | 26.100 | 26.260 | dismantling crew walk in | step_stone | sfx | -23.7 dB re narration peak | -0.50 |
| 783 | 26.100 | 26.260 | dismantling crew walk in | step_stone | sfx | -23.6 dB re narration peak | -0.50 |
| 784 | 26.133 | 26.570 | seller tips his bowler | cloth_soft | sfx | -34.2 dB re narration peak | -0.15 |
| 784 | 26.133 | 26.293 | dismantling crew walk in | step_stone | sfx | -24.6 dB re narration peak | -0.50 |
| 784 | 26.133 | 26.293 | dismantling crew walk in | step_stone | sfx | -25.3 dB re narration peak | -0.50 |
| 784 | 26.133 | 26.293 | dismantling crew walk in | step_stone | sfx | -25.5 dB re narration peak | -0.50 |
| 785 | 26.167 | 26.327 | dismantling crew walk in | step_stone | sfx | -22.6 dB re narration peak | -0.50 |
| 785 | 26.167 | 26.327 | dismantling crew walk in | step_stone | sfx | -24.4 dB re narration peak | -0.50 |
| 786 | 26.200 | 26.360 | dismantling crew walk in | step_stone | sfx | -25.6 dB re narration peak | -0.50 |
| 786 | 26.200 | 26.360 | dismantling crew walk in | step_stone | sfx | -24.0 dB re narration peak | -0.50 |
| 787 | 26.233 | 26.393 | dismantling crew walk in | step_stone | sfx | -22.9 dB re narration peak | -0.50 |
| 787 | 26.233 | 26.393 | dismantling crew walk in | step_stone | sfx | -23.0 dB re narration peak | -0.50 |
| 788 | 26.267 | 26.427 | dismantling crew walk in | step_stone | sfx | -22.7 dB re narration peak | -0.50 |
| 788 | 26.267 | 26.427 | dismantling crew walk in | step_stone | sfx | -25.5 dB re narration peak | -0.50 |
| 789 | 26.300 | 26.460 | dismantling crew walk in | step_stone | sfx | -23.4 dB re narration peak | -0.50 |
| 789 | 26.300 | 26.460 | dismantling crew walk in | step_stone | sfx | -25.6 dB re narration peak | -0.50 |
| 789 | 26.300 | 26.460 | dismantling crew walk in | step_stone | sfx | -23.4 dB re narration peak | -0.50 |
| 790 | 26.333 | 26.493 | dismantling crew walk in | step_stone | sfx | -23.9 dB re narration peak | -0.50 |
| 790 | 26.333 | 26.493 | dismantling crew walk in | step_stone | sfx | -22.8 dB re narration peak | -0.50 |
| 791 | 26.367 | 26.527 | dismantling crew walk in | step_stone | sfx | -23.4 dB re narration peak | -0.50 |
| 792 | 26.400 | 26.560 | dismantling crew walk in | step_stone | sfx | -24.7 dB re narration peak | -0.50 |
| 792 | 26.400 | 26.560 | dismantling crew walk in | step_stone | sfx | -24.9 dB re narration peak | -0.50 |
| 792 | 26.400 | 28.000 | quay crane slews over the stack | crane_winch | sfx | -26.8 dB re narration peak | +0.30 |
| 793 | 26.433 | 26.593 | dismantling crew walk in | step_stone | sfx | -24.1 dB re narration peak | -0.50 |
| 793 | 26.433 | 26.593 | dismantling crew walk in | step_stone | sfx | -25.5 dB re narration peak | -0.50 |
| 794 | 26.467 | 26.627 | dismantling crew walk in | step_stone | sfx | -24.1 dB re narration peak | -0.50 |
| 794 | 26.467 | 26.627 | dismantling crew walk in | step_stone | sfx | -23.6 dB re narration peak | -0.50 |
| 795 | 26.500 | 26.660 | dismantling crew walk in | step_stone | sfx | -23.0 dB re narration peak | -0.50 |
| 795 | 26.500 | 26.660 | dismantling crew walk in | step_stone | sfx | -22.9 dB re narration peak | -0.50 |
| 796 | 26.533 | 26.693 | dismantling crew walk in | step_stone | sfx | -23.0 dB re narration peak | -0.50 |
| 796 | 26.533 | 26.693 | dismantling crew walk in | step_stone | sfx | -25.6 dB re narration peak | -0.50 |
| 797 | 26.567 | 26.727 | dismantling crew walk in | step_stone | sfx | -25.5 dB re narration peak | -0.50 |
| 798 | 26.600 | 26.760 | dismantling crew walk in | step_stone | sfx | -23.7 dB re narration peak | -0.50 |
| 799 | 26.633 | 26.793 | dismantling crew walk in | step_stone | sfx | -23.6 dB re narration peak | -0.50 |
| 799 | 26.633 | 26.793 | dismantling crew walk in | step_stone | sfx | -24.2 dB re narration peak | -0.50 |
| 800 | 26.667 | 26.827 | dismantling crew walk in | step_stone | sfx | -22.8 dB re narration peak | -0.50 |
| 801 | 26.700 | 26.860 | dismantling crew walk in | step_stone | sfx | -22.7 dB re narration peak | -0.50 |
| 802 | 26.733 | 26.893 | dismantling crew walk in | step_stone | sfx | -24.4 dB re narration peak | -0.50 |
| 803 | 26.767 | 26.927 | dismantling crew walk in | step_stone | sfx | -24.5 dB re narration peak | -0.50 |
| 805 | 26.833 | 27.051 | person 3 chalk | chalk_scratch | sfx | -25.4 dB re narration peak | +0.00 |
| 805 | 26.833 | 26.993 | dismantling crew walk in | step_stone | sfx | -25.2 dB re narration peak | -0.50 |
| 807 | 26.900 | 27.060 | dismantling crew walk in | step_stone | sfx | -24.3 dB re narration peak | -0.50 |
| 812 | 27.067 | 27.967 | gull cry over the river | gull | sfx | -31.2 dB re narration peak | +1.00 |
| 814 | 27.133 | 28.033 | person 4 hammer | hammer_hit | sfx | -17.3 dB re narration peak | -0.30 |
| 823 | 27.433 | 27.696 | person 3 chalk | chalk_scratch | sfx | -24.2 dB re narration peak | +0.00 |
| 832 | 27.733 | 27.913 | person 5 wrench | ratchet | sfx | -24.9 dB re narration peak | -0.20 |
| 838 | 27.933 | 28.833 | person 4 hammer | hammer_hit | sfx | -15.7 dB re narration peak | -0.30 |
| 838 | 27.933 | 28.933 | hook lowered to the block | chain_rattle | sfx | -26.4 dB re narration peak | +0.20 |
| 842 | 28.067 | 28.301 | person 3 chalk | chalk_scratch | sfx | -24.4 dB re narration peak | +0.00 |
| 846 | 28.200 | 28.380 | person 5 wrench | ratchet | sfx | -24.5 dB re narration peak | -0.20 |
| 850 | 28.333 | 28.568 | person 6 chalk | chalk_scratch | sfx | -24.0 dB re narration peak | -0.10 |
| 852 | 28.400 | 29.400 | slings hooked round the block | chain_rattle | sfx | -24.1 dB re narration peak | +0.15 |
| 861 | 28.700 | 28.906 | person 3 chalk | chalk_scratch | sfx | -24.7 dB re narration peak | +0.00 |
| 861 | 28.700 | 28.880 | person 5 wrench | ratchet | sfx | -25.4 dB re narration peak | -0.20 |
| 862 | 28.733 | 29.633 | person 4 hammer | hammer_hit | sfx | -15.6 dB re narration peak | -0.30 |
| 866 | 28.867 | 30.467 | winch takes the load, block lifts | crane_winch | sfx | -25.1 dB re narration peak | +0.20 |
| 873 | 29.100 | 29.304 | person 6 chalk | chalk_scratch | sfx | -24.6 dB re narration peak | -0.10 |
| 875 | 29.167 | 29.347 | person 5 wrench | ratchet | sfx | -23.3 dB re narration peak | -0.20 |
| 889 | 29.633 | 29.813 | person 5 wrench | ratchet | sfx | -23.5 dB re narration peak | -0.20 |
| 894 | 29.800 | 30.207 | person 4 hat | cloth_soft | sfx | -30.1 dB re narration peak | -0.30 |
| 894 | 29.800 | 31.400 | crane slews toward the ship | crane_winch | sfx | -28.1 dB re narration peak | +0.40 |
| 902 | 30.067 | 30.341 | person 8 wave | cloth_soft | sfx | -32.2 dB re narration peak | -0.30 |
| 905 | 30.167 | 31.067 | gull cry over the river | gull | sfx | -31.7 dB re narration peak | +1.00 |
| 926 | 30.867 | 32.467 | block lowered into the hold | crane_winch | sfx | -27.6 dB re narration peak | +0.50 |
| 944 | 31.467 | 31.967 | block lands in the hold | stone_thud | sfx | -16.9 dB re narration peak | +0.50 |
| 950 | 31.667 | 32.667 | deck hand frees the slings | chain_rattle | sfx | -26.5 dB re narration peak | +0.50 |
| 952 | 31.733 | 33.933 | ship's horn: casting off | ship_horn | sfx | -21.4 dB re narration peak | +0.60 |
| 960 | 32.000 | 35.000 | engine chugs as the ship pulls away | ship_engine | sfx | -25.7 dB re narration peak | +0.60 |
| 964 | 32.133 | 32.455 | person 9 wave | cloth_soft | sfx | -30.1 dB re narration peak | -0.20 |
| 970 | 32.333 | 33.333 | bow wave as she gathers way | bow_splash | sfx | -29.3 dB re narration peak | +0.50 |
| 985 | 32.833 | 35.467 | ambience segment: sea (0.5 s equal-power crossfades) | ambience_sea | bed | see preset | stereo wide |
| 988 | 32.933 | 35.933 | ship engine at sea | ship_engine | sfx | -24.2 dB re narration peak | +0.30 |
| 992 | 33.067 | 34.067 | bow cuts a swell | bow_splash | sfx | -25.8 dB re narration peak | +0.20 |
| 1006 | 33.533 | 34.533 | bow cuts a swell | bow_splash | sfx | -27.1 dB re narration peak | +0.20 |
| 1024 | 34.133 | 36.733 | lock gate motors start, gates swing open | lock_gate | sfx | -24.0 dB re narration peak | +0.40 |
| 1070 | 34.167 | 37.567 | 1960s flatbed truck 0 rumbles past with numbered blocks | truck_pass | sfx | -18.0 dB re narration peak | -0.60 |
| 1034 | 34.467 | 36.667 | short horn entering the lock | ship_horn | sfx | -21.5 dB re narration peak | +0.40 |
| 1082 | 34.567 | 37.967 | 1960s flatbed truck 1 rumbles past with numbered blocks | truck_pass | sfx | -21.3 dB re narration peak | -0.30 |
| 1040 | 34.667 | 37.467 | water churns as the gates open | water_rush | sfx | -23.6 dB re narration peak | +0.30 |
| 1094 | 34.967 | 38.367 | 1960s flatbed truck 2 rumbles past with numbered blocks | truck_pass | sfx | -23.5 dB re narration peak | +0.00 |
| 1064 | 35.467 | 49.367 | ambience segment: desert (0.5 s equal-power crossfades) | ambience_desert | bed | see preset | stereo wide |
| 1100 | 36.667 | 37.567 | lead truck's air brakes hiss at the site | air_brake | sfx | -27.3 dB re narration peak | +0.20 |
| 1139 | 37.967 | 39.567 | truck crane winch lifts a block off the stack | crane_winch | sfx | -28.9 dB re narration peak | -0.50 |
| 1142 | 38.067 | 42.067 | concrete mixer drum churning | concrete_mixer | sfx | -29.4 dB re narration peak | +0.60 |
| 1144 | 38.133 | 38.494 | person 3 wave | cloth_soft | sfx | -31.5 dB re narration peak | +0.32 |
| 1158 | 38.600 | 39.100 | granite block set into the facing | stone_thud | sfx | -17.0 dB re narration peak | -0.40 |
| 1174 | 39.133 | 40.033 | person 0 hammer | hammer_hit | sfx | -17.9 dB re narration peak | -0.93 |
| 1183 | 39.433 | 41.033 | truck crane winch lifts a block off the stack | crane_winch | sfx | -28.4 dB re narration peak | -0.50 |
| 1186 | 39.533 | 39.713 | person 1 wrench | ratchet | sfx | -24.7 dB re narration peak | -0.78 |
| 1187 | 39.567 | 40.017 | person 2 shovel | shovel_dig | sfx | -18.9 dB re narration peak | -0.38 |
| 1197 | 39.900 | 40.800 | person 0 hammer | hammer_hit | sfx | -17.9 dB re narration peak | -0.93 |
| 1200 | 40.000 | 40.180 | person 1 wrench | ratchet | sfx | -25.3 dB re narration peak | -0.78 |
| 1200 | 40.000 | 40.900 | person 3 hammer | hammer_hit | sfx | -18.4 dB re narration peak | +0.32 |
| 1202 | 40.067 | 40.567 | granite block set into the facing | stone_thud | sfx | -17.9 dB re narration peak | -0.40 |
| 1214 | 40.467 | 40.647 | person 1 wrench | ratchet | sfx | -23.7 dB re narration peak | -0.78 |
| 1221 | 40.700 | 41.150 | person 2 shovel | shovel_dig | sfx | -17.4 dB re narration peak | -0.38 |
| 1227 | 40.900 | 42.500 | truck crane winch lifts a block off the stack | crane_winch | sfx | -30.0 dB re narration peak | -0.50 |
| 1227 | 40.900 | 41.080 | person 1 wrench | ratchet | sfx | -25.2 dB re narration peak | -0.78 |
| 1230 | 41.000 | 41.900 | person 3 hammer | hammer_hit | sfx | -16.7 dB re narration peak | +0.32 |
| 1238 | 41.267 | 41.583 | person 0 hat | cloth_soft | sfx | -29.9 dB re narration peak | -0.93 |
| 1238 | 41.267 | 42.067 | scaffold poles come down | scaffold_clatter | sfx | -23.3 dB re narration peak | +0.30 |
| 1241 | 41.367 | 41.547 | person 1 wrench | ratchet | sfx | -24.8 dB re narration peak | -0.78 |
| 1242 | 41.400 | 41.720 | Hal walks up to admire the bridge | step_sand | sfx | -19.6 dB re narration peak | -0.30 |
| 1246 | 41.533 | 42.033 | granite block set into the facing | stone_thud | sfx | -17.1 dB re narration peak | -0.40 |
| 1247 | 41.567 | 42.367 | scaffold poles come down | scaffold_clatter | sfx | -25.0 dB re narration peak | +0.30 |
| 1250 | 41.667 | 41.987 | Hal walks up to admire the bridge | step_sand | sfx | -20.3 dB re narration peak | -0.30 |
| 1255 | 41.833 | 42.633 | scaffold poles come down | scaffold_clatter | sfx | -25.2 dB re narration peak | +0.00 |
| 1258 | 41.933 | 42.253 | Hal walks up to admire the bridge | step_sand | sfx | -18.8 dB re narration peak | -0.30 |
| 1265 | 42.167 | 42.487 | Hal walks up to admire the bridge | step_sand | sfx | -18.4 dB re narration peak | -0.30 |
| 1276 | 42.533 | 42.953 | Hal's proud ta-da at the finished bridge | fabric_swish_big | sfx | -22.5 dB re narration peak | -0.20 |
| 1300 | 43.333 | 46.333 | tumbleweed rolls along the dry channel | tumble_roll_2 | sfx | -27.1 dB re narration peak | moving |
| 1358 | 45.267 | 45.447 | Hal freezes: no river | freeze_sting | sfx | -28.1 dB re narration peak | +0.00 |
| 1372 | 45.733 | 46.053 | nervous gulp | gulp | sfx | -22.0 dB re narration peak | -0.20 |
| 1384 | 46.133 | 49.333 | excavators rumble in along the channel on their tracks | excavator | sfx | -20.8 dB re narration peak | +0.20 |
| 1408 | 46.933 | 47.253 | Hal slinks away | step_sand | sfx | -20.4 dB re narration peak | -0.40 |
| 1420 | 47.333 | 48.033 | excavator buckets bite the channel bed | bucket_scrape | sfx | -21.9 dB re narration peak | -0.20 |
| 1420 | 47.333 | 47.653 | Hal slinks away | step_sand | sfx | -22.0 dB re narration peak | -0.50 |
| 1490 | 47.667 | 53.667 | motorboat 2 passes under the arch | boat_pass | sfx | -23.0 dB re narration peak | -0.03 |
| 1440 | 48.000 | 48.900 | soil dumped on the bank | dirt_dump | sfx | -24.8 dB re narration peak | +0.30 |
| 1444 | 48.133 | 50.933 | water released: rushes down the new channel | water_rush | sfx | -21.7 dB re narration peak | +0.00 |
| 1452 | 48.400 | 51.600 | excavators climb out of the channel | excavator | sfx | -24.6 dB re narration peak | +0.40 |
| 1476 | 49.200 | 51.800 | flood front crashes under the arches | splash_big | sfx | -21.3 dB re narration peak | +0.10 |
| 1481 | 49.367 | 59.011 | ambience segment: crowd (0.5 s equal-power crossfades) | ambience_crowd | bed | see preset | stereo wide |
| 1502 | 50.067 | 50.157 | person 0 claps | clap_soft | crowd | -23.4 dB re narration peak | -0.67 |
| 1510 | 50.333 | 50.423 | person 0 claps | clap_soft | crowd | -23.6 dB re narration peak | -0.75 |
| 1510 | 50.333 | 50.772 | person 1 lifts camera | cloth_soft | sfx | -32.5 dB re narration peak | -0.03 |
| 1511 | 50.367 | 50.649 | person 9 lapel | cloth_soft | sfx | -32.1 dB re narration peak | -0.54 |
| 1518 | 50.600 | 50.690 | person 0 claps | clap_soft | crowd | -21.6 dB re narration peak | -0.82 |
| 1525 | 50.833 | 51.253 | person 1 presses the shutter | shutter | sfx | -14.8 dB re narration peak | -0.15 |
| 1525 | 50.833 | 51.183 | person 1 flashcube/flash gun fires | flash_pop | sfx | -23.2 dB re narration peak | -0.15 |
| 1527 | 50.900 | 50.990 | person 0 claps | clap_soft | crowd | -24.3 dB re narration peak | -0.88 |
| 1587 | 50.900 | 56.900 | motorboat 1 passes under the arch | boat_pass | sfx | -23.1 dB re narration peak | +0.38 |
| 1534 | 51.133 | 51.433 | person 1 winds on the film | film_advance | sfx | -26.2 dB re narration peak | -0.20 |
| 1539 | 51.300 | 51.720 | person 1 presses the shutter | shutter | sfx | -13.7 dB re narration peak | -0.22 |
| 1541 | 51.367 | 51.755 | person 6 wave | cloth_soft | sfx | -31.1 dB re narration peak | -0.28 |
| 1546 | 51.533 | 51.946 | person 1 lowers camera | cloth_soft | sfx | -30.8 dB re narration peak | -0.24 |
| 1548 | 51.600 | 51.900 | person 1 winds on the film | film_advance | sfx | -24.0 dB re narration peak | -0.25 |
| 1585 | 52.833 | 53.136 | person 3 lifts camera | cloth_soft | sfx | -30.1 dB re narration peak | -0.25 |
| 1591 | 53.033 | 53.123 | person 4 claps | clap_soft | crowd | -24.4 dB re narration peak | -0.65 |
| 1598 | 53.267 | 53.357 | person 4 claps | clap_soft | crowd | -21.7 dB re narration peak | -0.59 |
| 1605 | 53.500 | 53.920 | person 3 presses the shutter | shutter | sfx | -13.6 dB re narration peak | -0.07 |
| 1605 | 53.500 | 53.850 | person 3 flashcube/flash gun fires | flash_pop | sfx | -21.7 dB re narration peak | -0.07 |
| 1605 | 53.500 | 53.590 | person 4 claps | clap_soft | crowd | -21.5 dB re narration peak | -0.52 |
| 1607 | 53.567 | 53.657 | person 0 claps | clap_soft | crowd | -23.2 dB re narration peak | -0.65 |
| 1612 | 53.733 | 54.033 | person 3 winds on the film | film_advance | sfx | -26.0 dB re narration peak | +0.00 |
| 1617 | 53.900 | 53.990 | person 0 claps | clap_soft | crowd | -21.8 dB re narration peak | -0.54 |
| 1617 | 53.900 | 54.210 | person 3 lowers camera | cloth_soft | sfx | -32.1 dB re narration peak | +0.06 |
| 1684 | 54.133 | 60.133 | motorboat 0 passes under the arch | boat_pass | sfx | -23.6 dB re narration peak | -0.33 |
| 1631 | 54.367 | 54.738 | person 6 lapel | cloth_soft | sfx | -30.0 dB re narration peak | +0.29 |
| 1633 | 54.433 | 54.713 | Hal's suit sleeve (gesture change) | fabric_swish | sfx | -30.7 dB re narration peak | -0.15 |
| 1636 | 54.533 | 54.877 | person 7 lifts camera | cloth_soft | sfx | -31.2 dB re narration peak | -0.22 |
| 1639 | 54.633 | 54.723 | person 8 claps | clap_soft | crowd | -22.7 dB re narration peak | +0.48 |
| 1653 | 55.100 | 55.520 | person 7 presses the shutter | shutter | sfx | -15.4 dB re narration peak | -0.04 |
| 1661 | 55.367 | 55.667 | person 7 winds on the film | film_advance | sfx | -26.3 dB re narration peak | +0.03 |
| 1669 | 55.633 | 56.053 | person 7 presses the shutter | shutter | sfx | -13.7 dB re narration peak | +0.09 |
| 1669 | 55.633 | 55.983 | person 7 flashcube/flash gun fires | flash_pop | sfx | -22.6 dB re narration peak | +0.09 |
| 1671 | 55.700 | 56.043 | person 9 lifts camera | cloth_soft | sfx | -29.6 dB re narration peak | +0.22 |
| 1677 | 55.900 | 56.216 | person 7 lowers camera | cloth_soft | sfx | -30.3 dB re narration peak | +0.14 |
| 1678 | 55.933 | 56.233 | person 7 winds on the film | film_advance | sfx | -25.7 dB re narration peak | +0.14 |
| 1687 | 56.233 | 56.653 | person 9 presses the shutter | shutter | sfx | -15.3 dB re narration peak | +0.30 |
| 1695 | 56.500 | 56.800 | person 9 winds on the film | film_advance | sfx | -25.5 dB re narration peak | +0.31 |
| 1696 | 56.533 | 56.947 | person 5 lifts camera | cloth_soft | sfx | -31.0 dB re narration peak | +0.92 |
| 1697 | 56.567 | 56.987 | person 9 presses the shutter | shutter | sfx | -15.3 dB re narration peak | +0.32 |
| 1697 | 56.567 | 56.917 | person 9 flashcube/flash gun fires | flash_pop | sfx | -24.3 dB re narration peak | +0.32 |
| 1699 | 56.633 | 56.723 | person 6 claps | clap_soft | crowd | -21.8 dB re narration peak | +0.77 |
| 1701 | 56.700 | 56.980 | Hal's suit sleeve (gesture change) | fabric_swish | sfx | -31.6 dB re narration peak | -0.15 |
| 1706 | 56.867 | 57.167 | person 9 winds on the film | film_advance | sfx | -24.8 dB re narration peak | +0.31 |
| 1706 | 56.867 | 57.165 | person 9 lowers camera | cloth_soft | sfx | -29.5 dB re narration peak | +0.31 |
| 1709 | 56.967 | 57.057 | person 6 claps | clap_soft | crowd | -23.5 dB re narration peak | +0.75 |
| 1710 | 57.000 | 57.420 | person 5 presses the shutter | shutter | sfx | -14.8 dB re narration peak | +0.90 |
| 1710 | 57.000 | 57.350 | person 5 flashcube/flash gun fires | flash_pop | sfx | -21.5 dB re narration peak | +0.90 |
| 1714 | 57.133 | 57.313 | comic freeze tick | freeze_sting | sfx | -28.1 dB re narration peak | -0.10 |
| 1717 | 57.233 | 57.533 | person 5 winds on the film | film_advance | sfx | -25.6 dB re narration peak | +0.88 |
| 1717 | 57.233 | 57.553 | Hal gulps after the flash | gulp | sfx | -22.7 dB re narration peak | -0.15 |
| 1719 | 57.300 | 57.666 | person 3 wave | cloth_soft | sfx | -31.6 dB re narration peak | +0.65 |
| 1721 | 57.367 | 57.651 | person 0 hat | cloth_soft | sfx | -31.9 dB re narration peak | +0.04 |
| 1723 | 57.433 | 57.731 | person 7 lifts camera | cloth_soft | sfx | -31.5 dB re narration peak | +0.13 |
| 1727 | 57.567 | 57.987 | person 5 presses the shutter | shutter | sfx | -13.8 dB re narration peak | +0.82 |
| 1727 | 57.567 | 57.847 | Hal's suit sleeve (gesture change) | fabric_swish | sfx | -29.1 dB re narration peak | -0.15 |
| 1733 | 57.767 | 58.173 | person 2 lapel | cloth_soft | sfx | -30.1 dB re narration peak | +0.25 |
| 1734 | 57.800 | 58.100 | person 5 winds on the film | film_advance | sfx | -26.5 dB re narration peak | +0.77 |
| 1735 | 57.833 | 58.214 | person 5 lowers camera | cloth_soft | sfx | -31.4 dB re narration peak | +0.77 |
| 1739 | 57.967 | 58.387 | person 7 presses the shutter | shutter | sfx | -15.8 dB re narration peak | +0.02 |
| 1744 | 58.133 | 58.502 | person 7 lowers camera | cloth_soft | sfx | -31.8 dB re narration peak | -0.03 |
| 1746 | 58.200 | 58.500 | person 7 winds on the film | film_advance | sfx | -23.6 dB re narration peak | -0.05 |
| 1759 | 58.633 | 58.913 | Hal's suit sleeve (gesture change) | fabric_swish | sfx | -31.2 dB re narration peak | -0.15 |
