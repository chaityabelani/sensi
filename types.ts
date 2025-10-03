
import type { ReactNode } from 'react';

export interface Game {
  id: string;
  name: string;
  logo: ReactNode;
}

export enum AppStage {
  SELECT_GAME = 'SELECT_GAME',
  RECORD_GAME = 'RECORD_GAME',
  ANALYZING = 'ANALYZING',
  SHOW_ANALYSIS = 'SHOW_ANALYSIS',
  PRACTICE_MODE = 'PRACTICE_MODE',
}

// New types for visual analysis
export interface CrosshairPosition {
  x: number;
  y: number;
}

export interface EnemyBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualDataPoint {
  frame_index: number;
  crosshair: CrosshairPosition | null;
  enemies: EnemyBoundingBox[];
}

export interface AnalysisResponse {
  analysis: string;
  visual_data: VisualDataPoint[];
}
