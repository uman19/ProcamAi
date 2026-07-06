import { useState, useEffect, useRef, useMemo } from "react";
import {
  Camera,
  Layers,
  Settings,
  HardDrive,
  Download,
  RotateCcw,
  Sparkles,
  Zap,
  Sliders,
  Image as ImageIcon,
  Check,
  Eye,
  EyeOff,
  Plus,
  Compass,
  Maximize2,
  Trash2,
  Info,
  SlidersHorizontal,
  FolderOpen
} from "lucide-react";
import { LUT_PRESETS, LENS_PRESETS, SHUTTER_SPEEDS, ISO_PRESETS } from "./presets";
import {
  CameraSettings,
  LutPreset,
  LensPreset,
  CapturedPhoto,
  CompositionSuggestion
} from "./types";
import { applyFocusPeaking } from "./utils/cameraEffects";
import { CompositionGuidesRenderer } from "./components/CompositionGuidesRenderer";
import { CompositionMasterController } from "./components/CompositionMasterController";

// Simulated reference scenes for desktop testing
const SIMULATED_SCENES = [
  {
    id: "mountain",
    name: "Golden Hour Mountain Pass",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    initialAIGuides: {
      type: "triangle",
      title: "Triangular Mountain Composition",
      reason: "The mountain peaks form solid triangular anchors, framing the horizon beautifully. Align your frame so the major peak rests on the upper third intersection.",
      score: 94
    }
  },
  {
    id: "city",
    name: "Cyberpunk Alleyway",
    url: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=1200&q=80",
    initialAIGuides: {
      type: "leading_lines",
      title: "Vanishing Point Perspective",
      reason: "Strong neon signs create converging leading lines heading into the center. Align the crosshairs with the neon sign termination point.",
      score: 91
    }
  },
  {
    id: "minimal",
    name: "Architectural Symmetry",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    initialAIGuides: {
      type: "symmetry",
      title: "Symmetric Architectural Frame",
      reason: "This modernist structure features perfect geometric alignment. Align the center crosshair directly with the main concrete column.",
      score: 98
    }
  },
  {
    id: "portrait",
    name: "Golden Spiral Portrait",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
    initialAIGuides: {
      type: "golden_spiral_right",
      title: "Golden Ratio Portrait Anchor",
      reason: "Subject's eyes are positioned near the natural focus point of the spiral, providing cinematic storytelling depth.",
      score: 87
    }
  }
];

