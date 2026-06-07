/**
 * AI image-generation Starter Pack presets (Copilot Media #3 / Ali's batch prompts).
 * Plain module (NOT "use server") so it can export the const catalog used by the UI.
 * Generation itself is the keys-gated server action generateAiImages() in website/actions.
 *
 * NOTE: icon-set prompts intentionally say "generic glyphs only — no trademarked brand
 * logos" to stay clear of trademark reproduction.
 */
export interface AiPreset { id: string; group: string; label: string; prompt: string; }

export const AI_STARTER_PACKS: AiPreset[] = [
  // Social / UI icon sets.
  { id: "ic-line", group: "Icon sets", label: "Minimal Line icons", prompt: "A complete set of minimal line UI/social glyphs (share, like, chat, camera, video, bell, globe, mention, hashtag, link, send, location). Style: ultra-minimal, 2px line weight, rounded corners, monochrome black on transparent, no fills/gradients/shadows. Square 512x512, centered, equal padding, consistent proportions. Generic glyphs only — no trademarked brand logos." },
  { id: "ic-filled", group: "Icon sets", label: "Bold Filled icons", prompt: "A complete set of bold filled UI/social glyphs (share, like, chat, camera, video, bell, globe, mention, hashtag, link, send, location). Style: solid filled silhouettes, high contrast, no gradients/outlines, monochrome on transparent. Square 512x512, centered, consistent proportions. Generic glyphs only — no trademarked brand logos." },
  { id: "ic-soft", group: "Icon sets", label: "Rounded Soft icons", prompt: "A complete set of rounded soft UI/social glyphs (share, like, chat, camera, video, bell, globe, mention, hashtag, link, send, location). Style: soft rounded shapes, gentle curves, modern friendly, monochrome dark gray on transparent. Square 512x512, consistent proportions. Generic glyphs only — no trademarked brand logos." },
  { id: "ic-gradient", group: "Icon sets", label: "Gradient Modern icons", prompt: "A complete set of modern gradient UI/social glyphs (share, like, chat, camera, video, bell, globe, mention, hashtag, link, send, location). Style: soft gradients (blue-purple, teal-blue, orange-pink), subtle depth, no harsh shadows/bevels, transparent background. Square 512x512, consistent proportions. Generic glyphs only — no trademarked brand logos." },
  // Emoji sets.
  { id: "em-flat", group: "Emoji sets", label: "Flat Modern emojis", prompt: "A set of flat modern vector emojis (heart, thumbs up, star, checkmark, smile, wink, laugh, wow, arrow, sparkles, fire, pin, bell). Style: flat, clean, minimal shading, bold colors, no gradients/3D. Square 512x512, transparent, consistent proportions." },
  { id: "em-3d", group: "Emoji sets", label: "3D Soft emojis", prompt: "A set of soft 3D emojis with smooth shading and rounded forms (heart, thumbs up, star, checkmark, smile, wink, laugh, wow, arrow, sparkles, fire, pin, bell). Style: soft 3D, smooth gradients, subtle highlights, friendly, no text. Square 512x512, transparent, consistent proportions. Original style (not a copy of any vendor's emoji)." },
  { id: "em-min", group: "Emoji sets", label: "Minimal Monochrome emojis", prompt: "A set of minimal monochrome line emojis (heart, thumbs up, star, checkmark, smile, wink, laugh, wow, arrow, sparkles, fire, pin, bell). Style: 2px line weight, monochrome black, no fills/gradients/shadows. Square 512x512, transparent, consistent proportions." },
  // Business / website photo categories.
  { id: "ph-landscape", group: "Website photos", label: "Landscapes & cities", prompt: "High-quality landscape and city images for website hero sections: skylines, modern streets, office towers, business districts, parks, waterfronts. Photorealistic, clean, bright, modern, no people, wide compositions, 16:9. Neutral global locations, no copyrighted landmarks. 1920x1080." },
  { id: "ph-people", group: "Website photos", label: "People & teams", prompt: "Professional business people in modern office environments: diverse teams collaborating, meetings, presentations, customer service, smiling professionals. Photorealistic, clean lighting, modern clothing, no logos/text/branded items. 1920x1080." },
  { id: "ph-office", group: "Website photos", label: "Offices & workspaces", prompt: "Modern office interiors for website backgrounds: meeting rooms, coworking spaces, desks, open offices, lobbies, workstations. Photorealistic, bright, minimal, no people/logos/text. 1920x1080." },
  { id: "ph-it", group: "Website photos", label: "IT & cybersecurity", prompt: "Abstract IT and cybersecurity graphics: network lines, digital grids, shield motifs, secure connections, abstract tech patterns. Modern, blue/teal palette, subtle gradients, no text/logos. 1920x1080." },
  { id: "ph-law", group: "Website photos", label: "Law", prompt: "Law-themed business images: law offices, bookshelves, meeting tables, neutral legal symbols (scales, columns). Photorealistic, clean, modern, no copyrighted symbols. 1920x1080." },
  { id: "ph-realestate", group: "Website photos", label: "Real estate", prompt: "Real estate business images: homes, condos, agents showing properties, keys, contracts, modern interiors. Photorealistic, bright, clean, no logos/text. 1920x1080." },
  { id: "ph-finance", group: "Website photos", label: "Banking & finance", prompt: "Finance-themed business images: offices, charts, graphs, calculators, financial meetings, abstract money concepts. Photorealistic or abstract, clean, modern, no logos/text. 1920x1080." },
];
