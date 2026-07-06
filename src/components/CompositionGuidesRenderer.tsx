import React, { useState, useEffect, useRef } from "react";
import { CompositionGuideLine } from "../types";

interface GuidesRendererProps {
  guideType: string;
  customAiGuides?: CompositionGuideLine[];
  guideColor?: string; // Hex color or SVG stroke color
}

// Draggable point schema
interface InteractivePoint {
  id: string;
  x: number; // 0 to 100
  y: number; // 0 to 100
  label?: string;
}

export const CompositionGuidesRenderer: React.FC<GuidesRendererProps> = ({
  guideType,
  customAiGuides = [],
  guideColor = "#f59e0b" // Amber-500
}) => {
  // If no guide is selected and no custom AI guides exist, render nothing
  if (guideType === "none" && customAiGuides.length === 0) return null;

  // --- VIEWPORT DIMENSIONS OBSERVATION ---
  const [dims, setDims] = useState({ width: 640, height: 360 });
  const containerRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width && height) {
          setDims({ width, height });
        }
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Helper converters from normalized (0-100) scale to pixel scale
  const scaleX = (x: number) => (x / 100) * dims.width;
  const scaleY = (y: number) => (y / 100) * dims.height;

  // --- INTERACTIVE DRAGGING STATE FOR DYNAMIC COMPOSITIONS ---
  const [points, setPoints] = useState<InteractivePoint[]>([]);
  const [symmetryOrientation, setSymmetryOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [oddsCount, setOddsCount] = useState<number>(3); // For rule of odds (3, 5, or 7)
  const [simulatedTilt, setSimulatedTilt] = useState<number>(12); // For Dutch angle simulation
  const [levelPitch, setLevelPitch] = useState<number>(0); // For Bird's Eye bubble level
  const [levelRoll, setLevelRoll] = useState<number>(0);
  const [triangleDiagonal, setTriangleDiagonal] = useState<"left-to-right" | "right-to-left">("left-to-right");

  const activePointIdRef = useRef<string | null>(null);

  // Initialize interactive points based on chosen guide type
  useEffect(() => {
    activePointIdRef.current = null;
    
    switch (guideType) {
      case "leading_lines":
        setPoints([
          { id: "target", x: 50, y: 50, label: "Vanishing Point" }
        ]);
        break;
      case "s_curves":
        setPoints([
          { id: "p0", x: 15, y: 85, label: "Start" },
          { id: "p1", x: 35, y: 25, label: "Control A" },
          { id: "p2", x: 65, y: 75, label: "Control B" },
          { id: "p3", x: 85, y: 15, label: "End" }
        ]);
        break;
      case "c_curves":
        setPoints([
          { id: "p0", x: 20, y: 80, label: "Start" },
          { id: "p1", x: 50, y: 20, label: "Curvature" },
          { id: "p2", x: 80, y: 80, label: "End" }
        ]);
        break;
      case "diagonals":
        setPoints([
          { id: "p0", x: 10, y: 90, label: "Slope Start" },
          { id: "p1", x: 90, y: 10, label: "Slope End" }
        ]);
        break;
      case "parallels":
        setPoints([
          { id: "p0", x: 30, y: 80, label: "Origin" },
          { id: "p1", x: 70, y: 20, label: "Spacing/Angle" }
        ]);
        break;
      case "converging":
        setPoints([
          { id: "p0", x: 50, y: 40, label: "Convergence Node" }
        ]);
        break;
      case "triangle_comp":
        setPoints([
          { id: "p0", x: 50, y: 20, label: "Vertex A" },
          { id: "p1", x: 20, y: 80, label: "Vertex B" },
          { id: "p2", x: 80, y: 80, label: "Vertex C" }
        ]);
        break;
      case "circular_comp":
        setPoints([
          { id: "center", x: 50, y: 50, label: "Center" },
          { id: "radius", x: 75, y: 50, label: "Radius Handle" }
        ]);
        break;
      case "symmetry_reflections":
        setPoints([
          { id: "split", x: 50, y: 50, label: "Symmetry Plane" }
        ]);
        break;
      case "natural_framing":
        setPoints([
          { id: "tl", x: 20, y: 20, label: "Frame Top-Left" },
          { id: "br", x: 80, y: 80, label: "Frame Bottom-Right" }
        ]);
        break;
      case "sandwich_comp":
        setPoints([
          { id: "left", x: 30, y: 50, label: "Left Pillar" },
          { id: "right", x: 70, y: 50, label: "Right Pillar" }
        ]);
        break;
      case "layering":
        setPoints([
          { id: "foreground", x: 50, y: 80, label: "Foreground Tier" },
          { id: "midground", x: 50, y: 50, label: "Midground Tier" },
          { id: "background", x: 50, y: 25, label: "Background Tier" }
        ]);
        break;
      case "figure_to_ground":
        setPoints([
          { id: "spot", x: 50, y: 50, label: "Silhouette Focus" },
          { id: "size", x: 75, y: 50, label: "Spotlight Width" }
        ]);
        break;
      case "negative_space":
        setPoints([
          { id: "divider", x: 35, y: 50, label: "Space Boundary" }
        ]);
        break;
      case "fill_frame":
        setPoints([
          { id: "tl", x: 25, y: 25, label: "Crop Top-Left" },
          { id: "br", x: 75, y: 75, label: "Crop Bottom-Right" }
        ]);
        break;
      case "forced_perspective":
        setPoints([
          { id: "anchorA", x: 25, y: 65, label: "Subject A (Close)" },
          { id: "anchorB", x: 75, y: 35, label: "Subject B (Far)" }
        ]);
        break;
      case "center_eye":
        setPoints([
          { id: "eye", x: 50, y: 33, label: "Dominant Eye" }
        ]);
        break;
      case "pattern_breaking":
        setPoints([
          { id: "anomaly", x: 50, y: 50, label: "Anomalous Anchor" }
        ]);
        break;
      case "juxtaposition":
        setPoints([
          { id: "point1", x: 30, y: 50, label: "Contrast Theme A" },
          { id: "point2", x: 70, y: 50, label: "Contrast Theme B" }
        ]);
        break;
      case "rule_of_odds":
        updateOddsPoints(oddsCount);
        break;
      default:
        setPoints([]);
    }
  }, [guideType]);

  // Update points list for Rule of Odds dynamically when count changes
  const updateOddsPoints = (count: number) => {
    const list: InteractivePoint[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      const radius = 22;
      const x = Math.round(50 + radius * Math.cos(angle));
      const y = Math.round(50 + radius * Math.sin(angle));
      list.push({ id: `odd_${i}`, x, y, label: `Subject #${i + 1}` });
    }
    setPoints(list);
  };

  useEffect(() => {
    if (guideType === "rule_of_odds") {
      updateOddsPoints(oddsCount);
    }
  }, [oddsCount]);

  // Simulated stabilization / roll pitch noise for Bird's Eye view level
  useEffect(() => {
    if (guideType !== "birds_eye") return;
    const interval = setInterval(() => {
      setLevelPitch((prev) => prev + (Math.random() - 0.5) * 0.4);
      setLevelRoll((prev) => prev + (Math.random() - 0.5) * 0.4);
    }, 120);
    return () => clearInterval(interval);
  }, [guideType]);

  // --- DRAG AND DROP ENGINE FOR SVG ANCHORS ---
  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>, pointId: string) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as any).setPointerCapture(e.pointerId);
    activePointIdRef.current = pointId;
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activePointIdRef.current || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Calculate position scaled to 0-100 coordinate grid
    const clientX = e.clientX;
    const clientY = e.clientY;
    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;

    // Boundary constraints
    const x = Math.max(0, Math.min(100, Math.round(rawX * 10) / 10));
    const y = Math.max(0, Math.min(100, Math.round(rawY * 10) / 10));

    setPoints((prev) =>
      prev.map((p) => (p.id === activePointIdRef.current ? { ...p, x, y } : p))
    );
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activePointIdRef.current) {
      activePointIdRef.current = null;
    }
  };

  // Helper getters for key interactive coordinate tags
  const getPoint = (id: string) => {
    const pt = points.find((p) => p.id === id);
    return pt ? { x: scaleX(pt.x), y: scaleY(pt.y) } : { x: dims.width / 2, y: dims.height / 2 };
  };

  // Mathematically perfect logarithmic Golden Spiral that covers the ENTIRE view frame
  const generateLogarithmicSpiralPath = (quadrant: "tl" | "tr" | "bl" | "br") => {
    const W = dims.width;
    const H = dims.height;

    // Map focal centers of the 4 spirals to exact Golden Intersections of the frame
    let cx = 0.618 * W;
    let cy = 0.618 * H;
    let startAngle = 0;

    if (quadrant === "tl") {
      cx = 0.382 * W;
      cy = 0.382 * H;
      startAngle = Math.PI; // Rotate by 180 deg
    } else if (quadrant === "tr") {
      cx = 0.618 * W;
      cy = 0.382 * H;
      startAngle = -Math.PI / 2; // Rotate by -90 deg
    } else if (quadrant === "bl") {
      cx = 0.382 * W;
      cy = 0.618 * H;
      startAngle = Math.PI / 2; // Rotate by 90 deg
    } else if (quadrant === "br") {
      cx = 0.618 * W;
      cy = 0.618 * H;
      startAngle = 0;
    }

    const b = 0.3063489; // Fibonacci growth rate factor
    const steps = 180;
    
    // Sweep theta outwards from deep inside vortex (negative theta) to outer sweep (positive theta)
    const thetaMin = -3 * Math.PI;
    const thetaMax = 2.4 * Math.PI;

    // First generate raw points centered at (0,0)
    const rawPoints: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const theta = thetaMin + (i / steps) * (thetaMax - thetaMin);
      const r = Math.exp(b * theta);
      const angle = theta + startAngle;
      rawPoints.push({
        x: r * Math.cos(angle),
        y: r * Math.sin(angle)
      });
    }

    // Measure raw coordinate bounds to scale
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    rawPoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const rawW = maxX - minX;
    const rawH = maxY - minY;

    // Stretch raw spiral bounding box to perfectly cover the exact screen width and height (W, H)
    const scaledPoints = rawPoints.map((p) => {
      const x = ((p.x - minX) / rawW) * W;
      const y = ((p.y - minY) / rawH) * H;
      return { x, y };
    });

    return scaledPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  };

  const renderSpiralPathForQuadrant = (quadrant: "tl" | "tr" | "bl" | "br") => {
    const pathString = generateLogarithmicSpiralPath(quadrant);
    
    // Focal coordinates (golden section intersections)
    const focalX = quadrant === "tl" || quadrant === "bl" ? dims.width * 0.382 : dims.width * 0.618;
    const focalY = quadrant === "tl" || quadrant === "tr" ? dims.height * 0.382 : dims.height * 0.618;

    return (
      <g key={`spiral-${quadrant}`}>
        {/* Underlay structural golden partition grids for absolute correctness */}
        <g stroke={guideColor} strokeWidth="0.25" strokeDasharray="3,3" opacity="0.4">
          <line x1={dims.width * 0.382} y1="0" x2={dims.width * 0.382} y2={dims.height} />
          <line x1={dims.width * 0.618} y1="0" x2={dims.width * 0.618} y2={dims.height} />
          <line x1="0" y1={dims.height * 0.382} x2={dims.width} y2={dims.height * 0.382} />
          <line x1="0" y1={dims.height * 0.618} x2={dims.width} y2={dims.height * 0.618} />
          
          {/* Inner subdividing rectangular block boundaries near vortex */}
          {quadrant === "tl" && <rect x="0" y="0" width={dims.width * 0.382} height={dims.height * 0.382} fill="none" />}
          {quadrant === "tr" && <rect x={dims.width * 0.382} y="0" width={dims.width * 0.618} height={dims.height * 0.382} fill="none" />}
          {quadrant === "bl" && <rect x="0" y={dims.height * 0.382} width={dims.width * 0.382} height={dims.height * 0.618} fill="none" />}
          {quadrant === "br" && <rect x={dims.width * 0.382} y={dims.height * 0.382} width={dims.width * 0.618} height={dims.height * 0.618} fill="none" />}
        </g>

        {/* Master Logarithmic Golden Spiral Path */}
        <path
          d={pathString}
          fill="none"
          stroke={guideColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          className="animate-[dash_1.8s_ease-out_forwards]"
        />

        {/* Golden Ratio Vortex Target Eye */}
        <g className="animate-pulse">
          <circle cx={focalX} cy={focalY} r="4" fill="none" stroke={guideColor} strokeWidth="0.8" />
          <circle cx={focalX} cy={focalY} r="1.2" fill={guideColor} />
        </g>
      </g>
    );
  };

  return (
    <svg
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 w-full h-full pointer-events-auto select-none z-20"
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      preserveAspectRatio="none"
      id="composition-viewport-overlay-system"
    >
      {/* ========================================================= */}
      {/* 1. rule_thirds: Static 3x3 Grid                           */}
      {/* ========================================================= */}
      {guideType === "thirds" && (
        <g stroke={guideColor} strokeWidth="0.5" opacity="0.75" className="pointer-events-none">
          <line x1={dims.width / 3} y1="0" x2={dims.width / 3} y2={dims.height} />
          <line x1={(dims.width * 2) / 3} y1="0" x2={(dims.width * 2) / 3} y2={dims.height} />
          <line x1="0" y1={dims.height / 3} x2={dims.width} y2={dims.height / 3} />
          <line x1="0" y1={(dims.height * 2) / 3} x2={dims.width} y2={(dims.height * 2) / 3} />
          
          <circle cx={dims.width / 3} cy={dims.height / 3} r="2.5" fill={guideColor} stroke="black" strokeWidth="0.4" />
          <circle cx={(dims.width * 2) / 3} cy={dims.height / 3} r="2.5" fill={guideColor} stroke="black" strokeWidth="0.4" />
          <circle cx={dims.width / 3} cy={(dims.height * 2) / 3} r="2.5" fill={guideColor} stroke="black" strokeWidth="0.4" />
          <circle cx={(dims.width * 2) / 3} cy={(dims.height * 2) / 3} r="2.5" fill={guideColor} stroke="black" strokeWidth="0.4" />
        </g>
      )}

      {/* ========================================================= */}
      {/* 2. phi_grid: Static Golden Ratio Grid                    */}
      {/* ========================================================= */}
      {guideType === "phi_grid" && (
        <g stroke={guideColor} strokeWidth="0.5" opacity="0.75" className="pointer-events-none">
          <line x1={dims.width * 0.382} y1="0" x2={dims.width * 0.382} y2={dims.height} />
          <line x1={dims.width * 0.618} y1="0" x2={dims.width * 0.618} y2={dims.height} />
          <line x1="0" y1={dims.height * 0.382} x2={dims.width} y2={dims.height * 0.382} />
          <line x1="0" y1={dims.height * 0.618} x2={dims.width} y2={dims.height * 0.618} />
          
          <circle cx={dims.width * 0.382} cy={dims.height * 0.382} r="2.5" fill={guideColor} stroke="black" strokeWidth="0.4" />
          <circle cx={dims.width * 0.618} cy={dims.height * 0.382} r="2.5" fill={guideColor} stroke="black" strokeWidth="0.4" />
          <circle cx={dims.width * 0.382} cy={dims.height * 0.618} r="2.5" fill={guideColor} stroke="black" strokeWidth="0.4" />
          <circle cx={dims.width * 0.618} cy={dims.height * 0.618} r="2.5" fill={guideColor} stroke="black" strokeWidth="0.4" />
        </g>
      )}

      {/* ========================================================= */}
      {/* 3. golden_spiral_tl / tr / bl / br                        */}
      {/* ========================================================= */}
      {guideType === "golden_spiral_tl" && renderSpiralPathForQuadrant("tl")}
      {guideType === "golden_spiral_tr" && renderSpiralPathForQuadrant("tr")}
      {guideType === "golden_spiral_bl" && renderSpiralPathForQuadrant("bl")}
      {guideType === "golden_spiral_br" && renderSpiralPathForQuadrant("br")}

      {/* ========================================================= */}
      {/* 4. golden_triangles: Mathematically Perfect Perpendiculars*/}
      {/* ========================================================= */}
      {guideType === "golden_triangles" && (
        <g>
          {(() => {
            const W = dims.width;
            const H = dims.height;

            if (triangleDiagonal === "left-to-right") {
              // Diagonal: (0, 0) -> (W, H)
              // Perpendicular from top-right (W, 0)
              const px1 = (W * W * W) / (W * W + H * H);
              const py1 = (W * W * H) / (W * W + H * H);
              // Perpendicular from bottom-left (0, H)
              const px2 = (W * H * H) / (W * W + H * H);
              const py2 = (H * H * H) / (W * W + H * H);

              return (
                <g stroke={guideColor} opacity="0.85">
                  <line x1="0" y1="0" x2={W} y2={H} strokeWidth="1.2" />
                  <line x1={W} y1="0" x2={px1} y2={py1} strokeWidth="0.8" strokeDasharray="2,2" />
                  <line x1="0" y1={H} x2={px2} y2={py2} strokeWidth="0.8" strokeDasharray="2,2" />
                  <circle cx={px1} cy={py1} r="2" fill={guideColor} />
                  <circle cx={px2} cy={py2} r="2" fill={guideColor} />
                </g>
              );
            } else {
              // Diagonal: (0, H) -> (W, 0)
              // Perpendicular from top-left (0, 0)
              const px1 = (W * H * H) / (W * W + H * H);
              const py1 = (W * W * H) / (W * W + H * H);
              // Perpendicular from bottom-right (W, H)
              const px2 = (W * W * W) / (W * W + H * H);
              const py2 = (H * H * H) / (W * W + H * H);

              return (
                <g stroke={guideColor} opacity="0.85">
                  <line x1="0" y1={H} x2={W} y2="0" strokeWidth="1.2" />
                  <line x1="0" y1="0" x2={px1} y2={py1} strokeWidth="0.8" strokeDasharray="2,2" />
                  <line x1={W} y1={H} x2={px2} y2={py2} strokeWidth="0.8" strokeDasharray="2,2" />
                  <circle cx={px1} cy={py1} r="2" fill={guideColor} />
                  <circle cx={px2} cy={py2} r="2" fill={guideColor} />
                </g>
              );
            }
          })()}

          {/* Interactive Diagonal Switcher HUD */}
          <foreignObject x={dims.width - 120} y="6" width="114" height="24" className="pointer-events-none">
            <div className="flex justify-end gap-1.5 text-[8px] font-mono">
              <button
                type="button"
                onClick={() => setTriangleDiagonal(t => t === "left-to-right" ? "right-to-left" : "left-to-right")}
                className="px-2 py-1 rounded bg-black/80 hover:bg-zinc-800 text-amber-400 font-bold border border-zinc-800 pointer-events-auto shadow-md transition-all active:scale-95"
              >
                🔄 Flip Diagonal
              </button>
            </div>
          </foreignObject>
        </g>
      )}

      {/* ========================================================= */}
      {/* 5. quadrants: 4x4 Grid Overlay (Rule of Fourths)          */}
      {/* ========================================================= */}
      {guideType === "quadrants" && (
        <g stroke={guideColor} strokeWidth="0.4" opacity="0.65" className="pointer-events-none" strokeDasharray="2,2">
          <line x1={dims.width * 0.25} y1="0" x2={dims.width * 0.25} y2={dims.height} />
          <line x1={dims.width * 0.5} y1="0" x2={dims.width * 0.5} y2={dims.height} />
          <line x1={dims.width * 0.75} y1="0" x2={dims.width * 0.75} y2={dims.height} />
          <line x1="0" y1={dims.height * 0.25} x2={dims.width} y2={dims.height * 0.25} />
          <line x1="0" y1={dims.height * 0.5} x2={dims.width} y2={dims.height * 0.5} />
          <line x1="0" y1={dims.height * 0.75} x2={dims.width} y2={dims.height * 0.75} />
        </g>
      )}

      {/* ========================================================= */}
      {/* 6. centered_split: Centered horizontal/vertical cut      */}
      {/* ========================================================= */}
      {guideType === "centered_split" && (
        <g stroke={guideColor} strokeWidth="0.5" opacity="0.8" className="pointer-events-none">
          <line x1={dims.width / 2} y1="0" x2={dims.width / 2} y2={dims.height} />
          <line x1="0" y1={dims.height / 2} x2={dims.width} y2={dims.height / 2} />
          <circle cx={dims.width / 2} cy={dims.height / 2} r="10" fill="none" stroke={guideColor} strokeWidth="0.4" />
          <line x1={dims.width / 2 - 6} y1={dims.height / 2} x2={dims.width / 2 + 6} y2={dims.height / 2} strokeWidth="1" />
          <line x1={dims.width / 2} y1={dims.height / 2 - 6} x2={dims.width / 2} y2={dims.height / 2 + 6} strokeWidth="1" />
        </g>
      )}

      {/* ========================================================= */}
      {/* 7. leading_lines: Dynamic single vanishing target point    */}
      {/* ========================================================= */}
      {guideType === "leading_lines" && (
        <g stroke={guideColor} strokeWidth="0.8" opacity="0.85">
          {/* Multiple converging perspective guideways leading to adjustable center node */}
          {(() => {
            const target = getPoint("target");
            return (
              <>
                <line x1="0" y1="0" x2={target.x} y2={target.y} />
                <line x1={dims.width} y1="0" x2={target.x} y2={target.y} />
                <line x1="0" y1={dims.height} x2={target.x} y2={target.y} />
                <line x1={dims.width} y1={dims.height} x2={target.x} y2={target.y} />
                <line x1={dims.width / 2} y1={dims.height} x2={target.x} y2={target.y} strokeDasharray="2,2" />
                <line x1="0" y1={dims.height / 2} x2={target.x} y2={target.y} strokeDasharray="2,2" />
                <line x1={dims.width} y1={dims.height / 2} x2={target.x} y2={target.y} strokeDasharray="2,2" />
                
                {/* Visual target halo surrounding focal vanishing point */}
                <circle cx={target.x} cy={target.y} r="16" fill="none" stroke={guideColor} strokeWidth="0.3" strokeDasharray="2,2" />
                <circle cx={target.x} cy={target.y} r="24" fill="none" stroke={guideColor} strokeWidth="0.2" />
              </>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 8. s_curves: DYNAMIC Cubic Bezier flow matching          */}
      {/* ========================================================= */}
      {guideType === "s_curves" && (
        <g>
          <path
            d={`M ${getPoint("p0").x} ${getPoint("p0").y} C ${getPoint("p1").x} ${getPoint("p1").y}, ${getPoint("p2").x} ${getPoint("p2").y}, ${getPoint("p3").x} ${getPoint("p3").y}`}
            fill="none"
            stroke={guideColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Faint reference scaffolding lines */}
          <line x1={getPoint("p0").x} y1={getPoint("p0").y} x2={getPoint("p1").x} y2={getPoint("p1").y} stroke={guideColor} strokeWidth="0.2" strokeDasharray="2,2" opacity="0.4" />
          <line x1={getPoint("p3").x} y1={getPoint("p3").y} x2={getPoint("p2").x} y2={getPoint("p2").y} stroke={guideColor} strokeWidth="0.2" strokeDasharray="2,2" opacity="0.4" />
        </g>
      )}

      {/* ========================================================= */}
      {/* 9. c_curves: DYNAMIC Quadratic Bezier arc                 */}
      {/* ========================================================= */}
      {guideType === "c_curves" && (
        <g>
          <path
            d={`M ${getPoint("p0").x} ${getPoint("p0").y} Q ${getPoint("p1").x} ${getPoint("p1").y} ${getPoint("p2").x} ${getPoint("p2").y}`}
            fill="none"
            stroke={guideColor}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <line x1={getPoint("p0").x} y1={getPoint("p0").y} x2={getPoint("p1").x} y2={getPoint("p1").y} stroke={guideColor} strokeWidth="0.2" strokeDasharray="2,2" opacity="0.4" />
          <line x1={getPoint("p2").x} y1={getPoint("p2").y} x2={getPoint("p1").x} y2={getPoint("p1").y} stroke={guideColor} strokeWidth="0.2" strokeDasharray="2,2" opacity="0.4" />
        </g>
      )}

      {/* ========================================================= */}
      {/* 10. diagonals: DYNAMIC 2-point slope tracker             */}
      {/* ========================================================= */}
      {guideType === "diagonals" && (
        <g>
          <line
            x1={getPoint("p0").x}
            y1={getPoint("p0").y}
            x2={getPoint("p1").x}
            y2={getPoint("p1").y}
            stroke={guideColor}
            strokeWidth="1.5"
            strokeDasharray="2,1.5"
          />
        </g>
      )}

      {/* ========================================================= */}
      {/* 11. parallels: DYNAMIC parallel lines matching slope      */}
      {/* ========================================================= */}
      {guideType === "parallels" && (
        <g>
          {(() => {
            const p0 = getPoint("p0");
            const p1 = getPoint("p1");
            const dx = p1.x - p0.x;
            const dy = p1.y - p0.y;
            return (
              <g stroke={guideColor} strokeWidth="0.8" opacity="0.75">
                <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} />
                <line x1={p0.x - dims.width * 0.15} y1={p0.y - dims.height * 0.1} x2={p1.x - dims.width * 0.15} y2={p1.y - dims.height * 0.1} />
                <line x1={p0.x + dims.width * 0.15} y1={p0.y + dims.height * 0.1} x2={p1.x + dims.width * 0.15} y2={p1.y + dims.height * 0.1} />
              </g>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 12. converging: DYNAMIC convergence paths                 */}
      {/* ========================================================= */}
      {guideType === "converging" && (
        <g stroke={guideColor} strokeWidth="0.5" opacity="0.7">
          {(() => {
            const node = getPoint("p0");
            return (
              <>
                <line x1="0" y1={dims.height * 0.2} x2={node.x} y2={node.y} />
                <line x1="0" y1={dims.height * 0.5} x2={node.x} y2={node.y} />
                <line x1="0" y1={dims.height * 0.8} x2={node.x} y2={node.y} />
                <line x1={dims.width} y1={dims.height * 0.2} x2={node.x} y2={node.y} />
                <line x1={dims.width} y1={dims.height * 0.5} x2={node.x} y2={node.y} />
                <line x1={dims.width} y1={dims.height * 0.8} x2={node.x} y2={node.y} />
              </>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 13. triangle_comp: DYNAMIC 3-point visual pyramid         */}
      {/* ========================================================= */}
      {guideType === "triangle_comp" && (
        <g fill="none">
          <polygon
            points={`${getPoint("p0").x},${getPoint("p0").y} ${getPoint("p1").x},${getPoint("p1").y} ${getPoint("p2").x},${getPoint("p2").y}`}
            stroke={guideColor}
            strokeWidth="1.2"
            fill="none"
          />
          <line
            x1={getPoint("p0").x}
            y1={getPoint("p0").y}
            x2={(getPoint("p1").x + getPoint("p2").x) / 2}
            y2={(getPoint("p1").y + getPoint("p2").y) / 2}
            stroke={guideColor}
            strokeWidth="0.3"
            strokeDasharray="1,1"
          />
        </g>
      )}

      {/* ========================================================= */}
      {/* 14. circular_comp: DYNAMIC ellipse bounds framing         */}
      {/* ========================================================= */}
      {guideType === "circular_comp" && (
        <g fill="none">
          {(() => {
            const center = getPoint("center");
            const radHandle = getPoint("radius");
            const rx = Math.max(10, Math.abs(radHandle.x - center.x));
            const ry = Math.max(10, Math.abs(radHandle.y - center.y) || rx * 0.75);
            return (
              <>
                <ellipse cx={center.x} cy={center.y} rx={rx} ry={ry} stroke={guideColor} strokeWidth="1.2" />
                <circle cx={center.x} cy={center.y} r="2" fill={guideColor} />
                <line x1={center.x} y1={center.y} x2={radHandle.x} y2={radHandle.y} stroke={guideColor} strokeWidth="0.3" strokeDasharray="2,2" />
              </>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 15. symmetry_reflections: Mirror plane marker            */}
      {/* ========================================================= */}
      {guideType === "symmetry_reflections" && (
        <g>
          {symmetryOrientation === "vertical" ? (
            <line x1={getPoint("split").x} y1="0" x2={getPoint("split").x} y2={dims.height} stroke={guideColor} strokeWidth="1.5" strokeDasharray="4,2" />
          ) : (
            <line x1="0" y1={getPoint("split").y} x2={dims.width} y2={getPoint("split").y} stroke={guideColor} strokeWidth="1.5" strokeDasharray="4,2" />
          )}

          {/* Double tap toggle helper label */}
          <foreignObject x="8" y="8" width="180" height="24" className="pointer-events-none">
            <div className="flex justify-start gap-1.5 text-[8px] font-mono">
              <button
                type="button"
                onClick={() => setSymmetryOrientation("vertical")}
                className={`px-2 py-1 rounded border border-zinc-800/40 pointer-events-auto ${symmetryOrientation === "vertical" ? "bg-amber-500 text-black font-bold" : "bg-zinc-950 text-zinc-400"}`}
              >
                V-Symmetry
              </button>
              <button
                type="button"
                onClick={() => setSymmetryOrientation("horizontal")}
                className={`px-2 py-1 rounded border border-zinc-800/40 pointer-events-auto ${symmetryOrientation === "horizontal" ? "bg-amber-500 text-black font-bold" : "bg-zinc-950 text-zinc-400"}`}
              >
                H-Symmetry
              </button>
            </div>
          </foreignObject>
        </g>
      )}

      {/* ========================================================= */}
      {/* 16. natural_framing: Draggable rectangular bounds         */}
      {/* ========================================================= */}
      {guideType === "natural_framing" && (
        <g fill="none">
          {(() => {
            const tl = getPoint("tl");
            const br = getPoint("br");
            const w = Math.max(10, br.x - tl.x);
            const h = Math.max(10, br.y - tl.y);
            return (
              <>
                <rect x={tl.x} y={tl.y} width={w} height={h} stroke={guideColor} strokeWidth="1.2" rx="1" />
                {/* Visual crop markings at corners */}
                <line x1={tl.x} y1={tl.y} x2={tl.x + 8} y2={tl.y} stroke={guideColor} strokeWidth="2.2" />
                <line x1={tl.x} y1={tl.y} x2={tl.x} y2={tl.y + 8} stroke={guideColor} strokeWidth="2.2" />
                <line x1={tl.x + w} y1={tl.y} x2={tl.x + w - 8} y2={tl.y} stroke={guideColor} strokeWidth="2.2" />
                <line x1={tl.x + w} y1={tl.y} x2={tl.x + w} y2={tl.y + 8} stroke={guideColor} strokeWidth="2.2" />
              </>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 17. sandwich_comp: Dual side columns                      */}
      {/* ========================================================= */}
      {guideType === "sandwich_comp" && (
        <g stroke={guideColor} strokeWidth="1.2" opacity="0.8">
          <line x1={getPoint("left").x} y1="0" x2={getPoint("left").x} y2={dims.height} />
          <line x1={getPoint("right").x} y1="0" x2={getPoint("right").x} y2={dims.height} />
          {/* Shading zones outside the pillars to focus center */}
          <rect x="0" y="0" width={getPoint("left").x} height={dims.height} fill="black" opacity="0.25" stroke="none" />
          <rect x={getPoint("right").x} y="0" width={dims.width - getPoint("right").x} height={dims.height} fill="black" opacity="0.25" stroke="none" />
        </g>
      )}

      {/* ========================================================= */}
      {/* 18. layering: Fore/Mid/Background elevations              */}
      {/* ========================================================= */}
      {guideType === "layering" && (
        <g stroke={guideColor} strokeWidth="0.6">
          <line x1="0" y1={getPoint("background").y} x2={dims.width} y2={getPoint("background").y} strokeDasharray="1,2" opacity="0.5" />
          <line x1="0" y1={getPoint("midground").y} x2={dims.width} y2={getPoint("midground").y} strokeDasharray="3,2" opacity="0.8" />
          <line x1="0" y1={getPoint("foreground").y} x2={dims.width} y2={getPoint("foreground").y} strokeWidth="1.2" />

          {/* Depth descriptors text overlays */}
          <text x="8" y={getPoint("background").y - 4} fill={guideColor} fontSize="8" fontFamily="monospace" opacity="0.7">BACKGROUND</text>
          <text x="8" y={getPoint("midground").y - 4} fill={guideColor} fontSize="8" fontFamily="monospace" opacity="0.9">MIDGROUND FOCUS</text>
          <text x="8" y={getPoint("foreground").y - 4} fill={guideColor} fontSize="9" fontFamily="monospace" fontWeight="bold">FOREGROUND DETAIL</text>
        </g>
      )}

      {/* ========================================================= */}
      {/* 19. figure_to_ground: Silhouette edge contrast spot       */}
      {/* ========================================================= */}
      {guideType === "figure_to_ground" && (
        <g fill="none">
          {(() => {
            const spot = getPoint("spot");
            const sizePt = getPoint("size");
            const r = Math.max(15, Math.abs(sizePt.x - spot.x));
            return (
              <>
                {/* Silhouette spotlight center */}
                <circle cx={spot.x} cy={spot.y} r={r} stroke={guideColor} strokeWidth="1" strokeDasharray="3,3" />
                <circle cx={spot.x} cy={spot.y} r="2.5" fill={guideColor} />
                <path
                  d={`M0,0 H${dims.width} V${dims.height} H0 Z M${spot.x},${spot.y} m-${r},0 a${r},${r} 0 1,0 ${r*2},0 a${r},${r} 0 1,0 -${r*2},0`}
                  fill="black"
                  opacity="0.32"
                  fillRule="evenodd"
                  stroke="none"
                />
              </>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 20. negative_space: Spatial boundary partition            */}
      {/* ========================================================= */}
      {guideType === "negative_space" && (
        <g>
          {(() => {
            const div = getPoint("divider");
            return (
              <>
                <line x1={div.x} y1="0" x2={div.x} y2={dims.height} stroke={guideColor} strokeWidth="1" strokeDasharray="3,1" />
                <rect x="0" y="0" width={div.x} height={dims.height} fill={guideColor} opacity="0.06" stroke="none" />
                <text x="8" y="18" fill={guideColor} fontSize="8" fontFamily="monospace" fontWeight="bold">NEGATIVE SPACE ZONE</text>
                <text x={div.x + 8} y="18" fill={guideColor} fontSize="8" fontFamily="monospace" fontWeight="bold" opacity="0.75">SUBJECT CONTAINER</text>
              </>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 21. fill_frame: Century center border boundaries         */}
      {/* ========================================================= */}
      {guideType === "fill_frame" && (
        <g stroke={guideColor} strokeWidth="0.8" fill="none">
          {(() => {
            const tl = getPoint("tl");
            const br = getPoint("br");
            const w = Math.max(20, br.x - tl.x);
            const h = Math.max(20, br.y - tl.y);
            return (
              <>
                <rect x={tl.x} y={tl.y} width={w} height={h} />
                <line x1={tl.x} y1={tl.y + h/2} x2={tl.x + 6} y2={tl.y + h/2} />
                <line x1={tl.x + w} y1={tl.y + h/2} x2={tl.x + w - 6} y2={tl.y + h/2} />
                <line x1={tl.x + w/2} y1={tl.y} x2={tl.x + w/2} y2={tl.y + 6} />
                <line x1={tl.x + w/2} y1={tl.y + h} x2={tl.x + w/2} y2={tl.y + h - 6} />
              </>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 22. forced_perspective: Focus nodes pairing connector    */}
      {/* ========================================================= */}
      {guideType === "forced_perspective" && (
        <g>
          {(() => {
            const a = getPoint("anchorA");
            const b = getPoint("anchorB");
            return (
              <>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={guideColor} strokeWidth="0.8" strokeDasharray="3,3" />
                
                {/* Target A details */}
                <circle cx={a.x} cy={a.y} r="6" fill="none" stroke={guideColor} strokeWidth="1" />
                <circle cx={a.x} cy={a.y} r="1.5" fill={guideColor} />
                <text x={a.x + 8} y={a.y + 3} fill={guideColor} fontSize="8" fontFamily="monospace" fontWeight="bold">CLOSE FOREGROUND</text>
                
                {/* Target B details */}
                <circle cx={b.x} cy={b.y} r="6" fill="none" stroke={guideColor} strokeWidth="1" />
                <circle cx={b.x} cy={b.y} r="1.5" fill={guideColor} />
                <text x={b.x + 8} y={b.y + 3} fill={guideColor} fontSize="8" fontFamily="monospace" fontWeight="bold">FAR BACKGROUND</text>
              </>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 23. birds_eye: Architectural layout leveler              */}
      {/* ========================================================= */}
      {guideType === "birds_eye" && (
        <g stroke={guideColor} strokeWidth="0.4" opacity="0.7" fill="none" className="pointer-events-none">
          <circle cx={dims.width / 2} cy={dims.height / 2} r="35" />
          <circle cx={dims.width / 2} cy={dims.height / 2} r="6" strokeDasharray="1,1" />
          
          {/* Level target bubble */}
          <circle
            cx={dims.width / 2 + levelRoll * 3}
            cy={dims.height / 2 + levelPitch * 3}
            r="12"
            stroke={guideColor}
            strokeWidth="1.5"
            className="animate-pulse"
          />
          {/* Alignment ticks */}
          <line x1={dims.width / 2 - 60} y1={dims.height / 2} x2={dims.width / 2 - 40} y2={dims.height / 2} />
          <line x1={dims.width / 2 + 40} y1={dims.height / 2} x2={dims.width / 2 + 60} y2={dims.height / 2} />
          <line x1={dims.width / 2} y1={dims.height / 2 - 60} x2={dims.width / 2} y2={dims.height / 2 - 40} />
          <line x1={dims.width / 2} y1={dims.height / 2 + 40} x2={dims.width / 2} y2={dims.height / 2 + 60} />
          
          <rect x={dims.width * 0.1} y={dims.height * 0.1} width={dims.width * 0.8} height={dims.height * 0.8} strokeDasharray="3,3" />
        </g>
      )}

      {/* ========================================================= */}
      {/* 24. worms_eye: Low-angle dramatic vertical converges      */}
      {/* ========================================================= */}
      {guideType === "worms_eye" && (
        <g stroke={guideColor} strokeWidth="0.5" opacity="0.75" fill="none" className="pointer-events-none">
          <line x1={dims.width * 0.15} y1={dims.height} x2={dims.width / 2} y2={dims.height * 0.1} />
          <line x1={dims.width * 0.85} y1={dims.height} x2={dims.width / 2} y2={dims.height * 0.1} />
          <line x1={dims.width * 0.35} y1={dims.height} x2={dims.width / 2} y2={dims.height * 0.1} strokeDasharray="2,2" />
          <line x1={dims.width * 0.65} y1={dims.height} x2={dims.width / 2} y2={dims.height * 0.1} strokeDasharray="2,2" />
          <circle cx={dims.width / 2} cy={dims.height * 0.1} r="8" strokeWidth="1" />
        </g>
      )}

      {/* ========================================================= */}
      {/* 25. dutch_angle: Rotated composition leveling guide       */}
      {/* ========================================================= */}
      {guideType === "dutch_angle" && (
        <g stroke={guideColor} strokeWidth="0.5" opacity="0.8">
          {/* Rotated Horizon Bar and Angle Selector */}
          <g transform={`rotate(${simulatedTilt} ${dims.width/2} ${dims.height/2})`}>
            <line x1="0" y1={dims.height/2} x2={dims.width} y2={dims.height/2} strokeWidth="1.5" />
            <line x1={dims.width * 0.2} y1={dims.height/2 - 8} x2={dims.width * 0.2} y2={dims.height/2 + 8} />
            <line x1={dims.width * 0.8} y1={dims.height/2 - 8} x2={dims.width * 0.8} y2={dims.height/2 + 8} />
          </g>
          {/* Static level reference */}
          <line x1={dims.width/2 - 40} y1={dims.height/2} x2={dims.width/2 + 40} y2={dims.height/2} stroke="white" strokeWidth="0.4" opacity="0.5" />

          <foreignObject x="8" y="8" width="220" height="24" className="pointer-events-none">
            <div className="flex justify-between items-center text-[8px] font-mono">
              <span className="text-zinc-400">DUTCH TILT ORIENTATION</span>
              <div className="flex gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setSimulatedTilt((t) => (t === 12 ? -12 : t === -12 ? 22 : 12))}
                  className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-400 font-bold hover:bg-zinc-800"
                >
                  Rotate ({simulatedTilt}°)
                </button>
              </div>
            </div>
          </foreignObject>
        </g>
      )}

      {/* ========================================================= */}
      {/* 26. center_eye: Close portrait center eye anchor          */}
      {/* ========================================================= */}
      {guideType === "center_eye" && (
        <g fill="none">
          <line x1="0" y1={dims.height * 0.33} x2={dims.width} y2={dims.height * 0.33} stroke={guideColor} strokeWidth="0.4" strokeDasharray="3,3" opacity="0.5" />
          <line x1={dims.width / 2} y1="0" x2={dims.width / 2} y2={dims.height} stroke={guideColor} strokeWidth="0.4" strokeDasharray="3,3" opacity="0.5" />

          {/* Primary Dominant Eye circular lock */}
          {(() => {
            const eye = getPoint("eye");
            return (
              <g className="animate-pulse">
                <circle cx={eye.x} cy={eye.y} r="8" stroke={guideColor} strokeWidth="1" />
                <circle cx={eye.x} cy={eye.y} r="1.5" fill={guideColor} />
                <line x1={eye.x - 12} y1={eye.y} x2={eye.x + 12} y2={eye.y} stroke={guideColor} strokeWidth="0.6" />
                <line x1={eye.x} y1={eye.y - 12} x2={eye.x} y2={eye.y + 12} stroke={guideColor} strokeWidth="0.6" />
              </g>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 27. patterns_repetition: Multi-rhythm repeating grids    */}
      {/* ========================================================= */}
      {guideType === "patterns_repetition" && (
        <g stroke={guideColor} strokeWidth="0.5" opacity="0.65" fill="none" className="pointer-events-none">
          {[0.2, 0.4, 0.6, 0.8].map((xPct) =>
            [0.2, 0.5, 0.8].map((yPct) => (
              <circle
                key={`pat-${xPct}-${yPct}`}
                cx={dims.width * xPct}
                cy={dims.height * yPct}
                r="3.5"
                strokeWidth="0.5"
              />
            ))
          )}
        </g>
      )}

      {/* ========================================================= */}
      {/* 28. pattern_breaking: Grid with pulsing isolated target   */}
      {/* ========================================================= */}
      {guideType === "pattern_breaking" && (
        <g>
          {/* Constant repetitive ticks background */}
          <g stroke="white" strokeWidth="0.25" opacity="0.25" fill="none">
            {[0.2, 0.45, 0.7].map((xPct) =>
              [0.2, 0.5, 0.8].map((yPct) => (
                <rect
                  key={`break-bg-${xPct}-${yPct}`}
                  x={dims.width * xPct - 15}
                  y={dims.height * yPct - 10}
                  width="30"
                  height="20"
                />
              ))
            )}
          </g>
          {/* Draggable break anomaly point */}
          {(() => {
            const anomaly = getPoint("anomaly");
            return (
              <g>
                <circle cx={anomaly.x} cy={anomaly.y} r="8" fill="none" stroke={guideColor} strokeWidth="1" className="animate-pulse" />
                <circle cx={anomaly.x} cy={anomaly.y} r="2" fill={guideColor} />
                <path d={`M ${anomaly.x + 10} ${anomaly.y + 10} L ${anomaly.x + 2} ${anomaly.y + 2}`} stroke={guideColor} strokeWidth="1" />
                <text x={anomaly.x + 14} y={anomaly.y + 14} fill={guideColor} fontSize="8" fontFamily="monospace" fontWeight="bold">PATTERN BREAK</text>
              </g>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 29. juxtaposition: Dual clashing contrast connection      */}
      {/* ========================================================= */}
      {guideType === "juxtaposition" && (
        <g>
          {(() => {
            const p1 = getPoint("point1");
            const p2 = getPoint("point2");
            return (
              <>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={guideColor} strokeWidth="0.8" />
                {/* Contrast spotlight point A */}
                <circle cx={p1.x} cy={p1.y} r="8" fill="none" stroke={guideColor} strokeWidth="1.2" />
                <text x={p1.x - 24} y={p1.y - 12} fill={guideColor} fontSize="8" fontFamily="monospace" fontWeight="bold">CONCEPT A</text>
                {/* Contrast spotlight point B */}
                <circle cx={p2.x} cy={p2.y} r="8" fill="none" stroke={guideColor} strokeWidth="1.2" />
                <text x={p2.x - 24} y={p2.y - 12} fill={guideColor} fontSize="8" fontFamily="monospace" fontWeight="bold">CONCEPT B</text>
                {/* Visual conflict indicator */}
                <line x1={(p1.x + p2.x)/2 - 6} y1={(p1.y + p2.y)/2 - 6} x2={(p1.x + p2.x)/2 + 6} y2={(p1.y + p2.y)/2 + 6} stroke={guideColor} strokeWidth="1.5" />
                <line x1={(p1.x + p2.x)/2 + 6} y1={(p1.y + p2.y)/2 - 6} x2={(p1.x + p2.x)/2 - 6} y2={(p1.y + p2.y)/2 + 6} stroke={guideColor} strokeWidth="1.5" />
              </>
            );
          })()}
        </g>
      )}

      {/* ========================================================= */}
      {/* 30. complementary_colors / 31. analogous_colors           */}
      {/* ========================================================= */}
      {(guideType === "complementary_colors" || guideType === "analogous_colors") && (
        <g className="pointer-events-none">
          {/* Small floating color schematic in top left */}
          <g transform={`translate(${dims.width * 0.08}, ${dims.height * 0.15})`} opacity="0.85">
            <circle cx="0" cy="0" r="22" fill="none" stroke="white" strokeWidth="0.6" />
            {/* Color slices markings */}
            <circle cx="0" cy="-18" r="3" fill="#ef4444" /> {/* Red */}
            <circle cx="15" cy="-9" r="3" fill="#f97316" /> {/* Orange */}
            <circle cx="15" cy="9" r="3" fill="#eab308" /> {/* Yellow */}
            <circle cx="0" cy="18" r="3" fill="#06b6d4" /> {/* Cyan / Teal */}
            <circle cx="-15" cy="9" r="3" fill="#3b82f6" /> {/* Blue */}
            <circle cx="-15" cy="-9" r="3" fill="#a855f7" /> {/* Violet */}

            {guideType === "complementary_colors" ? (
              <>
                <line x1="15" y1="-9" x2="-15" y2="9" stroke={guideColor} strokeWidth="1.2" />
                <circle cx="15" cy="-9" r="4.5" fill="none" stroke={guideColor} strokeWidth="0.6" />
                <circle cx="-15" cy="9" r="4.5" fill="none" stroke={guideColor} strokeWidth="0.6" />
                <text x="26" y="4" fill="white" fontSize="8" fontFamily="monospace">TEAL & ORANGE COMPLEMENT</text>
              </>
            ) : (
              <>
                <path d="M 0 -18 A 18 18 0 0 1 15 -9 L 15 9" stroke={guideColor} strokeWidth="1.2" fill="none" />
                <text x="26" y="4" fill="white" fontSize="8" fontFamily="monospace">ANALOGOUS HARMONY</text>
              </>
            )}
          </g>
        </g>
      )}

      {/* ========================================================= */}
      {/* 32. rule_of_odds: Draggable custom group nodes            */}
      {/* ========================================================= */}
      {guideType === "rule_of_odds" && (
        <g>
          {/* Control overlay letting DP switch odds count */}
          <foreignObject x={dims.width - 150} y="8" width="140" height="24" className="pointer-events-none">
            <div className="flex justify-end gap-1.5 text-[8px] font-mono">
              {[3, 5, 7].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setOddsCount(num)}
                  className={`px-2 py-1 rounded border border-zinc-800 pointer-events-auto ${oddsCount === num ? "bg-amber-500 text-black font-bold" : "bg-zinc-950 text-zinc-400"}`}
                >
                  {num} Odds
                </button>
              ))}
            </div>
          </foreignObject>
        </g>
      )}

      {/* ========================================================= */}
      {/* 33. decisive_moment: Burst speed indicators               */}
      {/* ========================================================= */}
      {guideType === "decisive_moment" && (
        <g stroke={guideColor} strokeWidth="0.5" fill="none" className="pointer-events-none">
          {/* High speed cinematic capture framing markers */}
          <path d={`M 15,40 L 15,15 L 40,15`} strokeWidth="1.5" />
          <path d={`M ${dims.width - 15},40 L ${dims.width - 15},15 L ${dims.width - 40},15`} strokeWidth="1.5" />
          <path d={`M 15,${dims.height - 40} L 15,${dims.height - 15} L 40,${dims.height - 15}`} strokeWidth="1.5" />
          <path d={`M ${dims.width - 15},${dims.height - 40} L ${dims.width - 15},${dims.height - 15} L ${dims.width - 40},${dims.height - 15}`} strokeWidth="1.5" />

          {/* Running millisecond stopwatch readout */}
          <foreignObject x={dims.width / 2 - 75} y={dims.height - 36} width="150" height="26">
            <div className="w-full text-center text-[9px] font-mono font-bold text-red-500 bg-black/85 py-1.5 rounded-lg border border-red-500/40 animate-pulse tracking-wide">
              BURST BUFFER: {new Date().getMilliseconds()}ms / 60FPS
            </div>
          </foreignObject>
        </g>
      )}

      {/* ========================================================= */}
      {/* Render AI custom guides on top                            */}
      {/* ========================================================= */}
      {customAiGuides.map((guide, gIdx) => {
        if (!guide.points || guide.points.length < 2) return null;

        const pixelPoints = guide.points.map((p) => ({
          x: scaleX(p.x),
          y: scaleY(p.y),
        }));

        if (guide.type === "rect") {
          const xMin = Math.min(...pixelPoints.map(p => p.x));
          const yMin = Math.min(...pixelPoints.map(p => p.y));
          const xMax = Math.max(...pixelPoints.map(p => p.x));
          const yMax = Math.max(...pixelPoints.map(p => p.y));
          return (
            <g key={`ai-rect-group-${gIdx}`}>
              <rect
                x={xMin}
                y={yMin}
                width={xMax - xMin}
                height={yMax - yMin}
                fill="none"
                stroke="#06b6d4" // Neon blue
                strokeWidth="1.8"
                strokeDasharray="4,3"
                className="animate-pulse"
              />
              {/* Core descriptive text */}
              <text x={xMin + 4} y={yMin + 12} fill="#06b6d4" fontSize="8" fontFamily="monospace" fontWeight="bold">
                AI DETECTED SUBJECT
              </text>
            </g>
          );
        }

        return (
          <path
            key={`ai-path-${gIdx}`}
            d={`M ${pixelPoints[0].x} ${pixelPoints[0].y} ${pixelPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")}`}
            fill="none"
            stroke="#10b981" // emerald
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* ========================================================= */}
      {/* INTERACTIVE DRAGGABLE CONTROL HANDLE OVERLAYS             */}
      {/* ========================================================= */}
      {points.map((pt) => {
        const xVal = scaleX(pt.x);
        const yVal = scaleY(pt.y);
        return (
          <g key={`handle-${pt.id}`}>
            {/* Hidden generous pointer target area */}
            <circle
              cx={xVal}
              cy={yVal}
              r="14"
              fill="transparent"
              className="cursor-move pointer-events-auto"
              onPointerDown={(e) => handlePointerDown(e, pt.id)}
            />
            {/* Visual crosshair anchor coin */}
            <circle
              cx={xVal}
              cy={yVal}
              r="6"
              fill="black"
              stroke={guideColor}
              strokeWidth="1.5"
              className="cursor-move pointer-events-none"
            />
            <circle
              cx={xVal}
              cy={yVal}
              r="2"
              fill={guideColor}
              className="pointer-events-none"
            />
            {/* Coordinate descriptor tag on hover */}
            <text
              x={xVal}
              y={yVal - 10}
              fill={guideColor}
              fontSize="7"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
              className="pointer-events-none drop-shadow"
            >
              {pt.label || pt.id.toUpperCase()} ({Math.round(pt.x)}%, {Math.round(pt.y)}%)
            </text>
          </g>
        );
      })}
    </svg>
  );
};
