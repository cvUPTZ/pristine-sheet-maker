
// src/constants/eventTypes.ts
// Assuming EventType is defined in @/types like:
/*
export type EventType =
  | 'pass'
  | 'shot'
  | 'tackle'
  | 'foul'
  | 'corner'
  | 'offside'
  | 'goal'
  | 'assist'
  | 'yellowCard'
  | 'redCard'
  | 'substitution'
  | 'card'
  | 'penalty'
  | 'free-kick' // or 'freeKick' if you only use camelCase
  | 'goal-kick' // or 'goalKick'
  | 'throw-in'  // or 'throwIn'
  | 'interception'
  | 'possession'
  | 'ballLost'
  | 'ballRecovered'
  | 'dribble'
  | 'cross'
  | 'clearance'
  | 'block'
  | 'save'
  | 'ownGoal'
  | 'aerialDuel'
  | 'groundDuel';
// Make sure your EventType definition includes all keys used below.
*/
import { EventType } from '@/types'; // Make sure this path and type are correct

// Renamed from eventTypeLabels to EVENT_TYPES
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
  interception: 'Interception',
  possession: 'Possession',
  ballLost: 'Ball Lost',
  ballRecovered: 'Ball Recovered',
  dribble: 'Dribble',
  cross: 'Cross',
  clearance: 'Clearance',
  block: 'Block',
  save: 'Save',
  ownGoal: 'Own Goal',
  // Ensure EventType definition includes these if they are distinct from hyphenated versions
  // If your EventType uses camelCase for these, the keys here should also be camelCase.
  // For example, if EventType is 'freeKick', then the key here should be 'freeKick'.
  // The example PianoInput uses hyphenated keys for some, so I'm keeping them for consistency.
  // If you have both (e.g. 'free-kick' and 'freeKick' in your EventType), ensure mappings for both if needed.
  freeKick: 'Free Kick', // (If 'freeKick' is a separate EventType from 'free-kick')
  throwIn: 'Throw In',   // (If 'throwIn' is a separate EventType from 'throw-in')
  goalKick: 'Goal Kick', // (If 'goalKick' is a separate EventType from 'goal-kick')
  aerialDuel: 'Aerial Duel',
  groundDuel: 'Ground Duel'
};

export const eventTypeDescriptions: Record<EventType, string> = {
  pass: 'A successful pass between players',
  shot: 'An attempt at goal',
  tackle: 'A defensive action to win the ball',
  foul: 'A rule violation',
  corner: 'A corner kick',
  offside: 'An offside offense',
  goal: 'A goal scored',
  assist: 'An assist for a goal',
  yellowCard: 'A yellow card shown',
  redCard: 'A red card shown',
  substitution: 'A player substitution',
  card: 'A card shown to a player',
  penalty: 'A penalty kick',
  'free-kick': 'A free kick awarded',
  'goal-kick': 'A goal kick',
  'throw-in': 'A throw in',
  interception: 'Ball intercepted',
  possession: 'Ball possession',
  ballLost: 'Ball lost',
  ballRecovered: 'Ball recovered',
  dribble: 'Dribbling action',
  cross: 'Cross into the box',
  clearance: 'Defensive clearance',
  block: 'Shot blocked',
  save: 'Goalkeeper save',
  ownGoal: 'Own goal scored',
  freeKick: 'Free kick',
  throwIn: 'Throw in',
  goalKick: 'Goal kick',
  aerialDuel: 'Aerial duel',
  groundDuel: 'Ground duel'
};

// Added KEYBOARD_MAPPINGS export
// Ensure the keys (EventType) match those in EVENT_TYPES and your actual EventType definition
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
  substitution: 'U', // (sUbstitution)
  card: 'X', // (arbitrary, choose meaningful ones)
  penalty: 'E', // (pEnalty)
  'free-kick': 'K',
  'goal-kick': 'L',
  'throw-in': 'I',
  interception: 'N',
  possession: 'V', // (possession)
  ballLost: 'B',
  ballRecovered: 'D', // (recovereD)
  dribble: 'M', // (dribble)
  cross: 'W', // (cross)
  clearance: 'J', // (clearance)
  block: 'Q', // (block)
  save: 'Z', // (save)
  ownGoal: '1', // (example, might not need a shortcut)
  // Add mappings for any other EventTypes like freeKick (camelCase), throwIn, goalKick, aerialDuel, groundDuel if they are distinct types
  // For example:
  // freeKick: 'F', // (if EventType has 'freeKick' and it's different from 'free-kick')
  // throwIn: 'H',
  // goalKick: 'J',
  aerialDuel: '2',
  groundDuel: '3'
};

// You may also want to export the EventType itself from here or ensure it's correctly imported
// from @/types if that's where it's defined.