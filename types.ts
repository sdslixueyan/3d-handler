
export interface HandData {
  isFist: boolean;
  isOpen: boolean;
  rotation: number; // in radians
  depth: number;    // normalized depth (z)
  x: number;
  y: number;
  landmarks: any[];
}

export interface AppConfig {
  planetColor: string;
  ringColor: string;
}
