import React from "react";
import { Composition } from "remotion";
import { Short3Film } from "./productions/short3/Film";
import { JTest, J_TEST_N } from "./productions/joralemon/Test";
import { JoralemonFilm } from "./productions/joralemon/Film";
import { FlightTest, FLIGHT_TEST_N } from "./productions/flight/Test";
import { FlightFilm } from "./productions/flight/Film";
import { PoTest, PO_TEST_N } from "./productions/postoffice/Test";
import { CentTest, CENT_TEST_N } from "./productions/centennial/Test";
import { CentFilm } from "./productions/centennial/Film";
import { BoeingTest, BOEING_TEST_N } from "./productions/boeing/Test";
import { BoeingFilm } from "./productions/boeing/Film";
import { Boeing2Film } from "./productions/boeing2/Film";
import { MailRailTest, MR_TEST_N } from "./productions/mailrail/Test";
import { HotelTest, HOTEL_TEST_N } from "./productions/robothotel/Test";
import { LookTest, LOOK_N } from "./productions/robothotel2/LookTest";
import { ModelSheet, MODEL_SHEET_N } from "./productions/robothotel2/ModelSheet";
import { HotelFilm, HotelStills, STILLS as HOTEL_STILLS } from "./productions/robothotel/Film";
import { MailRailFilm, MailRailStills, STILLS as MR_STILLS } from "./productions/mailrail/Film";
import { TF2Sheet, TF2Motion, TF2_SHEET_N, MOTION_FRAMES as TF2_MOTION_FRAMES } from "./char/tf2/lab/CharLab";
import { TF2Stage3D, STAGE_FRAMES as TF2_STAGE_FRAMES } from "./char/tf2/lab/Stage3D";
import { TF2Compare, TF2PerfOld, TF2PerfNew, PERF_FRAMES as TF2_PERF_FRAMES } from "./char/tf2/lab/Compare";
import { PoFilm } from "./productions/postoffice/Film";
import { FILM_FRAMES as FLIGHT_FRAMES } from "./productions/flight/timeline";
import { JExprTest, EXPR_FRAMES } from "./productions/joralemon/ExprTest";
import { FILM_FRAMES as JOR_FRAMES } from "./productions/joralemon/world";
import { S3Bench } from "./productions/short3/Bench";
import { S3Audit } from "./productions/short3/Audit";
import { FILM_FRAMES as S3_FRAMES } from "./productions/short3/world";
import { InventorWalkIn, inventorSchema } from "./inventor/InventorWalkIn";
import { DURATION, FPS } from "./inventor/timeline";
import { NightShift10, nightShiftSchema } from "./inventor/NightShift10";
import { DURATION10 } from "./inventor/timeline10";
import { Sheet2D } from "./previews/Sheet2D";
import { Hall10 } from "./hall/Hall10";
import { Take10 } from "./hall/Take10";
import { LondonBridgeFilm } from "./desert/LondonBridgeFilm";
import { ReopeningFilm } from "./productions/reopening/Film";
import { LondonBridgeFull } from "./productions/london-bridge/Film";
import { FILM_FRAMES as LB_FULL_FRAMES } from "./productions/london-bridge/timeline";
import { FILM_FRAMES as REOPENING_FRAMES } from "./productions/reopening/scene";
import { FILM_FRAMES } from "./desert/desertHook";
import { DUR_TAKE } from "./hall/take10";
import { DUR_H10 } from "./hall/timelineHall10";
import { Previews, Previews4, previewSchema } from "./previews/Previews";

const defaults = {};

