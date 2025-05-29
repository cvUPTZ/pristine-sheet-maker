
import { EventType } from '@/types';

export const EVENT_TYPES = [
  'pass', 'shot', 'tackle', 'foul', 'corner', 'offside', 'goal',
  'assist', 'yellowCard', 'redCard', 'substitution', 'card',
  'penalty', 'free-kick', 'goal-kick', 'throw-in', 'interception',
  'possession', 'ballLost', 'ballRecovered', 'dribble', 'cross',
  'clearance', 'block', 'save', 'ownGoal', 'freeKick', 'throwIn',
  'goalKick', 'aerialDuel', 'groundDuel'
] as const;

export const EVENT_CATEGORIES = {
  'Ball Actions': {
    description: 'Events related to ball movement and possession',
    events: ['pass', 'shot', 'cross', 'dribble', 'clearance', 'block', 'save', 'interception']
  },
  'Set Pieces': {
    description: 'Fixed situations and restarts',
    events: ['corner', 'free-kick', 'penalty', 'goal-kick', 'throw-in', 'freeKick', 'throwIn', 'goalKick']
  },
  'Fouls & Cards': {
    description: 'Disciplinary actions and violations',
    events: ['foul', 'yellowCard', 'redCard', 'card']
  },
  'Goals & Assists': {
    description: 'Scoring and goal-related events',
    events: ['goal', 'assist', 'ownGoal']
  },
  'Possession': {
    description: 'Ball control and possession changes',
    events: ['possession', 'ballLost', 'ballRecovered', 'tackle']
  },
  'Match Events': {
    description: 'General match occurrences',
    events: ['substitution', 'offside', 'aerialDuel', 'groundDuel']
  }
} as const;

export const KEYBOARD_MAPPINGS: Record<string, EventType> = {
  'p': 'pass',
  's': 'shot', 
  't': 'tackle',
  'f': 'foul',
  'c': 'corner',
  'o': 'offside',
  'g': 'goal',
  'a': 'assist',
  'y': 'yellowCard',
  'r': 'redCard',
  'u': 'substitution',
  'n': 'penalty',
  'k': 'freeKick',
  'h': 'throwIn',
  'l': 'goalKick',
  'i': 'interception',
  'x': 'cross',
  'd': 'dribble',
  'b': 'block',
  'v': 'save',
  'w': 'ownGoal',
  'e': 'aerialDuel',
  'q': 'groundDuel'
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  'pass': 'Pass',
  'shot': 'Shot',
  'tackle': 'Tackle', 
  'foul': 'Foul',
  'corner': 'Corner',
  'offside': 'Offside',
  'goal': 'Goal',
  'assist': 'Assist',
  'yellowCard': 'Yellow Card',
  'redCard': 'Red Card',
  'substitution': 'Substitution',
  'card': 'Card',
  'penalty': 'Penalty',
  'free-kick': 'Free Kick',
  'goal-kick': 'Goal Kick',
  'throw-in': 'Throw In',
  'interception': 'Interception',
  'possession': 'Possession',
  'ballLost': 'Ball Lost',
  'ballRecovered': 'Ball Recovered',
  'dribble': 'Dribble',
  'cross': 'Cross',
  'clearance': 'Clearance',
  'block': 'Block',
  'save': 'Save',
  'ownGoal': 'Own Goal',
  'freeKick': 'Free Kick',
  'throwIn': 'Throw In',
  'goalKick': 'Goal Kick',
  'aerialDuel': 'Aerial Duel',
  'groundDuel': 'Ground Duel'
};

export type EventCategory = keyof typeof EVENT_CATEGORIES;
