// Camera preset per screen: yaw, pitch, roll, distance, shiftX, shiftY (screen units).
export const PRESETS: number[][] = [
  [0.68, 0.14, -0.4363, 32, 0, 0], // landing: design/background.html defaults
  [0.68, 0.14, -0.4363, 32, 1.0, 2.3], // about
  [0.68, 0.14, -0.28, 32, 0.2, -0.05], // contact
];
export const DPR_MAX = 1.5;
export const GRID_DESKTOP = [150, 90]; // 13,500 points
export const GRID_SMALL = [100, 60]; // 6,000 points: narrow or low-core
export const FRAME_MS_DESKTOP = 1000 / 60;
export const FRAME_MS_SMALL = 1000 / 30;
