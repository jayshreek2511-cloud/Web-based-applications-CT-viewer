// Case metadata is kept separate so another research case can be substituted easily.
export const ORGANS = [
  ['aorta', 'Aorta', '#ef4444'], ['gall_bladder', 'Gall bladder', '#22c55e'],
  ['kidney_left', 'Left kidney', '#38bdf8'], ['kidney_right', 'Right kidney', '#a78bfa'],
  ['liver', 'Liver', '#f59e0b'], ['pancreas', 'Pancreas', '#ec4899'],
  ['postcava', 'Postcava', '#14b8a6'], ['spleen', 'Spleen', '#e879f9'], ['stomach', 'Stomach', '#84cc16'],
].map(([id, name, color]) => ({ id, name, color, opacity: 0.58 }));

export const PRESETS = {
  'Soft tissue': { window: 400, level: 40 }, Bone: { window: 2000, level: 400 },
  Lung: { window: 1500, level: -600 }, Brain: { window: 80, level: 40 },
};

export function dataUrl(path) {
  return `${import.meta.env.BASE_URL}data/BDMAP_00000338/${path}`;
}
