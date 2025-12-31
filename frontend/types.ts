
export enum TimeView {
  HISTORY = 'history',
  TODAY = 'today',
  FUTURE2 = 'future2',
  LATER = 'later'
}

export interface Task {
  id: string;
  text: string;
  details?: string;
  createdAt: number;
  startDate?: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD (截止日期)
  timeframe: TimeView;
  selected: boolean;
  archived: boolean;
}

export type InputMode = 'none' | 'text' | 'voice';
export type AppView = 'active' | 'archived' | 'calendar';
