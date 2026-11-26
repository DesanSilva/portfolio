// Camera preset per screen: yaw, pitch, roll, distance, shiftX, shiftY (screen units).
// Landing and about are fixed states. From the projects screen on, the surface drifts slowly and
// continuously over each screen's whole length (see position() in grid.ts), so nothing jumps.
export const PRESETS: number[][] = [
  [0.68, 0.36, -0.4363, 32, 0, 0], // landing: matches the original background design
  [0.68, 0.36, -0.4363, 32, 0.9, 1.9], // about: same surface, moved off the text
  [0.68, 0.36, -0.4363, 32, 0.9, 1.6], // projects
  [0.68, 0.36, -0.4363, 32, 0.8, 1.1], // research
  [0.68, 0.36, -0.4363, 32, 0.7, -0.1], // contact
];
export const DPR_MAX = 1.5;
export const GRID_DESKTOP = [150, 90]; // 13,500 points
export const GRID_SMALL = [100, 60]; // 6,000 points: narrow or low-core
export const FRAME_MS_DESKTOP = 1000 / 60;
export const FRAME_MS_SMALL = 1000 / 30;
