export interface ThemeRegistryItem {
  id: string;
  name: string;
  description: string;
  previewColor: string;
}

export const parseColorToRgb = (colorStr: string): [number, number, number] | null => {
  const trimmed = colorStr.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.substring(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return [r, g, b];
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return [r, g, b];
    }
  }
  const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
  }
  return null;
};

export const getContrastMaskColor = (bgRgb: [number, number, number]): [number, number, number] => {
  const [r, g, b] = bgRgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.5) {
    // Light background: make mask slightly darker for visual contrast
    return [Math.max(0, r - 30), Math.max(0, g - 30), Math.max(0, b - 30)];
  } else {
    // Dark background: make mask lighter for visual contrast
    return [Math.min(255, r + 40), Math.min(255, g + 40), Math.min(255, b + 40)];
  }
};

export const AVAILABLE_THEMES: ThemeRegistryItem[] = [
  {
    id: "amber-minimal",
    name: "Amber Minimal",
    description: "Amber Minimal color scheme",
    previewColor: "#f59e0b"
  },
  {
    id: "amethyst-haze",
    name: "Amethyst Haze",
    description: "Amethyst Haze color scheme",
    previewColor: "#a855f7"
  },
  {
    id: "bold-tech",
    name: "Bold Tech",
    description: "Bold Tech color scheme",
    previewColor: "#2563eb"
  },
  {
    id: "bubblegum",
    name: "Bubblegum",
    description: "Bubblegum color scheme",
    previewColor: "#ec4899"
  },
  {
    id: "caffeine",
    name: "Caffeine",
    description: "Caffeine color scheme",
    previewColor: "#644a40"
  },
  {
    id: "candyland",
    name: "Candyland",
    description: "Candyland color scheme",
    previewColor: "#ec4899"
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    description: "Catppuccin color scheme",
    previewColor: "#f5c2e7"
  },
  {
    id: "claude",
    name: "Claude",
    description: "Claude color scheme",
    previewColor: "#c96442"
  },
  {
    id: "claymorphism",
    name: "Claymorphism",
    description: "Claymorphism color scheme",
    previewColor: "#3b82f6"
  },
  {
    id: "clean-slate",
    name: "Clean Slate",
    description: "Clean Slate color scheme",
    previewColor: "#4b5563"
  },
  {
    id: "cosmic-night",
    name: "Cosmic Night",
    description: "Cosmic Night color scheme",
    previewColor: "#6366f1"
  },
  {
    id: "classic",
    name: "Classic",
    description: "Classic blue/yellow layout",
    previewColor: "#3a5ba0"
  },
  {
    id: "bw",
    name: "BW",
    description: "BW color scheme",
    previewColor: "#171717"
  },
  {
    id: "doom-64",
    name: "Doom 64",
    description: "Doom 64 color scheme",
    previewColor: "#b71c1c"
  },
  {
    id: "elegant-luxury",
    name: "Elegant Luxury",
    description: "Elegant Luxury color scheme",
    previewColor: "#d4af37"
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Graphite color scheme",
    previewColor: "#4b5563"
  },
  {
    id: "kodama-grove",
    name: "Kodama Grove",
    description: "Kodama Grove color scheme",
    previewColor: "#8d9d4f"
  },
  {
    id: "midnight-bloom",
    name: "Midnight Bloom",
    description: "Midnight Bloom color scheme",
    previewColor: "#d946ef"
  },
  {
    id: "mocha-mousse",
    name: "Mocha Mousse",
    description: "Mocha Mousse color scheme",
    previewColor: "#78350f"
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Modern Minimal color scheme",
    previewColor: "#000000"
  },
  {
    id: "mono",
    name: "Mono",
    description: "Mono color scheme",
    previewColor: "#737373"
  },
  {
    id: "nature",
    name: "Nature",
    description: "Nature color scheme",
    previewColor: "#059669"
  },
  {
    id: "neo-brutalism",
    name: "Neo Brutalism",
    description: "Neo Brutalism color scheme",
    previewColor: "#ff5e00"
  },
  {
    id: "northern-lights",
    name: "Northern Lights",
    description: "Northern Lights color scheme",
    previewColor: "#2dd4bf"
  },
  {
    id: "notebook",
    name: "Notebook",
    description: "Notebook color scheme",
    previewColor: "#3182ce"
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    description: "Ocean Breeze color scheme",
    previewColor: "#0ea5e9"
  },
  {
    id: "origin-ui",
    name: "Origin Ui",
    description: "Origin Ui color scheme",
    previewColor: "#4f46e5"
  },
  {
    id: "pastel-dreams",
    name: "Pastel Dreams",
    description: "Pastel Dreams color scheme",
    previewColor: "#a78bfa"
  },
  {
    id: "perpetuity",
    name: "Perpetuity",
    description: "Perpetuity color scheme",
    previewColor: "#10b981"
  },
  {
    id: "quantum-rose",
    name: "Quantum Rose",
    description: "Quantum Rose color scheme",
    previewColor: "#e6067a"
  },
  {
    id: "retro-arcade",
    name: "Retro Arcade",
    description: "Retro Arcade color scheme",
    previewColor: "#f43f5e"
  },
  {
    id: "soft-pop",
    name: "Soft Pop",
    description: "Soft Pop color scheme",
    previewColor: "#ec4899"
  },
  {
    id: "solar-dusk",
    name: "Solar Dusk",
    description: "Solar Dusk color scheme",
    previewColor: "#B45309"
  },
  {
    id: "starry-night",
    name: "Starry Night",
    description: "Starry Night color scheme",
    previewColor: "#3182ce"
  },
  {
    id: "sunset-horizon",
    name: "Sunset Horizon",
    description: "Sunset Horizon color scheme",
    previewColor: "#f97316"
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Supabase color scheme",
    previewColor: "#3ecf8e"
  },
  {
    id: "t3-chat",
    name: "T3 Chat",
    description: "T3 Chat color scheme",
    previewColor: "#0284c7"
  },
  {
    id: "tangerine",
    name: "Tangerine",
    description: "Tangerine color scheme",
    previewColor: "#f97316"
  },
  {
    id: "twitter",
    name: "Twitter",
    description: "Twitter color scheme",
    previewColor: "#1e9df1"
  },
  {
    id: "vintage-paper",
    name: "Vintage Paper",
    description: "Vintage Paper color scheme",
    previewColor: "#78350f"
  },
  {
    id: "violet-bloom",
    name: "Violet Bloom",
    description: "Violet Bloom color scheme",
    previewColor: "#8b5cf6"
  }
];
