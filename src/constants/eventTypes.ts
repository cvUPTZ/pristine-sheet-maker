
import { EventType } from '@/types';

export const EVENT_TYPES: Record<EventType, string> = {
  pass: 'Pass',
  shot: 'Shot',
  tackle: 'Tackle',
  foul: 'Foul',
  corner: 'Corner',
  offside: 'Offside',
  goal: 'Goal',
  assist: 'Assist',
  yellowCard: 'Yellow Card',
  redCard: 'Red Card',
  substitution: 'Substitution',
  card: 'Card',
  penalty: 'Penalty',
  'free-kick': 'Free Kick',
  'goal-kick': 'Goal Kick',
  'throw-in': 'Throw In',
  interception: 'Interception'
};

export const KEYBOARD_MAPPINGS: Record<EventType, string> = {
  pass: 'P',
  shot: 'S',
  tackle: 'T',
  foul: 'F',
  corner: 'C',
  offside: 'O',
  goal: 'G',
  assist: 'A',
  yellowCard: 'Y',
  redCard: 'R',
  substitution: 'U',
  card: 'K',
  penalty: 'E',
  'free-kick': 'Q',
  'goal-kick': 'L',
  'throw-in': 'H',
  interception: 'I'
};
