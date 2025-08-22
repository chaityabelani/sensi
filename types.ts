
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
}