export default function App() {
  // --- CAMERA AND MEDIA STATE ---
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [useRealCamera, setUseRealCamera] = useState<boolean>(true);
  const [simulatedSceneIndex, setSimulatedSceneIndex] = useState<number>(0);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  // --- REFS ---
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null); // For raw captures & peaking
  const histogramCanvasRef = useRef<HTMLCanvasElement | null>(null); // Live histogram
  const frameIntervalRef = useRef<number | null>(null);

  // --- CUSTOM LUT STATE ---
  const [luts, setLuts] = useState<LutPreset[]>(LUT_PRESETS);
  const [customLutName, setCustomLutName] = useState("");
  const [customLutFilter, setCustomLutFilter] = useState("contrast(1.2) sepia(0.2) saturate(1.1)");

  // --- CAMERA SETTINGS ---
  const [settings, setSettings] = useState<CameraSettings>({
    iso: 100,
    shutterSpeed: "1/250s",
    shutterValue: 250,
    aperture: "f/1.8",
    whiteBalanceTemp: 5500, // Kelvin
    whiteBalanceTint: 0,
    lensId: "lens_wide",
    frameRate: 60,
    format: "JPEG",
    lutId: "none",
    focusPeaking: false,
    focusPeakingColor: "green",
    exposureBias: 0.0,
  });

  // --- COMPOSITION SUGGESTIONS STATE ---
  const [analyzingFrame, setAnalyzingFrame] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<CompositionSuggestion[]>([
    {
      type: "thirds",
      title: "Rule of Thirds Grid",
      reason: "Distribute visual weight along the horizontal and vertical third-lines to create dynamic balance and visual harmony.",
      score: 95
    },
    {
      type: "golden_spiral_right",
      title: "Golden Spiral Focus",
      reason: "Align prominent focus subjects onto the spiral's center vertex (Right-side sweep) for a organic, aesthetically perfect frame.",
      score: 89
    },
    {
      type: "symmetry",
      title: "Centered Symmetry Crosshair",
      reason: "Utilize architectural perspective or central landscape horizons to anchor focus dead-center for dramatic effect.",
      score: 82
    }
  ]);

  // --- CAPTURED PHOTOS GALLERY ---
  const [gallery, setGallery] = useState<CapturedPhoto[]>([]);
  const [activePhoto, setActivePhoto] = useState<CapturedPhoto | null>(null);

  // --- EXTERNAL STORAGE / OTG SETTINGS ---
  const [otgEnabled, setOtgEnabled] = useState<boolean>(false);
  const [otgDirectoryHandle, setOtgDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [otgTargetName, setOtgTargetName] = useState<string>("T7_SHIELD_PRO");

  // --- HARDWARE DYNAMIC CAPABILITIES & AUTO AI ---
  const [hardwareCapabilities, setHardwareCapabilities] = useState<any>({
    isSimulated: true,
    iso: { min: 50, max: 25600, step: 1 },
    shutterSpeed: true,
    aperture: false,
    whiteBalanceTemp: { min: 2000, max: 10000 },
    whiteBalanceTint: { min: -50, max: 50 },
    frameRates: [24, 30, 60, 120],
  });
  const [autoAiEnabled, setAutoAiEnabled] = useState<boolean>(true);
  const [otgCapacity, setOtgCapacity] = useState({ total: "2.0 TB", remaining: "1.46 TB", speed: 410 }); // MB/s simulated write
  const [showOtgSetup, setShowOtgSetup] = useState<boolean>(false);

  // --- LIVE UI TABS & MENUS ---
  const [activeControlTab, setActiveControlTab] = useState<"exposure" | "color" | "lens" | "storage" | "luts">("exposure");
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [compositionGuideColor, setCompositionGuideColor] = useState<string>("#eab308"); // amber-500
  const [activeCompositionId, setActiveCompositionId] = useState<string>("thirds");

  // --- INITIALIZE REAL CAMERA STREAM ---
  const startCamera = async () => {
    try {
      setCameraPermissionError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // Pro cameras prefer high resolution & uncompressed options where supported
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 3840, max: 3840 },
          height: { ideal: 2160, max: 2160 },
          frameRate: { ideal: settings.frameRate }
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setUseRealCamera(true);

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        let caps: any = { isSimulated: false };
        if (typeof videoTrack.getCapabilities === "function") {
          const trackCaps = videoTrack.getCapabilities() as any;
          caps.iso = trackCaps.iso || null;
          caps.shutterSpeed = trackCaps.exposureTime || trackCaps.shutterSpeed || null;
          caps.aperture = trackCaps.aperture || null;
          caps.whiteBalanceTemp = trackCaps.colorTemperature || trackCaps.whiteBalanceMode || null;
          caps.exposureCompensation = trackCaps.exposureCompensation || null;
          caps.frameRate = trackCaps.frameRate || null;
          caps.zoom = trackCaps.zoom || null;
        } else {
          caps.iso = null;
        }
        setHardwareCapabilities(caps);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.log("Play interrupted:", e));
      }
    } catch (err: any) {
      console.warn("Could not start physical camera, switching to simulated Pro sensor feed:", err);
      setCameraPermissionError(err.message || "Camera access denied. Operating in Simulated Pro Sensor Mode.");
      setUseRealCamera(false);
      setHardwareCapabilities({
        isSimulated: true,
        iso: { min: 50, max: 25600, step: 1 },
        shutterSpeed: true,
        aperture: false,
        whiteBalanceTemp: { min: 2000, max: 10000 },
        whiteBalanceTint: { min: -50, max: 50 },
        frameRates: [24, 30, 60, 120],
      });
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (frameIntervalRef.current) {
        cancelAnimationFrame(frameIntervalRef.current);
      }
    };
  }, []);

  // Update real camera frame rates if stream is active
  useEffect(() => {
    if (useRealCamera) {
      startCamera();
    }
  }, [settings.frameRate]);

  // --- FOCUS PEAKING & HISTOGRAM ENGINE ---
  useEffect(() => {
    let active = true;

    const renderLoop = () => {
      if (!active) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const histCanvas = histogramCanvasRef.current;

      if (video && video.readyState >= 2) {
        // Render Focus Peaking Overlay
        if (settings.focusPeaking && canvas) {
          applyFocusPeaking(video, canvas, settings.focusPeakingColor);
        }

        // Render Live Histogram
        if (histCanvas) {
          drawHistogram(video, histCanvas);
        }
      }

      frameIntervalRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      active = false;
      if (frameIntervalRef.current) {
        cancelAnimationFrame(frameIntervalRef.current);
      }
    };
  }, [settings.focusPeaking, settings.focusPeakingColor, useRealCamera, simulatedSceneIndex]);

  // --- HISTOGRAM GENERATOR ---
  const drawHistogram = (video: HTMLVideoElement, histCanvas: HTMLCanvasElement) => {
    const ctx = histCanvas.getContext("2d");
    if (!ctx) return;

    const width = histCanvas.width;
    const height = histCanvas.height;
    ctx.clearRect(0, 0, width, height);

    // Create an offscreen buffer to read pixel data quickly
    const offscreen = document.createElement("canvas");
    offscreen.width = 80;
    offscreen.height = 45;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    if (useRealCamera) {
      offCtx.drawImage(video, 0, 0, 80, 45);
    } else {
      // Draw simulated scene image if using simulation
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = SIMULATED_SCENES[simulatedSceneIndex].url;
      try {
        offCtx.drawImage(img, 0, 0, 80, 45);
      } catch (e) {
        // Fallback placeholder image gradient
        const grad = offCtx.createLinearGradient(0, 0, 80, 45);
        grad.addColorStop(0, "#1e1e24");
        grad.addColorStop(1, "#3c1020");
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, 80, 45);
      }
    }

    let imgData;
    try {
      imgData = offCtx.getImageData(0, 0, 80, 45);
    } catch (e) {
      return; // Security error if cross-origin image blocks read
    }

    const data = imgData.data;

    // Calculate RGB channels distributions
    const rHist = new Array(256).fill(0);
    const gHist = new Array(256).fill(0);
    const bHist = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      rHist[data[i]]++;
      gHist[data[i + 1]]++;
      bHist[data[i + 2]]++;
    }

    // Find peak value to normalize
    const maxVal = Math.max(
      Math.max(...rHist),
      Math.max(...gHist),
      Math.max(...bHist)
    ) || 1;

    // Draw combined channels with soft transparent overlay
    ctx.globalCompositeOperation = "screen";

    const drawChannel = (hist: number[], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let i = 0; i < 256; i++) {
        const x = (i / 256) * width;
        const normY = (hist[i] / maxVal) * height * 0.95;
        ctx.lineTo(x, height - normY);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    };

    drawChannel(rHist, "rgba(239, 68, 68, 0.4)");   // Red
    drawChannel(gHist, "rgba(34, 197, 94, 0.4)");   // Green
    drawChannel(bHist, "rgba(59, 130, 246, 0.4)");   // Blue
    ctx.globalCompositeOperation = "source-over";
  };

  // --- CURRENT ACTIVE LUT PRESET ---
  const currentLut = useMemo(() => {
    return luts.find(l => l.id === settings.lutId) || luts[0];
  }, [settings.lutId, luts]);

  // --- LENS AND SENSOR EFFECTS ---
  // We simulate different lens parameters (Wide, Telephoto, Crop zoom) and aperture focus blur
  const simulatedViewStyle = useMemo(() => {
    let scale = 1.0;
    let blur = "blur(0px)";

    // Lens zoom factors
    if (settings.lensId === "lens_ultra_wide") scale = 0.65;
    else if (settings.lensId === "lens_portrait") scale = 1.5;
    else if (settings.lensId === "lens_tele") scale = 2.4;

    // Aperture blur simulation (large f/1.2 creates background depth blur, f/22 is pin sharp)
    const blurMap: Record<string, string> = {
      "f/1.2": "blur(4px)",
      "f/1.7": "blur(3px)",
      "f/1.8": "blur(2.5px)",
      "f/2.8": "blur(1.5px)",
      "f/4.0": "blur(0.8px)",
      "f/8.0": "blur(0px)",
      "f/16": "blur(0px)",
      "f/22": "blur(0px)",
    };
    const depthBlur = blurMap[settings.aperture] || "blur(0px)";

    // Combine custom LUT presets + manual adjustments
    const baseFilter = currentLut.cssFilters;
    // Manual adjustments: Exposure Bias (brightness), White Balance Kelvin (sepia/hue/temperature shift), Tint (hue-rotate)
    const expBrightness = 1.0 + (settings.exposureBias * 0.15);
    const tempSepia = settings.whiteBalanceTemp > 5500
      ? `sepia(${(settings.whiteBalanceTemp - 5500) / 15000})`
      : `hue-rotate(${(settings.whiteBalanceTemp - 5500) / 100}deg) saturate(${1.0 + (5500 - settings.whiteBalanceTemp) / 15000})`;
    const tintShift = `hue-rotate(${settings.whiteBalanceTint * 0.8}deg)`;

    const combinedFilter = `${baseFilter} brightness(${expBrightness}) ${tempSepia} ${tintShift}`;

    return {
      transform: `scale(${scale})`,
      transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease",
      filter: combinedFilter,
    };
  }, [settings.lensId, settings.aperture, settings.exposureBias, settings.whiteBalanceTemp, settings.whiteBalanceTint, currentLut]);

  // --- CHOOSE CURRENT GUIDE OVERLAY ---
  useEffect(() => {
    // Sync current active grid layout with suggestions list
    if (suggestions[activeSuggestionIndex]) {
      setActiveCompositionId(suggestions[activeSuggestionIndex].type);
    }
  }, [activeSuggestionIndex, suggestions]);

  // --- SCAN & ANALYZE VIEW USING AI ENGINE ---
  const triggerCompositionAnalysis = async () => {
    setAnalyzingFrame(true);
    try {
      // Capture the current viewfinder frame
      let frameBase64 = "";
      const offscreen = document.createElement("canvas");
      offscreen.width = 640;
      offscreen.height = 480;
      const ctx = offscreen.getContext("2d");

      if (ctx) {
        if (useRealCamera && videoRef.current) {
          ctx.drawImage(videoRef.current, 0, 0, 640, 480);
          frameBase64 = offscreen.toDataURL("image/jpeg").split(",")[1];
        } else {
          // Send simulated scene frame
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = SIMULATED_SCENES[simulatedSceneIndex].url;
          // Ensure image is loaded before grabbing frame
          await new Promise((resolve) => {
            img.onload = () => {
              ctx.drawImage(img, 0, 0, 640, 480);
              frameBase64 = offscreen.toDataURL("image/jpeg").split(",")[1];
              resolve(true);
            };
            img.onerror = () => {
              // Create dynamic gradient fallback if image CORS blocks loading
              const grad = ctx.createLinearGradient(0, 0, 640, 480);
              grad.addColorStop(0, "#1c1917");
              grad.addColorStop(1, "#44403c");
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, 640, 480);
              frameBase64 = offscreen.toDataURL("image/jpeg").split(",")[1];
              resolve(true);
            };
          });
        }
      }

      if (!frameBase64) {
        throw new Error("Could not acquire viewfinder frame buffer.");
      }

      // POST to server endpoint
      const response = await fetch("/api/composition-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frameBase64,
          mimeType: "image/jpeg"
        }),
      });

      const result = await response.json();
      if (result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
        setActiveSuggestionIndex(0);
      }
    } catch (error) {
      console.error("AI Composition analysis failed:", error);
    } finally {
      setAnalyzingFrame(false);
    }
  };

  // --- AUTOMATIC AI COMPOSITION TRACKING EFFECTS ---
  // A. Trigger automatically when user switches simulated scenery
  useEffect(() => {
    if (autoAiEnabled && !useRealCamera) {
      const t = setTimeout(() => {
        triggerCompositionAnalysis();
      }, 250);
      return () => clearTimeout(t);
    }
  }, [simulatedSceneIndex, autoAiEnabled, useRealCamera]);

  // B. Trigger background tracking periodically on live camera feed (every 8.5 seconds)
  useEffect(() => {
    if (!useRealCamera || !autoAiEnabled || !stream) return;
    
    // Initial scan
    triggerCompositionAnalysis();

    const interval = setInterval(() => {
      triggerCompositionAnalysis();
    }, 8500);
    
    return () => clearInterval(interval);
  }, [useRealCamera, autoAiEnabled, stream]);

  // --- MANUAL COMPOSITION SWITCH ---
  const handleSelectSuggestion = (idx: number) => {
    setActiveSuggestionIndex(idx);
    const suggestion = suggestions[idx];
    if (suggestion) {
      setActiveCompositionId(suggestion.type);
    }
  };

  const renderHardwareBadge = (feature: string) => {
    if (!useRealCamera) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/30">
          SIMULATED DECK
        </span>
      );
    }
    const hasCapability = !!hardwareCapabilities[feature];
    if (hasCapability) {
      return (
        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold tracking-wider">
          NATIVE SENSOR
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold tracking-wider">
        EMULATED
      </span>
    );
  };

  // --- TAKE PHOTO SHOT ---
  const triggerCapture = async () => {
    // Play camera sound trigger
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);

    // Get capture frame URL
    let dataUrl = "";
    const offscreen = document.createElement("canvas");
    offscreen.width = 1920;
    offscreen.height = 1080;
    const ctx = offscreen.getContext("2d");

    if (ctx) {
      // Apply filters directly to the final captured file output (mirroring the LUT settings chosen)
      ctx.filter = simulatedViewStyle.filter;

      if (useRealCamera && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, 1920, 1080);
        dataUrl = offscreen.toDataURL("image/jpeg");
      } else {
        // Draw simulated scene image if using simulation
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = SIMULATED_SCENES[simulatedSceneIndex].url;
        await new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 1920, 1080);
            dataUrl = offscreen.toDataURL("image/jpeg");
            resolve(true);
          };
          img.onerror = () => {
            // Gradient fallback
            const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
            grad.addColorStop(0, "#1e1b4b");
            grad.addColorStop(0.5, "#311042");
            grad.addColorStop(1, "#030712");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1920, 1080);
            dataUrl = offscreen.toDataURL("image/jpeg");
            resolve(true);
          };
        });
      }
    }

    const currentLens = LENS_PRESETS.find(l => l.id === settings.lensId) || LENS_PRESETS[1];
    const generatedPhotoId = `pro_raw_${Date.now()}`;
    const dateStr = new Date().toLocaleTimeString();

    // Estimate file size
    const sizeBase = settings.format === "RAW_SIM" ? "42.8 MB (Uncompressed DNG)" : "4.2 MB (JPEG)";

    const newPhoto: CapturedPhoto = {
      id: generatedPhotoId,
      timestamp: dateStr,
      dataUrl: dataUrl,
      metadata: {
        iso: settings.iso,
        shutter: settings.shutterSpeed,
        aperture: settings.aperture,
        kelvin: settings.whiteBalanceTemp,
        lutName: currentLut.name,
        lensName: currentLens.name,
        format: settings.format,
        fileSize: sizeBase
      }
    };

    // Save directly to external storage if enabled using standard API
    if (otgEnabled && otgDirectoryHandle) {
      try {
        const fileHandle = await otgDirectoryHandle.getFileHandle(`${generatedPhotoId}.jpg`, { create: true });
        const writable = await fileHandle.createWritable();
        const blobResponse = await fetch(dataUrl);
        const blob = await blobResponse.blob();
        await writable.write(blob);
        await writable.close();
        console.log(`Saved directly to external drive: ${generatedPhotoId}.jpg`);

        // If RAW is enabled, create sidecar metadata and RAW layout binary file
        if (settings.format === "RAW_SIM") {
          const rawFileHandle = await otgDirectoryHandle.getFileHandle(`${generatedPhotoId}.dng`, { create: true });
          const rawWritable = await rawFileHandle.createWritable();
          // Write JSON as placeholder DNG layout simulation binary
          const metaBlob = new Blob([JSON.stringify(newPhoto.metadata, null, 2)], { type: "application/json" });
          await rawWritable.write(metaBlob);
          await rawWritable.close();
        }
      } catch (err) {
        console.warn("Direct save failed (user cancelled or permission issue). Saving to memory fallback.", err);
      }
    }

    setGallery((prev) => [newPhoto, ...prev]);
    setActivePhoto(newPhoto);

    // Briefly flash screen white
    const flashEl = document.createElement("div");
    flashEl.className = "absolute inset-0 bg-white z-50 pointer-events-none duration-150 ease-out opacity-100 transition-opacity";
    document.getElementById("camera-viewport-container")?.appendChild(flashEl);
    setTimeout(() => {
      flashEl.style.opacity = "0";
      setTimeout(() => flashEl.remove(), 150);
    }, 50);
  };

  // --- CONNECT SYSTEM DIRECTORY (OTG) ACCESS ---
  const requestOtgAccess = async () => {
    try {
      if (typeof (window as any).showDirectoryPicker !== "function") {
        // Browser doesn't support directory pickers, fallback to simulator
        setOtgDirectoryHandle(null);
        setOtgEnabled(true);
        setOtgTargetName("T7_SHIELD_PRO (Simulated Mount)");
        setShowOtgSetup(false);
        return;
      }

      const handle = await (window as any).showDirectoryPicker();
      setOtgDirectoryHandle(handle);
      setOtgEnabled(true);
      setOtgTargetName(handle.name || "External Storage Volume");
      setShowOtgSetup(false);
    } catch (err) {
      console.warn("User cancelled directory pick or browser restricted access.", err);
      // fallback
      setOtgEnabled(true);
      setOtgTargetName("T7_SHIELD_PRO (Simulated Mount)");
      setShowOtgSetup(false);
    }
  };

  // --- DOWNLOAD PHOTO DIRECTLY (Fallback download trigger) ---
  const downloadSinglePhoto = (photo: CapturedPhoto) => {
    const link = document.createElement("a");
    link.href = photo.dataUrl;
    link.download = `${photo.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // If RAW format simulation, download sidecar metadata too
    if (photo.metadata.format === "RAW_SIM") {
      const jsonStr = JSON.stringify(photo, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const metaUrl = URL.createObjectURL(blob);
      const metaLink = document.createElement("a");
      metaLink.href = metaUrl;
      metaLink.download = `${photo.id}_raw_metadata.json`;
      document.body.appendChild(metaLink);
      metaLink.click();
      document.body.removeChild(metaLink);
    }
  };

  // --- ADD CUSTOM LUT PRESET ---
  const handleAddCustomLut = () => {
    if (!customLutName.trim()) return;
    const newLut: LutPreset = {
      id: `custom_${Date.now()}`,
      name: customLutName,
      description: "User imported custom post-production color grade parameters.",
      cssFilters: customLutFilter
    };
    setLuts(prev => [...prev, newLut]);
    setSettings(s => ({ ...s, lutId: newLut.id }));
    setCustomLutName("");
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col min-h-screen bg-zinc-950 text-zinc-100 font-sans p-2 sm:p-4 select-none">
      
      {/* 1. MAIN APP HEADER / HUD */}
      <header className="flex flex-wrap items-center justify-between gap-4 py-3 px-4 bg-zinc-900/60 backdrop-blur-md rounded-xl border border-zinc-800/80 mb-3 z-30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg text-black">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display tracking-tight leading-none">Pro Shot Camera</h1>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">HIGH-PERFORMANCE CINEMATOGRAPHY COMPANION</p>
          </div>
        </div>

        {/* TOP STATUS INDICATORS */}
        <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-zinc-500">FORMAT</span>
            <span className="text-amber-400 font-bold">{settings.format === "RAW_SIM" ? "RAW + DNG" : "COMPRESSED JPEG"}</span>
          </div>

          <div className="h-6 w-px bg-zinc-800"></div>

          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-zinc-500">CAPTURE PORT</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE VIEW
            </span>
          </div>

          <div className="h-6 w-px bg-zinc-800"></div>

          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-zinc-500">EXTERNAL STORAGE</span>
            <button
              onClick={() => setShowOtgSetup(true)}
              className={`font-bold transition-all hover:opacity-80 flex items-center gap-1 ${
                otgEnabled ? "text-amber-400" : "text-zinc-400 underline underline-offset-2"
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              {otgEnabled ? otgTargetName : "CONNECT SSD/OTG"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Scene Fallback selector for deskop */}
          {!useRealCamera && (
            <div className="flex items-center gap-1 bg-zinc-950/80 px-2 py-1 rounded-md border border-zinc-800">
              <span className="text-[10px] text-amber-500 font-bold font-mono">SCENE:</span>
              <select
                className="bg-transparent text-xs text-zinc-200 outline-none cursor-pointer"
                value={simulatedSceneIndex}
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  setSimulatedSceneIndex(idx);
                  // Apply default initial guides corresponding to the simulated scenery
                  const customSug = SIMULATED_SCENES[idx].initialAIGuides;
                  if (customSug) {
                    setSuggestions([
                      {
                        type: customSug.type,
                        title: customSug.title,
                        reason: customSug.reason,
                        score: customSug.score
                      },
                      {
                        type: "thirds",
                        title: "Rule of Thirds Grid",
                        reason: "Basic horizontal/vertical crosshairs alignment for multi-purpose compositional spacing.",
                        score: 95
                      }
                    ]);
                    setActiveSuggestionIndex(0);
                    setActiveCompositionId(customSug.type);
                  }
                }}
              >
                {SIMULATED_SCENES.map((sc, i) => (
                  <option key={sc.id} value={i} className="bg-zinc-900 text-zinc-200">
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              if (useRealCamera) {
                setUseRealCamera(false);
              } else {
                startCamera();
              }
            }}
            className="px-2.5 py-1 text-xs rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition font-mono"
            title="Toggle between physical WebCam and Simulated scenery environment"
          >
            {useRealCamera ? "Use Simulated Feed" : "Use Real Cam"}
          </button>
        </div>
      </header>

      {/* 2. LIVE VIEWFINDER & SIDEBAR CONTROLS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* VIEWPORT AREA: 8 COLS (Sticky pinned at top so you can change settings while watching!) */}
        <div className="lg:col-span-8 flex flex-col gap-3 sticky top-0 lg:top-4 h-fit z-35 bg-zinc-950 lg:bg-transparent pb-3 lg:pb-0 backdrop-blur-md lg:backdrop-blur-none border-b border-zinc-900/30 lg:border-b-0">
          
          {/* VIEWFINDER CONTAINER */}
          <div
            id="camera-viewport-container"
            className="relative aspect-video w-full bg-zinc-950 rounded-2xl overflow-hidden border-2 border-zinc-900 shadow-2xl flex items-center justify-center group"
          >
            {/* CORNER ACCENTS - INDUSTRIAL CINEMA GEAR LOOK */}
            <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-zinc-500/40 pointer-events-none z-30"></div>
            <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-zinc-500/40 pointer-events-none z-30"></div>
            <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-zinc-500/40 pointer-events-none z-30"></div>
            <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-zinc-500/40 pointer-events-none z-30"></div>

            {/* LIVE FEED BACKGROUND OR SIMULATED SCENE */}
            <div className="w-full h-full flex items-center justify-center overflow-hidden bg-[#0a0a0c]">
              {useRealCamera ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover origin-center"
                  style={simulatedViewStyle}
                />
              ) : (
                <img
                  src={SIMULATED_SCENES[simulatedSceneIndex].url}
                  alt="Simulated pro photo scenery"
                  className="w-full h-full object-cover origin-center"
                  style={simulatedViewStyle}
                  id="simulated-viewfinder-img"
                />
              )}
            </div>

            {/* FOCUS PEAKING CANVAS LAYER */}
            {settings.focusPeaking && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
              />
            )}

            {/* DYNAMIC COMPOSITION SVG GRID OVERLAYS */}
            <CompositionGuidesRenderer
              guideType={activeCompositionId}
              guideColor={compositionGuideColor}
            />

            {/* AI SCENERY RADAR SCANNING HUDBANDS */}
            {analyzingFrame && (
              <div className="absolute inset-0 bg-emerald-500/5 flex flex-col items-center justify-center pointer-events-none z-30">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[bounce_2.5s_infinite]"></div>
                <div className="px-3 py-1.5 bg-black/90 border border-emerald-500/40 rounded-full text-[9px] font-mono text-emerald-400 tracking-wider flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  AI SENSOR ACTIVE: ANALYZING SCENERY GEOMETRY...
                </div>
              </div>
            )}

            {/* LIVE HISTOGRAM (HUD FLOATING) */}
            <div className="absolute bottom-4 left-4 bg-black/85 backdrop-blur-md p-2 rounded-lg border border-zinc-800 z-30 w-32 h-20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400">
                <span>HISTOGRAM (RGB)</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <canvas ref={histogramCanvasRef} width={110} height={45} className="w-full h-11" />
            </div>

            {/* LIVE AI GUIDE HIGHLIGHT LABEL */}
            {suggestions[activeSuggestionIndex] && activeCompositionId !== "none" && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 font-display font-semibold text-[11px] uppercase tracking-widest px-3 py-1 rounded-full shadow-lg z-30 flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                Active Guide: {suggestions[activeSuggestionIndex].title}
              </div>
            )}

            {/* LENS SPECIFICATION WATERMARK */}
            <div className="absolute top-4 right-4 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono text-zinc-300 border border-zinc-800 z-30 flex items-center gap-2">
              <span>{LENS_PRESETS.find(l => l.id === settings.lensId)?.name}</span>
              <span className="text-zinc-500">|</span>
              <span>{settings.aperture}</span>
            </div>

            {/* EXPOSURE EV DEVIATION WATERMARK */}
            <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-zinc-300 border border-zinc-800 z-30 flex flex-col items-end">
              <div>ISO {settings.iso} • {settings.shutterSpeed}</div>
              <div className="text-[9px] text-amber-400 font-bold mt-0.5">
                {settings.exposureBias >= 0 ? `+${settings.exposureBias.toFixed(1)}` : settings.exposureBias.toFixed(1)} EV
              </div>
            </div>
          </div>

          {/* QUICK SHUTTER ACTION & QUICK COMPOSITIONS SELECTOR BAR */}
          <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            
            {/* SELECT FORMAT AND CHOP SHUTTER ACTION */}
            <div className="flex items-center gap-3">
              <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                <button
                  onClick={() => setSettings(s => ({ ...s, format: "JPEG" }))}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition ${
                    settings.format === "JPEG" ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  JPEG
                </button>
                <button
                  onClick={() => setSettings(s => ({ ...s, format: "RAW_SIM" }))}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition flex items-center gap-1 ${
                    settings.format === "RAW_SIM" ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  RAW + DNG
                </button>
              </div>

              {/* Focus Peaking Quick Button */}
              <button
                onClick={() => setSettings(s => ({ ...s, focusPeaking: !s.focusPeaking }))}
                className={`px-3 py-2 text-xs font-mono font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                  settings.focusPeaking
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                    : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Focus Peak</span>
                <span className={`w-2 h-2 rounded-full ${
                  settings.focusPeakingColor === "green" ? "bg-green-400" : settings.focusPeakingColor === "cyan" ? "bg-cyan-400" : "bg-red-500"
                }`}></span>
              </button>
            </div>

            {/* GIANT CHROME TACTILE SHUTTER BUTTON */}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-zinc-500 tracking-widest hidden sm:inline uppercase">PHOTO CAPTURE</span>
              <button
                onClick={triggerCapture}
                className="w-16 h-16 rounded-full border-4 border-zinc-100 p-0.5 active:scale-95 transition bg-transparent"
                title="Trigger reference shutter release"
                id="shutter-button-trigger"
              >
                <div className="w-full h-full rounded-full bg-zinc-200 hover:bg-white transition-all shadow-[0_0_15px_rgba(255,255,255,0.4)] flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border border-black/30 bg-zinc-100 flex items-center justify-center">
                    <span className="text-[10px] text-zinc-800 font-bold font-mono">PRO</span>
                  </div>
                </div>
              </button>
            </div>

            {/* COMPOSITION ENGINE SCANNING TRIGGERS */}
            <div className="flex items-center gap-2.5">
              {/* Auto Toggle Switch */}
              <button
                onClick={() => setAutoAiEnabled(!autoAiEnabled)}
                className={`px-3 py-2 text-xs font-mono rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                  autoAiEnabled
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-400"
                }`}
                title="Continuous background scene tracking to automatically update guides"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${autoAiEnabled ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`}></span>
                AUTO AI: {autoAiEnabled ? "ACTIVE" : "PAUSED"}
              </button>

              <button
                onClick={triggerCompositionAnalysis}
                disabled={analyzingFrame}
                className={`px-4 py-2 text-xs font-display font-semibold rounded-xl transition flex items-center gap-1.5 shadow ${
                  analyzingFrame
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:opacity-90"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: analyzingFrame ? "2s" : "0s" }} />
                {analyzingFrame ? "Analyzing..." : "Force AI Scan"}
              </button>
            </div>
          </div>

          {/* AI COMPOSITION DETAILED EXPLANATION PANEL */}
          <div className="bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 border border-zinc-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h3 className="font-display font-bold text-sm text-zinc-100">Live AI Composition Recommendations (1-3)</h3>
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                Select recommendation to project guide
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {suggestions.map((sug, idx) => {
                const isActive = activeSuggestionIndex === idx && activeCompositionId === sug.type;
                return (
                  <div
                    key={`${sug.type}-${idx}`}
                    onClick={() => handleSelectSuggestion(idx)}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all flex flex-col justify-between h-36 ${
                      isActive
                        ? "bg-amber-500/10 border-amber-500 shadow-[0_0_12px_rgba(234,179,8,0.15)]"
                        : "bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-bold text-xs text-zinc-100 truncate">{sug.title}</span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          sug.score >= 90 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          {sug.score}% Match
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed line-clamp-3">
                        {sug.reason}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/60">
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{sug.type}</span>
                      {isActive ? (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Projected
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">Project Guide</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advanced 33 Master Composition Control Dashboard */}
            <div className="mt-3">
              <CompositionMasterController
                activeCompositionId={activeCompositionId}
                setActiveCompositionId={setActiveCompositionId}
                guideColor={compositionGuideColor}
                setGuideColor={setCompositionGuideColor}
                suggestions={suggestions}
                activeSuggestionIndex={activeSuggestionIndex}
                setActiveSuggestionIndex={setActiveSuggestionIndex}
              />
            </div>
          </div>
        </div>

        {/* CONTROLS SIDEBAR COLUMN: 4 COLS */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* TACTILE PARAMETERS MENU TAB BAR */}
          <div className="bg-zinc-900 rounded-xl p-1 border border-zinc-800 flex justify-between">
            {[
              { id: "exposure", label: "Exposure", icon: Sliders },
              { id: "color", label: "Color / WB", icon: SlidersHorizontal },
              { id: "lens", label: "Lens / FOV", icon: Camera },
              { id: "luts", label: "Creative LUTs", icon: Layers },
              { id: "storage", label: "OTG Storage", icon: HardDrive }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveControlTab(tab.id as any)}
                  className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                    activeControlTab === tab.id
                      ? "bg-zinc-800 text-amber-400 font-bold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-[10px] tracking-tight truncate w-full text-center font-display">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ACTIVE PARAMETER DRAWER DETAILS */}
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 flex-1 flex flex-col justify-between min-h-[420px]">
            
            {/* TAB CONTENT: EXPOSURE & SHUTTER MANUAL */}
            {activeControlTab === "exposure" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    Manual Exposure & Shutter Speed
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">Control sensor sensitivity, exposure stops and speed curves.</p>
                </div>

                {/* ISO SLIDER / DIAL */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">SENSOR ISO SENSITIVITY</span>
                      {renderHardwareBadge("iso")}
                    </div>
                    <span className="text-amber-400 font-bold text-sm">ISO {settings.iso}</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                    {ISO_PRESETS.map((val) => (
                      <button
                        key={val}
                        onClick={() => setSettings(s => ({ ...s, iso: val }))}
                        className={`px-3 py-1.5 text-xs font-mono rounded border transition-all shrink-0 ${
                          settings.iso === val
                            ? "bg-amber-500 text-black border-amber-500 font-bold"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SHUTTER SPEED SPEED PRESETS */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">SHUTTER ANGLE / EXPOSURE TIME</span>
                      {renderHardwareBadge("shutterSpeed")}
                    </div>
                    <span className="text-amber-400 font-bold text-sm">{settings.shutterSpeed}</span>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                    {SHUTTER_SPEEDS.map((val) => (
                      <button
                        key={val}
                        onClick={() => setSettings(s => ({ ...s, shutterSpeed: val }))}
                        className={`px-3 py-1.5 text-xs font-mono rounded border transition-all shrink-0 ${
                          settings.shutterSpeed === val
                            ? "bg-amber-500 text-black border-amber-500 font-bold"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* EXPOSURE COMPENSATION BIAS SLIDER */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">EXPOSURE COMP. EV STOP</span>
                      {renderHardwareBadge("exposureCompensation")}
                    </div>
                    <span className="text-amber-400 font-bold text-sm">
                      {settings.exposureBias >= 0 ? `+${settings.exposureBias.toFixed(1)}` : settings.exposureBias.toFixed(1)} EV
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-3"
                    max="3"
                    step="0.3"
                    value={settings.exposureBias}
                    onChange={(e) => setSettings(s => ({ ...s, exposureBias: parseFloat(e.target.value) }))}
                    className="w-full accent-amber-500 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>-3.0 EV (Dark)</span>
                    <span>0.0 EV (Neutral)</span>
                    <span>+3.0 EV (Bright)</span>
                  </div>
                </div>

                {/* FRAME RATE TIMECODE CONFIG */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">TARGET ACQUISITION FRAME RATE</span>
                      {renderHardwareBadge("frameRate")}
                    </div>
                    <span className="text-zinc-300 font-bold">{settings.frameRate} FPS</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[24, 30, 60, 120].map((fps) => (
                      <button
                        key={fps}
                        onClick={() => setSettings(s => ({ ...s, frameRate: fps }))}
                        className={`py-1.5 text-xs font-mono rounded border transition ${
                          settings.frameRate === fps
                            ? "bg-amber-500 text-black border-amber-500 font-bold"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                        }`}
                      >
                        {fps} fps
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: COLOR TEMPERATURE & TINT WB */}
            {activeControlTab === "color" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-sky-400" />
                    White Balance Temp & Tint
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">Calibrate color metrics to preserve perfect environment lighting tones.</p>
                </div>

                {/* WHITE BALANCE KELVIN TEMPERATURE */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">TEMPERATURE (KELVIN)</span>
                      {renderHardwareBadge("whiteBalanceTemp")}
                    </div>
                    <span className="text-sky-400 font-bold text-sm">{settings.whiteBalanceTemp} K</span>
                  </div>
                  <input
                    type="range"
                    min="2000"
                    max="10000"
                    step="100"
                    value={settings.whiteBalanceTemp}
                    onChange={(e) => setSettings(s => ({ ...s, whiteBalanceTemp: parseInt(e.target.value) }))}
                    className="w-full accent-sky-400 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span className="text-blue-300">2000K (Candle)</span>
                    <span className="text-yellow-100">5500K (Daylight)</span>
                    <span className="text-yellow-500">10000K (Sunset)</span>
                  </div>
                </div>

                {/* TINT (MAGENTA - GREEN) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">TINT SHIFT (GREEN / MAGENTA)</span>
                      {renderHardwareBadge("whiteBalanceTemp")}
                    </div>
                    <span className="text-sky-400 font-bold text-sm">
                      {settings.whiteBalanceTint > 0 ? `+${settings.whiteBalanceTint}` : settings.whiteBalanceTint}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={settings.whiteBalanceTint}
                    onChange={(e) => setSettings(s => ({ ...s, whiteBalanceTint: parseInt(e.target.value) }))}
                    className="w-full accent-emerald-400 h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span className="text-emerald-400">Green (-50)</span>
                    <span>Neutral (0)</span>
                    <span className="text-pink-400">Magenta (+50)</span>
                  </div>
                </div>

                {/* LIGHT SOURCE PRESETS */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <span className="text-xs font-mono text-zinc-400 block mb-2">QUICK CALIBRATION SCALES</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "🎬 Tungsten Stud.", temp: 3200, tint: 0 },
                      { name: "☀️ Direct Sun", temp: 5600, tint: 2 },
                      { name: "☁️ Overcast Sky", temp: 6500, tint: -2 },
                      { name: "🕯️ Ambient Flame", temp: 2400, tint: 8 }
                    ].map((ps) => (
                      <button
                        key={ps.name}
                        onClick={() => setSettings(s => ({ ...s, whiteBalanceTemp: ps.temp, whiteBalanceTint: ps.tint }))}
                        className="py-2 px-2.5 text-[11px] font-mono text-zinc-300 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 text-left hover:text-white transition"
                      >
                        {ps.name}
                        <span className="block text-[9px] text-zinc-500 mt-0.5">{ps.temp}K / Tint {ps.tint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: LENS SELECTION & APERTURE */}
            {activeControlTab === "lens" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    Optical Lens Profile & Aperture
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">Select simulated optical lens array and active camera focal length.</p>
                </div>

                {/* CHOOSE LENS ARRAY */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-400">LENS PRESET DECK</span>
                    {renderHardwareBadge("zoom")}
                  </div>
                  <div className="flex flex-col gap-2">
                    {LENS_PRESETS.map((lens) => (
                      <button
                        key={lens.id}
                        onClick={() => setSettings(s => ({ ...s, lensId: lens.id }))}
                        className={`p-3 text-left rounded-xl border transition-all flex items-center justify-between ${
                          settings.lensId === lens.id
                            ? "bg-emerald-500/10 border-emerald-500 text-white"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold font-display text-zinc-100">{lens.name}</span>
                          <span className="text-[10px] text-zinc-500 mt-0.5">{lens.sensorCrop}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                            focal: {lens.focalLength}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SIMULATED APERTURE DEPTH DECK */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-400">DIAPHRAGM APERTURE (DEPTH FIELD)</span>
                      {renderHardwareBadge("aperture")}
                    </div>
                    <span className="text-amber-400 font-bold">{settings.aperture}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["f/1.2", "f/1.8", "f/2.8", "f/4.0", "f/8.0", "f/16", "f/22"].map((ap) => (
                      <button
                        key={ap}
                        onClick={() => setSettings(s => ({ ...s, aperture: ap }))}
                        className={`py-1 rounded text-[11px] font-mono transition-all border ${
                          settings.aperture === ap
                            ? "bg-amber-500 text-black font-bold border-amber-500"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        {ap}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-zinc-500 font-mono italic">
                    Note: Wide apertures (f/1.2 - f/1.8) simulate cinematic shallow depth-of-field. Narrow apertures (f/16 - f/22) maximize detail sharpness.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CREATIVE LUTS PRESETS */}
            {activeControlTab === "luts" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-violet-400" />
                    Cinematic Lookup Tables (LUTs)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">Inject post-processing custom LUT color parameters into video capture stream.</p>
                </div>

                {/* LUT CARDS SELECTION */}
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {luts.map((lut) => (
                    <button
                      key={lut.id}
                      onClick={() => setSettings(s => ({ ...s, lutId: lut.id }))}
                      className={`p-2.5 text-left rounded-xl border transition-all flex items-center justify-between ${
                        settings.lutId === lut.id
                          ? "bg-violet-500/10 border-violet-500 text-white"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950"
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold block text-zinc-100 font-display">{lut.name}</span>
                        <span className="text-[10px] text-zinc-500 line-clamp-1">{lut.description}</span>
                      </div>
                      {settings.lutId === lut.id && (
                        <Check className="w-4 h-4 text-violet-400 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>

                {/* IMPORT CUSTOM LUT */}
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">Import Custom LUT</span>
                  
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Lut Name (e.g. Fuji Velvia)"
                      value={customLutName}
                      onChange={(e) => setCustomLutName(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-500 outline-none font-mono"
                    />
                    
                    <div className="flex gap-2">
                      <select
                        value={customLutFilter}
                        onChange={(e) => setCustomLutFilter(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300 font-mono flex-1 outline-none"
                      >
                        <option value="contrast(1.3) saturate(1.4) brightness(1.05)">Super Vivid Slide Film</option>
                        <option value="contrast(0.95) saturate(1.1) sepia(0.2) hue-rotate(5deg)">Warm Retro Film</option>
                        <option value="contrast(1.1) grayscale(1) sepia(0.05) brightness(0.9)">Moody Noir Film</option>
                        <option value="contrast(1.4) saturate(1.6) brightness(1.1) saturate(1.4)">Vibrant HDR Landscape</option>
                      </select>
                      
                      <button
                        onClick={handleAddCustomLut}
                        disabled={!customLutName.trim()}
                        className="bg-violet-500 text-black px-3 py-1.5 rounded text-xs font-bold hover:bg-violet-400 active:scale-95 transition flex items-center gap-1 shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <Plus className="w-3.5 h-3.5" /> Save LUT
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: OTG / TYPE-C HARD DRIVE DIRECT WRITER */}
            {activeControlTab === "storage" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="font-display font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-amber-500" />
                    External Storage Connection (OTG)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1">Directly pipe uncompressed raw/jpeg outputs directly to attached USB-C SSDs.</p>
                </div>

                {/* OTG ENABLE SWITCH */}
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-100">OTG Direct Write Mode</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5">Bypasses local memory completely</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={otgEnabled}
                        onChange={(e) => {
                          if (e.target.checked) {
                            requestOtgAccess();
                          } else {
                            setOtgEnabled(false);
                            setOtgDirectoryHandle(null);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-black"></div>
                    </label>
                  </div>

                  {otgEnabled && (
                    <div className="border-t border-zinc-900 pt-3 space-y-2 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">MOUNTED VOLUME:</span>
                        <span className="text-amber-400 font-bold uppercase">{otgTargetName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">I/O PERFORMANCE:</span>
                        <span className="text-emerald-400 font-bold">{otgCapacity.speed} MB/s (Optimal)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">TOTAL STORAGE CAPACITY:</span>
                        <span className="text-zinc-300">{otgCapacity.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">AVAILABLE FREE SPACE:</span>
                        <span className="text-zinc-300 font-bold">{otgCapacity.remaining}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* OTG SYSTEM INSTRUCTIONS HELP */}
                <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-800/60 text-[11px] text-zinc-400 space-y-1.5 leading-relaxed">
                  <div className="flex items-center gap-1 text-zinc-300 font-semibold font-display">
                    <Info className="w-3.5 h-3.5 text-zinc-400" />
                    How to connect physical SSD:
                  </div>
                  <p>
                    1. Connect your high-speed SSD (e.g., Samsung T7) using a compliant USB-C USB3.2 Gen2 cable.
                  </p>
                  <p>
                    2. Toggle <strong>OTG Direct Write Mode</strong> above, and select your drive folder.
                  </p>
                  <p>
                    3. Click capture, and files will save directly inside your target folder with zero host delay!
                  </p>
                </div>
              </div>
            )}

            {/* LOWER PARAMETER FEEDBACK BAR */}
            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-400 font-mono">
              <span className="text-[10px] tracking-widest text-zinc-500">CALIBRATED LOG</span>
              <span className="text-[11px] text-amber-500">System Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CAPTURED REFERENCE PHOTO GALLERY TRAY */}
      <section className="bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 border border-zinc-800 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <h2 className="font-display font-bold text-sm text-zinc-100">Live Captured Reference Roll ({gallery.length})</h2>
          </div>
          
          <div className="flex gap-2">
            {gallery.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Clear live captured reference photos memory roll?")) {
                    setGallery([]);
                    setActivePhoto(null);
                  }
                }}
                className="text-xs text-red-400 hover:text-red-300 transition-all font-mono flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Roll
              </button>
            )}
          </div>
        </div>

        {gallery.length === 0 ? (
          <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-500 text-xs">
            No capture reference shots recorded in this session. Point your camera, adjust your manual parameters, overlay AI composition lines and click Shutter button above!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {gallery.map((photo) => {
              const isActive = activePhoto?.id === photo.id;
              return (
                <div
                  key={photo.id}
                  onClick={() => setActivePhoto(photo)}
                  className={`cursor-pointer group relative aspect-video rounded-lg overflow-hidden border transition-all ${
                    isActive ? "border-amber-400 scale-[0.98] ring-2 ring-amber-500/20" : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <img src={photo.dataUrl} alt="Captured reference shot" className="w-full h-full object-cover" />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-1.5 justify-between">
                    <span className="text-[8px] text-zinc-300 font-mono">{photo.timestamp}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSinglePhoto(photo);
                      }}
                      className="p-1 rounded bg-amber-500 text-black hover:bg-white transition"
                      title="Download image + RAW parameter sidecar metadata"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>

                  {photo.metadata.format === "RAW_SIM" && (
                    <div className="absolute top-1 left-1 bg-amber-500 text-black font-mono font-bold text-[7px] px-1 rounded">
                      RAW
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. ACTIVE CAPTURED SHOT ANALYSIS PANEL (LIGHTBOX DETAILED VIEW) */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-3xl max-w-4xl w-full border border-zinc-800 overflow-hidden flex flex-col md:flex-row shadow-2xl">
            
            {/* PHOTO VIEW */}
            <div className="flex-1 bg-black relative flex items-center justify-center aspect-video md:aspect-auto md:h-[500px]">
              <img src={activePhoto.dataUrl} alt="Analyzed capture" className="w-full h-full object-contain" />
              
              <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur px-3 py-1.5 rounded-xl border border-zinc-800 text-[11px] font-mono">
                <span className="text-zinc-500">ID:</span> <span className="text-zinc-200">{activePhoto.id}</span>
              </div>
            </div>

            {/* METADATA EXIF PROFILE PANEL */}
            <div className="w-full md:w-80 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900/40">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display font-bold text-md text-zinc-100">EXIF parameters</h3>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">DNG REFERENCE PROFILE</p>
                  </div>
                  <button
                    onClick={() => setActivePhoto(null)}
                    className="text-zinc-500 hover:text-zinc-200 text-xs font-mono border border-zinc-800 px-2 py-1 rounded"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">Focal Profile</span>
                    <span className="text-zinc-200 font-bold">{activePhoto.metadata.lensName}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">Aperture Size</span>
                    <span className="text-zinc-200 font-bold">{activePhoto.metadata.aperture}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">ISO Speed</span>
                    <span className="text-zinc-200 font-bold">ISO {activePhoto.metadata.iso}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">Exposure Speed</span>
                    <span className="text-zinc-200 font-bold">{activePhoto.metadata.shutter}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">White Temp</span>
                    <span className="text-zinc-200 font-bold">{activePhoto.metadata.kelvin} K</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">Cinematic LUT</span>
                    <span className="text-violet-400 font-bold">{activePhoto.metadata.lutName}</span>
                  </div>
                  <div className="flex justify-between border-b border-zinc-800/60 pb-1.5">
                    <span className="text-zinc-500">Output format</span>
                    <span className="text-amber-400 font-bold">{activePhoto.metadata.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">File Payload</span>
                    <span className="text-zinc-300">{activePhoto.metadata.fileSize}</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/60 text-[10px] text-zinc-400 font-mono leading-relaxed">
                  <span className="text-zinc-200 font-bold block mb-1">RAW DNG Sidecar Metadata:</span>
                  This file is accompanied by metadata payload which preserves exposure information for flawless edit profiles in desktop applications like Lightroom or Capture One.
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex gap-2">
                <button
                  onClick={() => downloadSinglePhoto(activePhoto)}
                  className="flex-1 bg-amber-500 text-black py-2 rounded-xl text-xs font-bold hover:bg-amber-400 transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Download className="w-4 h-4" /> Download Files
                </button>
                <button
                  onClick={() => {
                    setGallery((prev) => prev.filter(p => p.id !== activePhoto.id));
                    setActivePhoto(null);
                  }}
                  className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl border border-red-500/30 transition"
                  title="Delete from gallery tray"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. OTG USB DRIVE DIRECT DRIVE WRITING DIRECTORY PICKER SETUP SCREEN */}
      {showOtgSetup && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-900 rounded-3xl max-w-md w-full border border-zinc-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-amber-500" />
              <h3 className="font-display font-bold text-lg text-zinc-100">OTG Drive Connect Config</h3>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed">
              Connect external SSDs using type-c connector cables. Pro Shot Camera utilizes secure Sandboxed FileSystem access to write RAW pictures straight onto designated external directories.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-mono text-zinc-500">CUSTOM STORAGE VOLUME ALIAS:</label>
              <input
                type="text"
                placeholder="e.g. SAMSUNG_T7_PRO"
                value={otgTargetName}
                onChange={(e) => setOtgTargetName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500 outline-none font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                onClick={() => setShowOtgSetup(false)}
                className="py-2 rounded-xl text-xs font-semibold border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/40 transition"
              >
                Cancel
              </button>
              <button
                onClick={requestOtgAccess}
                className="py-2 bg-amber-500 text-black rounded-xl text-xs font-bold hover:bg-amber-400 transition flex items-center justify-center gap-1.5 shadow"
              >
                <FolderOpen className="w-4 h-4" /> Mount Volume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER METADATA */}
      <footer className="text-center py-6 text-[10px] font-mono text-zinc-600 border-t border-zinc-900 mt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>© 2026 PRO SHOT LABS — ALL RIGHTS RESERVED</span>
        <span>ENVIRONMENT: SANDBOXED BROWSER PREVIEW ACTIVE</span>
      </footer>

    </div>
  );
}
