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

export interface HelpfulNpcOption {
  title: string;
  description: string;
  icon: string;
  tag: string;
  effectType: 'heal_time' | 'shield' | 'eliminate_options' | 'restore_balance' | 'grand_seat';
}

export interface HelpfulNpcEvent {
  id: string;
  npcName: string;
  npcRole: string;
  avatar: string;
  quote: string;
  badgeText: string;
  options: HelpfulNpcOption[];
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
