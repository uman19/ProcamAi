import React, { useState, useMemo } from "react";
import { COMPOSITION_TECHNIQUES, CompositionTechnique, CompositionNature, CompositionCategory } from "../compositionData";
import { Search, Compass, Eye, Sliders, ShieldAlert, Sparkles, Move, EyeOff } from "lucide-react";

interface CompositionMasterControllerProps {
  activeCompositionId: string;
  setActiveCompositionId: (id: string) => void;
  guideColor: string;
  setGuideColor: (color: string) => void;
  suggestions: any[];
  activeSuggestionIndex: number;
  setActiveSuggestionIndex: (idx: number) => void;
}

export const CompositionMasterController: React.FC<CompositionMasterControllerProps> = ({
  activeCompositionId,
  setActiveCompositionId,
  guideColor,
  setGuideColor,
  suggestions,
  activeSuggestionIndex,
  setActiveSuggestionIndex,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [natureFilter, setNatureFilter] = useState<"ALL" | "STATIC" | "DYNAMIC">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Categories list derived from master data
  const categories = useMemo(() => {
    const list = Array.from(new Set(COMPOSITION_TECHNIQUES.map((t) => t.category)));
    return ["ALL", ...list];
  }, []);

  // Filtered master list
  const filteredTechniques = useMemo(() => {
    return COMPOSITION_TECHNIQUES.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesNature =
        natureFilter === "ALL" ||
        (natureFilter === "STATIC" && t.nature === "Static (Frame-Relative)") ||
        (natureFilter === "DYNAMIC" && t.nature === "Dynamic (View-Relative)");

      const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory;

      return matchesSearch && matchesNature && matchesCategory;
    });
  }, [searchQuery, natureFilter, selectedCategory]);

  // Find currently selected technique details
  const activeTechnique = useMemo(() => {
    return COMPOSITION_TECHNIQUES.find((t) => t.id === activeCompositionId);
  }, [activeCompositionId]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 text-zinc-100 shadow-xl" id="comp-master-panel">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-amber-500 animate-spin-slow" />
          <div>
            <h3 className="font-display font-bold text-sm text-zinc-100">PRO Composition Toolkit</h3>
            <p className="text-[10px] text-zinc-400 font-mono">33 Master Cinematography Guidelines</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Guide Color picker */}
          <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Guide Tint:</span>
            <input
              type="color"
              value={guideColor}
              onChange={(e) => setGuideColor(e.target.value)}
              className="w-4 h-4 bg-transparent border-0 cursor-pointer rounded"
              title="Change guide overlay color"
            />
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS TABS */}
      <div className="flex flex-col gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search guidelines (e.g. leading, spiral)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800/80 rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-mono text-zinc-300"
          />
        </div>

        {/* Nature Tab switch (Static vs Dynamic) */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/40 text-[10px] font-mono">
          <button
            onClick={() => setNatureFilter("ALL")}
            className={`py-1 rounded transition-all ${natureFilter === "ALL" ? "bg-zinc-800 text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            All ({COMPOSITION_TECHNIQUES.length})
          </button>
          <button
            onClick={() => setNatureFilter("STATIC")}
            className={`py-1 rounded transition-all ${natureFilter === "STATIC" ? "bg-zinc-800 text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Static (Frame)
          </button>
          <button
            onClick={() => setNatureFilter("DYNAMIC")}
            className={`py-1 rounded transition-all ${natureFilter === "DYNAMIC" ? "bg-zinc-800 text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Dynamic (View)
          </button>
        </div>

        {/* Category Horizontal Scrolling Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[9px] font-mono whitespace-nowrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-full border transition-all ${
                selectedCategory === cat
                  ? "bg-amber-500/15 border-amber-500 text-amber-400 font-bold"
                  : "bg-zinc-950 border-zinc-800/60 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* DETAILED ACTIVE COMPOSITION READOUT */}
      {activeTechnique ? (
        <div className="bg-zinc-950/90 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                activeTechnique.nature.includes("Dynamic") ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-teal-500/10 text-teal-400 border border-teal-500/20"
              }`}>
                {activeTechnique.nature}
              </span>
              <h4 className="text-sm font-display font-bold text-amber-400 mt-1">{activeTechnique.name}</h4>
              <p className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wider">{activeTechnique.category}</p>
            </div>

            {/* Draggable indicator icon */}
            {activeTechnique.nature.includes("Dynamic") && (
              <div className="flex items-center gap-1 bg-indigo-500/15 text-indigo-400 text-[8px] font-mono px-2 py-1 rounded border border-indigo-500/20 animate-pulse">
                <Move className="w-3 h-3" /> Draggable Anchors
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed font-sans border-t border-zinc-900 pt-2">
            {activeTechnique.description}
          </p>

          <div className="bg-amber-500/5 border border-amber-500/25 rounded-lg p-2.5 flex gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-zinc-400">
              <strong className="text-zinc-200">Pro Tip:</strong> {activeTechnique.professionalTip}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-950 rounded-xl p-4 text-center border border-zinc-800/40">
          <EyeOff className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-500 font-mono">No guide projected on viewfinder.</p>
        </div>
      )}

      {/* COMPOSITION SELECTOR GRID */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider px-1">
          <span>Available Guidelines ({filteredTechniques.length})</span>
          <span>Click to Project</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 max-h-[170px] overflow-y-auto pr-1">
          {/* No Grid Option */}
          <button
            onClick={() => {
              setActiveCompositionId("none");
            }}
            className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all group ${
              activeCompositionId === "none"
                ? "bg-zinc-100 border-zinc-100 text-zinc-950 font-bold"
                : "bg-zinc-950 border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700"
            }`}
          >
            <span className="text-[11px] font-bold tracking-tight block">No Guide Overlay</span>
            <span className="text-[8px] font-mono opacity-60 uppercase block mt-1">Clear Viewfinder</span>
          </button>

          {filteredTechniques.map((t) => {
            const isProjected = activeCompositionId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveCompositionId(t.id);
                  // Find index if matched in AI suggestions
                  const sIdx = suggestions.findIndex((s) => s.type === t.id);
                  if (sIdx !== -1) {
                    setActiveSuggestionIndex(sIdx);
                  }
                }}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all group relative overflow-hidden ${
                  isProjected
                    ? "bg-amber-500 text-black border-amber-400 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                    : "bg-zinc-950 border-zinc-850 hover:bg-zinc-850 hover:border-zinc-700"
                }`}
              >
                {/* Visual nature tag */}
                <div className="flex justify-between items-start gap-1 w-full">
                  <span className={`text-[10px] font-bold tracking-tight block leading-tight truncate ${isProjected ? "text-zinc-950" : "text-zinc-200 group-hover:text-white"}`}>
                    {t.name}
                  </span>
                  <span className={`text-[7px] font-mono px-1 py-0.2 rounded border uppercase font-bold shrink-0 ${
                    isProjected 
                      ? "bg-black/10 border-black/20 text-zinc-900" 
                      : t.nature.includes("Dynamic") 
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
                        : "bg-teal-500/10 border-teal-500/20 text-teal-400"
                  }`}>
                    {t.nature.includes("Dynamic") ? "Dyn" : "Stat"}
                  </span>
                </div>
                <span className={`text-[8px] font-mono mt-2 block leading-none ${isProjected ? "text-zinc-900/80" : "text-zinc-500 group-hover:text-zinc-400"}`}>
                  {t.category.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
