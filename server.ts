import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with a generous limit for base64 image capture frames
app.use(express.json({ limit: "15mb" }));

// Initialize GoogleGenAI server-side with key
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI:", err);
  }
} else {
  console.warn("GEMINI_API_KEY is not defined. Using local simulated suggestions mode.");
}

// REST API for analyzing camera frames and recommending photographic composition guides
app.post("/api/composition-recommendations", async (req, res) => {
  const { image, mimeType } = req.body;

  if (!image) {
    return res.status(400).json({ error: "Missing frame data (base64 image)." });
  }

  // Fallback / simulated suggestions if Gemini is not configured
  const getFallbackSuggestions = () => {
    return [
      {
        type: "thirds",
        title: "Rule of Thirds Grid",
        reason: "Distribute visual weight along the horizontal and vertical third-lines. We've detected solid horizon lines in your lower viewfinder region, which would align beautifully with the bottom-third guide line.",
        score: 95,
        guides: []
      },
      {
        type: "leading_lines",
        title: "Dynamic Leading Lines",
        reason: "There are visible strong linear patterns converging toward the left-center. We recommend projecting a custom vanishing point guide on the left side to guide the eye deeper.",
        score: 91,
        guides: [
          {
            type: "line",
            points: [{ x: 0, y: 100 }, { x: 30, y: 50 }]
          },
          {
            type: "line",
            points: [{ x: 100, y: 100 }, { x: 30, y: 50 }]
          }
        ]
      },
      {
        type: "golden_spiral_br",
        title: "Golden Spiral (Bottom-Right Start)",
        reason: "We detected empty sky negative space in the upper left, while the main contrast patterns rest in the lower right. Aligning your subject inside the Fibonacci spiral center vertex in the bottom-right quadrant creates a highly balanced organic flow.",
        score: 87,
        guides: []
      }
    ];
  };

  if (!ai) {
    // If no AI is configured, wait 500ms to simulate analysis then return mock
    await new Promise(resolve => setTimeout(resolve, 600));
    return res.json({ suggestions: getFallbackSuggestions(), simulated: true });
  }

  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: image,
      },
    };

    const promptText = 
      "Analyze this camera frame. Based on the elements, shapes, horizons, perspective, depth, and colors, " +
      "recommend 1 to 3 of the following 33 photographic composition options. " +
      "You MUST choose from these specific composition IDs:\n" +
      "1. 'thirds' (Rule of Thirds)\n" +
      "2. 'phi_grid' (Golden Ratio Grid)\n" +
      "3. 'golden_spiral_tl' (Golden Spiral Top-Left)\n" +
      "4. 'golden_spiral_tr' (Golden Spiral Top-Right)\n" +
      "5. 'golden_spiral_bl' (Golden Spiral Bottom-Left)\n" +
      "6. 'golden_spiral_br' (Golden Spiral Bottom-Right)\n" +
      "7. 'golden_triangles' (Golden Triangles)\n" +
      "8. 'quadrants' (Rule of Fourths)\n" +
      "9. 'centered_split' (Centered/Split Composition)\n" +
      "10. 'leading_lines' (Leading Lines)\n" +
      "11. 's_curves' (S-Curves)\n" +
      "12. 'c_curves' (C-Curves)\n" +
      "13. 'diagonals' (Diagonal Lines)\n" +
      "14. 'parallels' (Parallel Lines)\n" +
      "15. 'converging' (Converging Lines)\n" +
      "16. 'triangle_comp' (Triangle Composition)\n" +
      "17. 'circular_comp' (Circular/Oval Composition)\n" +
      "18. 'symmetry_reflections' (Symmetry & Reflections)\n" +
      "19. 'natural_framing' (Frame within a Frame)\n" +
      "20. 'sandwich_comp' (Sandwich Composition)\n" +
      "21. 'layering' (Layering FG/MG/BG)\n" +
      "22. 'figure_to_ground' (Figure-to-Ground Contrast)\n" +
      "23. 'negative_space' (Negative Space)\n" +
      "24. 'fill_frame' (Fill the Frame)\n" +
      "25. 'forced_perspective' (Forced Perspective)\n" +
      "26. 'birds_eye' (High Angle)\n" +
      "27. 'worms_eye' (Low Angle)\n" +
      "28. 'dutch_angle' (Tilt)\n" +
      "29. 'center_eye' (Center Dominant Eye)\n" +
      "30. 'patterns_repetition' (Patterns & Repetition)\n" +
      "31. 'pattern_breaking' (Pattern Breaking)\n" +
      "32. 'juxtaposition' (Juxtaposition)\n" +
      "33. 'complementary_colors' (Complementary Colors)\n\n" +
      "For each recommendation, explain concisely WHY it fits this scene's detected structures, horizons, patterns, or subject placements, and how the user should move/tilt their camera to align. " +
      "Ensure you distinguish between Static compositions (thirds, phi_grid, spirals, quadrants, centered_split) and Dynamic compositions (curves, leading lines, forced perspective, figure-to-ground contrast, rule of odds, etc.). " +
      "Provide custom points scaled 0 to 100 in the 'guides' property if you wish to draw live overlays.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, { text: promptText }],
      config: {
        systemInstruction: "You are a professional cinematographer, director of photography and Master of Photography assistant. Analyze visual scenes and return composition guides based on the master list of 33 techniques.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              description: "List of recommended compositions",
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "One of the 33 composition IDs requested."
                  },
                  title: {
                    type: Type.STRING,
                    description: "The name of the technique."
                  },
                  reason: {
                    type: Type.STRING,
                    description: "Detailed reason explaining why this fits the current frame's subjects, patterns, or horizons perfectly."
                  },
                  score: {
                    type: Type.INTEGER,
                    description: "Suitability score out of 100"
                  },
                  guides: {
                    type: Type.ARRAY,
                    description: "Visual helper lines or paths (coordinates 0 to 100)",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: { type: Type.STRING, description: "Type: 'line', 'rect', 'curve'" },
                        points: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              x: { type: Type.NUMBER },
                              y: { type: Type.NUMBER }
                            },
                            required: ["x", "y"]
                          }
                        }
                      },
                      required: ["type", "points"]
                    }
                  }
                },
                required: ["type", "title", "reason", "score"]
              }
            }
          },
          required: ["suggestions"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Empty response text from Gemini API.");
    }

    const data = JSON.parse(textOutput);
    return res.json({ suggestions: data.suggestions || getFallbackSuggestions(), simulated: false });

  } catch (error) {
    console.error("Gemini Frame Analysis Error:", error);
    // Return standard fallback on error so the app experience stays buttery smooth
    return res.json({
      suggestions: getFallbackSuggestions(),
      simulated: true,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Serve frontend assets in production or use Vite middleware in dev
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pro Shot Camera server booted on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
