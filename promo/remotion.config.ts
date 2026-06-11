import { Config } from "@remotion/cli/config"

Config.setEntryPoint("src/index.ts")
Config.setVideoImageFormat("jpeg")
Config.setOverwriteOutput(true)
// Required for WebGL (three.js) rendering in headless Chrome
Config.setChromiumOpenGlRenderer("angle")
