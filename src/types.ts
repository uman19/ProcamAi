export interface CompositionGuidePoint {
  x: number;
  y: number;
}

export interface CompositionGuideLine {
  type: "line" | "rect" | "curve";
  points: CompositionGuidePoint[];
}

export interface CompositionSuggestion {
  type: string;
  title: string;
  reason: string;
  score: number;
  guides?: CompositionGuideLine[];
}

export type FileFormat = "JPEG" | "RAW_SIM";

export interface CameraSettings {
  iso: number;
  shutterSpeed: string;
  shutterValue: number; // raw value for sorting/filtering
  aperture: string;
  whiteBalanceTemp: number; // in Kelvin
  whiteBalanceTint: number; // -50 to +50
  lensId: string;
  frameRate: number;
  format: FileFormat;
  lutId: string;
  focusPeaking: boolean;
  focusPeakingColor: "green" | "cyan" | "red";
  exposureBias: number; // EV stops e.g. -2 to +2
}

export interface LutPreset {
  id: string;
  name: string;
  description: string;
  cssFilters: string; // Tailwind or CSS filter representation for preview
}

export interface LensPreset {
  id: string;
  name: string;
  focalLength: string;
  maxAperture: string;
  sensorCrop: string;
}

export interface CapturedPhoto {
  id: string;
  timestamp: string;
  dataUrl: string;
  metadata: {
    iso: number;
    shutter: string;
    aperture: string;
    kelvin: number;
    lutName: string;
    lensName: string;
    format: string;
    fileSize: string;
  };
}
