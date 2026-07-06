import { LutPreset, LensPreset } from "./types";

export const LUT_PRESETS: LutPreset[] = [
  {
    id: "none",
    name: "Linear (Rec.709)",
    description: "Unprocessed, natural camera colors with neutral contrast profile.",
    cssFilters: "contrast(1.0) saturate(1.0)",
  },
  {
    id: "cinelog",
    name: "CineStyle LOG",
    description: "Flat log color space for maximum dynamic range preservation.",
    cssFilters: "contrast(0.7) saturate(0.8) brightness(1.15)",
  },
  {
    id: "teal_orange",
    name: "Teal & Orange Pro",
    description: "Hollywood standard block-buster lookup with warm skin tones and cool shadows.",
    cssFilters: "contrast(1.2) saturate(1.1) hue-rotate(-5deg) sepia(0.08)",
  },
  {
    id: "classic_chrome",
    name: "Classic Chrome",
    description: "Deep, documentary-style color rendering with soft, rich midtones.",
    cssFilters: "contrast(1.15) saturate(0.85) sepia(0.12) brightness(0.95)",
  },
  {
    id: "warm_gold",
    name: "Warm Gold (Golden Hour)",
    description: "Enhances amber highlights, sunset glow, and cozy organic tones.",
    cssFilters: "sepia(0.35) contrast(1.1) saturate(1.25) brightness(0.98)",
  },
  {
    id: "mono_highkey",
    name: "B&W High-Key Contrast",
    description: "Crisp black and white with silver accents and sharp contrast curves.",
    cssFilters: "grayscale(1.0) contrast(1.4) brightness(1.05)",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon 2077",
    description: "Vibrant pink-magenta highlight shifts and cold violet shadow details.",
    cssFilters: "contrast(1.25) saturate(1.4) hue-rotate(180deg) sepia(0.05)",
  }
];

export const LENS_PRESETS: LensPreset[] = [
  {
    id: "lens_ultra_wide",
    name: "13mm f/2.2 Ultra Wide",
    focalLength: "13mm",
    maxAperture: "f/2.2",
    sensorCrop: "0.5x Ultra Wide Lens",
  },
  {
    id: "lens_wide",
    name: "24mm f/1.7 Main",
    focalLength: "24mm",
    maxAperture: "f/1.7",
    sensorCrop: "1.0x Primary Sensor",
  },
  {
    id: "lens_portrait",
    name: "50mm f/1.8 Standard",
    focalLength: "50mm",
    maxAperture: "f/1.8",
    sensorCrop: "2.0x Simulated Optical Tele",
  },
  {
    id: "lens_tele",
    name: "77mm f/2.8 Telephoto",
    focalLength: "77mm",
    maxAperture: "f/2.8",
    sensorCrop: "3.2x Telephoto Lens",
  }
];

export const SHUTTER_SPEEDS = [
  "1/8000s",
  "1/4000s",
  "1/2000s",
  "1/1000s",
  "1/500s",
  "1/250s",
  "1/125s",
  "1/60s",
  "1/30s",
  "1/15s",
  "1/8s",
  "1/4s",
  "1/2s",
  "1s"
];

export const ISO_PRESETS = [50, 100, 200, 400, 800, 1600, 3200, 6400];