export const RemotionRoot: React.FC = () => (
  <>
    {/* Final 9:16 delivery size */}
    <Composition id="InventorWalkIn" component={InventorWalkIn} schema={inventorSchema} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={defaults} />
    {/* Low-res preview: rendered natively at 540x960 (cheaper than --scale on CPU-only runners) */}
    <Composition id="InventorWalkInPreview" component={InventorWalkIn} schema={inventorSchema} durationInFrames={DURATION} fps={FPS} width={540} height={960} defaultProps={defaults} />
    {/* v2 quality test: 10 s, full post stack. Final-size twin for later. */}
    <Composition id="NightShift10Preview" component={NightShift10} schema={nightShiftSchema} durationInFrames={DURATION10} fps={FPS} width={540} height={960} defaultProps={{ post: true }} />
    <Composition id="NightShift10" component={NightShift10} schema={nightShiftSchema} durationInFrames={DURATION10} fps={FPS} width={1080} height={1920} defaultProps={{ post: true }} />
    {/* v3 approval frames (1080x1920, no on-screen text) */}
    <Composition id="PreviewCharacter" component={Previews} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "character" as const }} />
    <Composition id="PreviewEnvironment" component={Previews} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "environment" as const }} />
    <Composition id="PreviewComposite" component={Previews} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "composite" as const }} />
    <Composition id="Preview4Portrait" component={Previews4} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "portrait4" as const }} />
    <Composition id="Preview4FullBody" component={Previews4} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "character4" as const }} />
    <Composition id="Preview4InScene" component={Previews4} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "composite4" as const }} />
    {/* v4: "Night Errand" 10 s, Odo v4 in the Long Workshop (no on-screen text) */}
    <Composition id="NightErrand10Preview" component={Hall10} durationInFrames={DUR_H10} fps={FPS} width={540} height={960} />
    <Composition id="NightErrand10" component={Hall10} durationInFrames={DUR_H10} fps={FPS} width={1080} height={1920} />
    {/* v5: "The Awkward Encounter" — one continuous take, no cuts, no text */}
    <Composition id="AwkwardTake10Preview" component={Take10} durationInFrames={DUR_TAKE} fps={FPS} width={540} height={960} />
    <Composition id="V5PreviewEnvironment" component={Take10} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ envOnly: true }} />
    <Composition id="V5PreviewCringe" component={Take10} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ frameOverride: 226 }} />
    <Composition id="V5PreviewFinal" component={Take10} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ frameOverride: 284 }} />
    <Composition id="AwkwardTake10" component={Take10} durationInFrames={DUR_TAKE} fps={FPS} width={1080} height={1920} />
    {/* London Bridge film: one composition, rendered in frame-range batches; audio muxed after render */}
    <Composition id="LondonBridgePreview" component={LondonBridgeFilm} durationInFrames={FILM_FRAMES} fps={FPS} width={540} height={960} />
    <Composition id="LondonBridge" component={LondonBridgeFilm} durationInFrames={FILM_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="LBPreviewBridge" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ envOnly: true, frameOverride: 200, camOverride: { pos: [-0.6, 2.2, 13.8] as [number, number, number], look: [-6.4, 4.6, 4.5] as [number, number, number], fov: 44, focus: 11 } }} />
    <Composition id="LBPreviewCar" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ envOnly: true, frameOverride: 90, camOverride: { pos: [-4.3, 1.25, 9.4] as [number, number, number], look: [-10.7, 0.66, 7.85] as [number, number, number], fov: 47, focus: 5.6 } }} />
    <Composition id="LBPreviewEnvironment" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ envOnly: true, frameOverride: 200, camOverride: { pos: [16, 8, 52] as [number, number, number], look: [-2, 5, 0] as [number, number, number], fov: 50, focus: 50 } }} />
    <Composition id="LBPreviewHal" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ frameOverride: 146 }} />
    {/* voice-to-video test production "reopening" (291 frames = 9.6914 s narration) */}
    <Composition id="ReopeningPreview" component={ReopeningFilm} durationInFrames={REOPENING_FRAMES} fps={FPS} width={540} height={960} />
    <Composition id="Reopening" component={ReopeningFilm} durationInFrames={REOPENING_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="Sheet2D" component={Sheet2D} durationInFrames={1} fps={FPS} width={3000} height={2200} />
      <Composition id="LondonBridgeFullPreview" component={LondonBridgeFull} durationInFrames={LB_FULL_FRAMES} fps={30} width={540} height={960} />
    <Composition id="LondonBridgeFull" component={LondonBridgeFull} durationInFrames={LB_FULL_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Short3Preview" component={Short3Film} durationInFrames={S3_FRAMES} fps={30} width={540} height={960} />
    <Composition id="S3Audit" component={S3Audit} durationInFrames={1} fps={30} width={64} height={64} />
    <Composition id="S3Bench" component={S3Bench} durationInFrames={64} fps={30} width={540} height={960} />
    <Composition id="JoralemonPreview" component={JoralemonFilm} durationInFrames={JOR_FRAMES} fps={30} width={540} height={960} />
    <Composition id="JoralemonExprTest" component={JExprTest} durationInFrames={EXPR_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="FlightPreview" component={FlightFilm} durationInFrames={FLIGHT_FRAMES} fps={30} width={540} height={960} />
    <Composition id="Flight" component={FlightFilm} durationInFrames={FLIGHT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="PostOfficePreview" component={PoFilm} durationInFrames={1518} fps={30} width={540} height={960} />
    <Composition id="PostOffice" component={PoFilm} durationInFrames={1518} fps={30} width={1080} height={1920} />
    <Composition id="CentennialPreview" component={CentFilm} durationInFrames={1607} fps={30} width={540} height={960} />
    <Composition id="Centennial" component={CentFilm} durationInFrames={1607} fps={30} width={1080} height={1920} />
    <Composition id="BoeingPreview" component={BoeingFilm} durationInFrames={1550} fps={30} width={540} height={960} />
    <Composition id="Boeing" component={BoeingFilm} durationInFrames={1550} fps={30} width={1080} height={1920} />
    <Composition id="Boeing2Preview" component={Boeing2Film} durationInFrames={1550} fps={30} width={540} height={960} />
    <Composition id="Boeing2" component={Boeing2Film} durationInFrames={1550} fps={30} width={1080} height={1920} />
    <Composition id="MailRailPreview" component={MailRailFilm} durationInFrames={1801} fps={30} width={540} height={960} />
    <Composition id="MailRail" component={MailRailFilm} durationInFrames={1801} fps={30} width={1080} height={1920} />
    <Composition id="MailRailStills" component={MailRailStills} durationInFrames={MR_STILLS.length} fps={30} width={540} height={960} />
    <Composition id="TF2Sheet" component={TF2Sheet} durationInFrames={TF2_SHEET_N} fps={30} width={1080} height={1920} />
    <Composition id="TF2Stage3D" component={TF2Stage3D} durationInFrames={TF2_STAGE_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="TF2Compare" component={TF2Compare} durationInFrames={2} fps={30} width={1080} height={1920} />
    <Composition id="TF2PerfOld" component={TF2PerfOld} durationInFrames={TF2_PERF_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="TF2PerfNew" component={TF2PerfNew} durationInFrames={TF2_PERF_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="TF2Motion" component={TF2Motion} durationInFrames={TF2_MOTION_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="RobotHotelPreview" component={HotelFilm} durationInFrames={1679} fps={30} width={540} height={960} />
    <Composition id="RobotHotel" component={HotelFilm} durationInFrames={1679} fps={30} width={1080} height={1920} />
    <Composition id="RobotHotelStills" component={HotelStills} durationInFrames={HOTEL_STILLS.length} fps={30} width={540} height={960} />
    <Composition id="RH2Look" component={LookTest} durationInFrames={LOOK_N} fps={30} width={1080} height={1920} />
    <Composition id="RH2Models" component={ModelSheet} durationInFrames={MODEL_SHEET_N} fps={30} width={540} height={960} />
    <Composition id="RH2LookS" component={LookTest} durationInFrames={LOOK_N} fps={30} width={540} height={960} />
    <Composition id="HotelTest" component={HotelTest} durationInFrames={HOTEL_TEST_N} fps={30} width={540} height={960} />
    <Composition id="MailRailTest" component={MailRailTest} durationInFrames={MR_TEST_N} fps={30} width={1080} height={1920} />
    <Composition id="MailRailTestS" component={MailRailTest} durationInFrames={MR_TEST_N} fps={30} width={540} height={960} />
    <Composition id="BoeingTest" component={BoeingTest} durationInFrames={BOEING_TEST_N} fps={30} width={1080} height={1920} />
    <Composition id="CentTest" component={CentTest} durationInFrames={CENT_TEST_N} fps={30} width={1080} height={1920} />
    <Composition id="PoTest" component={PoTest} durationInFrames={PO_TEST_N} fps={30} width={1080} height={1920} />
    <Composition id="FlightTest" component={FlightTest} durationInFrames={FLIGHT_TEST_N} fps={30} width={1080} height={1920} />
    <Composition id="Joralemon" component={JoralemonFilm} durationInFrames={JOR_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="JoraTest" component={JTest} durationInFrames={J_TEST_N} fps={30} width={540} height={960} />
    <Composition id="Short3" component={Short3Film} durationInFrames={S3_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
