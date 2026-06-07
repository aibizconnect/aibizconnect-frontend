/**
 * AI image-generation preset catalog (Copilot Media plan — Step 1).
 * Each preset drives the nightly media_steward generation pass: a category + style +
 * batch size + the read-only /System folder its output lands in.
 *
 * This is pure config (no side effects). The prompt TEXT for each (category, style)
 * lives in lib/media/ai-presets.ts and is resolved at generation time.
 */
export type PresetCategory = "icons" | "emojis" | "photos" | "graphics" | "backgrounds" | "biz_bg";

export interface AiGenPreset {
  id: string;
  label: string;
  category: PresetCategory;
  style: string;
  batchSize: number;
  targetFolder: string; // read-only /System path
}

export const STARTER_PRESETS: AiGenPreset[] = [
  { id: "icons_minimal_line",   label: "Minimal Line Social Icons",   category: "icons", style: "minimal_line",   batchSize: 12, targetFolder: "/System/Icons/Minimal Line" },
  { id: "icons_bold_filled",    label: "Bold Filled Social Icons",    category: "icons", style: "bold_filled",    batchSize: 12, targetFolder: "/System/Icons/Bold Filled" },
  { id: "icons_rounded_soft",   label: "Rounded Soft Social Icons",   category: "icons", style: "rounded_soft",   batchSize: 12, targetFolder: "/System/Icons/Rounded Soft" },
  { id: "icons_gradient_modern",label: "Gradient Modern Social Icons",category: "icons", style: "gradient_modern",batchSize: 12, targetFolder: "/System/Icons/Gradient Modern" },

  { id: "emojis_flat",          label: "Flat Emojis",                 category: "emojis", style: "flat",          batchSize: 16, targetFolder: "/System/Emojis/Flat" },
  { id: "emojis_3d_soft",       label: "3D Soft Emojis",              category: "emojis", style: "3d_soft",       batchSize: 16, targetFolder: "/System/Emojis/3D" },
  { id: "emojis_minimal_mono",  label: "Minimal Monochrome Emojis",   category: "emojis", style: "minimal_mono",  batchSize: 16, targetFolder: "/System/Emojis/Minimal" },

  { id: "photos_landscapes",    label: "Business Landscapes & Cities",category: "photos", style: "landscapes",    batchSize: 12, targetFolder: "/System/Photos/Landscapes" },
  { id: "photos_people",        label: "Business People & Teams",     category: "photos", style: "people",        batchSize: 12, targetFolder: "/System/Photos/People" },
  { id: "photos_offices",       label: "Modern Offices & Workspaces", category: "photos", style: "offices",       batchSize: 12, targetFolder: "/System/Photos/Offices" },

  { id: "graphics_it_security", label: "IT & Security Graphics",      category: "graphics", style: "it_security", batchSize: 10, targetFolder: "/System/Graphics/IT & Security" },
  { id: "graphics_law",         label: "Law Firm Graphics",           category: "graphics", style: "law",         batchSize: 10, targetFolder: "/System/Graphics/Law" },
  { id: "graphics_real_estate", label: "Real Estate Graphics",        category: "graphics", style: "real_estate", batchSize: 10, targetFolder: "/System/Graphics/Real Estate" },
  { id: "graphics_finance",     label: "Banking & Finance Graphics",  category: "graphics", style: "finance",     batchSize: 10, targetFolder: "/System/Graphics/Finance" },

  { id: "photos_restaurant",    label: "Restaurant & Food",           category: "photos", style: "restaurant",    batchSize: 10, targetFolder: "/System/Photos/Restaurant & Food" },

  { id: "backgrounds_abstract", label: "Abstract Backgrounds",        category: "backgrounds", style: "abstract", batchSize: 12, targetFolder: "/System/Backgrounds/Abstract" },
  { id: "backgrounds_gradients",label: "Gradient Backgrounds",        category: "backgrounds", style: "gradients",batchSize: 12, targetFolder: "/System/Backgrounds/Gradients" },

  // Industry business backgrounds (Canva-style: clean, subtle, soft tones, room for text).
  { id: "bg_real_estate", label: "Real Estate",              category: "biz_bg", style: "real_estate", batchSize: 10, targetFolder: "/System/Backgrounds/Business/Real Estate" },
  { id: "bg_finance",     label: "Finance & Banking",        category: "biz_bg", style: "finance",     batchSize: 10, targetFolder: "/System/Backgrounds/Business/Finance & Banking" },
  { id: "bg_contractors", label: "Contractors & Construction",category: "biz_bg", style: "contractors",batchSize: 10, targetFolder: "/System/Backgrounds/Business/Contractors" },
  { id: "bg_legal",       label: "Legal & Law",              category: "biz_bg", style: "legal",       batchSize: 10, targetFolder: "/System/Backgrounds/Business/Legal" },
  { id: "bg_food",        label: "Food & Restaurant",        category: "biz_bg", style: "food",        batchSize: 10, targetFolder: "/System/Backgrounds/Business/Food & Restaurant" },
  { id: "bg_hr",          label: "HR & Recruiting",          category: "biz_bg", style: "hr",          batchSize: 10, targetFolder: "/System/Backgrounds/Business/HR & Recruiting" },
  { id: "bg_used_cars",   label: "Used Cars & Auto",         category: "biz_bg", style: "used_cars",   batchSize: 10, targetFolder: "/System/Backgrounds/Business/Used Cars & Auto" },
  { id: "bg_mortgage",    label: "Mortgage & Lending",       category: "biz_bg", style: "mortgage",    batchSize: 10, targetFolder: "/System/Backgrounds/Business/Mortgage & Lending" },
  { id: "bg_it",          label: "IT & Technology",          category: "biz_bg", style: "it",          batchSize: 10, targetFolder: "/System/Backgrounds/Business/IT & Technology" },
  { id: "bg_datacenter",  label: "Data Center & Cloud",      category: "biz_bg", style: "datacenter",  batchSize: 10, targetFolder: "/System/Backgrounds/Business/Data Center & Cloud" },
  { id: "bg_medical",     label: "Medical & Healthcare",     category: "biz_bg", style: "medical",     batchSize: 10, targetFolder: "/System/Backgrounds/Business/Medical & Healthcare" },
];

export function getPresetById(id: string): AiGenPreset | undefined {
  return STARTER_PRESETS.find((p) => p.id === id);
}

export function getSystemFolderForPreset(preset: AiGenPreset): string {
  return preset.targetFolder;
}
