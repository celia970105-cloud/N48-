export interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  tier?: 'basic' | 'intermediate' | 'expert';
  levelLabel?: string;
  stationName?: string;
}

export interface Passenger {
  id: number;
  name: string;
  avatar: string;
  type: 'kind' | 'ignoring_phone' | 'fake_sleeping';
  dialogue: string;
  isOfferedSeat: boolean;
}

export interface PlayerProfile {
  name: string;
  badgeStyle: 'pink_heart' | 'dino_egg' | 'watermelon';
  avatar: string;
}

export type GamePhase = 'welcome' | 'playing' | 'won' | 'lost';

export type GameMode = 'full_tour' | 'quick_challenge' | 'endless';

export interface SubwayItem {
  id: 'cracker' | 'plum' | 'shield' | 'socks';
  name: string;
  icon: string;
  count: number;
  desc: string;
}

export interface SeatDilemmaOutcome {
  choice: 'self' | 'elder' | 'collaborate' | 'timeout';
  title: string;
  story: string;
  moral: string;
  rewardText: string;
  badge: string;
  icon: string;
}
