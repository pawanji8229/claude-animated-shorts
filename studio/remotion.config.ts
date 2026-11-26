import { Config } from "@remotion/cli/config";

// GPU-less Linux (GitHub-hosted runners, cloud containers): WebGL must run on a software
// rasteriser. "swangle" = ANGLE on top of SwiftShader and was verified to render this
// project's Three.js scene headless. Override per call with --gl=<angle|swangle|...>.
Config.setChromiumOpenGlRenderer("swangle");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// Software WebGL is CPU-bound; 2 tabs fit a 4-vCPU / 16 GB runner comfortably.
Config.setConcurrency(2);
