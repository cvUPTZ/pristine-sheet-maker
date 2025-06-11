
import { EventType } from '@/types';

export const EVENT_TYPES = [
  'pass', 'shot', 'tackle', 'foul', 'corner', 'offside', 'goal',
  'assist', 'yellowCard', 'redCard', 'substitution', 'card',
  'penalty', 'free-kick', 'goal-kick', 'throw-in', 'interception',
  'possession', 'ballLost', 'ballRecovered', 'dribble', 'cross',
  'clearance', 'block', 'save', 'ownGoal', 'freeKick', 'throwIn',
  'goalKick', 'aerialDuel', 'groundDuel', 'sub',
  'pressure', 'dribble_attempt', 'ball_recovery' // New event types
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
    events: ['substitution', 'offside', 'aerialDuel', 'groundDuel', 'sub']
  },
  'Advanced Actions': {
    description: 'Detailed gameplay actions',
    events: ['pressure', 'dribble_attempt', 'ball_recovery']
  }
} as const;

export const EVENT_TYPE_CATEGORIES = [
  {
    key: 'ballActions',
    label: 'Ball Actions',
    color: '#3B82F6',
    events: [
      { key: 'pass', label: 'Pass' },
      { key: 'shot', label: 'Shot' },
      { key: 'cross', label: 'Cross' },
      { key: 'dribble', label: 'Dribble' },
      { key: 'clearance', label: 'Clearance' },
      { key: 'block', label: 'Block' },
      { key: 'save', label: 'Save' },
      { key: 'interception', label: 'Interception' }
    ]
  },
  {
    key: 'setPieces',
    label: 'Set Pieces',
    color: '#10B981',
    events: [
      { key: 'corner', label: 'Corner' },
      { key: 'freeKick', label: 'Free Kick' },
      { key: 'penalty', label: 'Penalty' },
      { key: 'goalKick', label: 'Goal Kick' },
      { key: 'throwIn', label: 'Throw In' }
    ]
  },
  {
    key: 'foulsCards',
    label: 'Fouls & Cards',
    color: '#EF4444',
    events: [
      { key: 'foul', label: 'Foul' },
      { key: 'yellowCard', label: 'Yellow Card' },
      { key: 'redCard', label: 'Red Card' },
      { key: 'card', label: 'Card' }
    ]
  },
  {
    key: 'goalsAssists',
    label: 'Goals & Assists',
    color: '#F59E0B',
    events: [
      { key: 'goal', label: 'Goal' },
      { key: 'assist', label: 'Assist' },
      { key: 'ownGoal', label: 'Own Goal' }
    ]
  },
  {
    key: 'possession',
    label: 'Possession',
    color: '#8B5CF6',
    events: [
      { key: 'possession', label: 'Possession' },
      { key: 'ballLost', label: 'Ball Lost' },
      { key: 'ballRecovered', label: 'Ball Recovered' },
      { key: 'tackle', label: 'Tackle' }
    ]
  },
  {
    key: 'matchEvents',
    label: 'Match Events',
    color: '#6B7280',
    events: [
      { key: 'substitution', label: 'Substitution' },
      { key: 'sub', label: 'Sub' },
      { key: 'offside', label: 'Offside' },
      { key: 'aerialDuel', label: 'Aerial Duel' },
      { key: 'groundDuel', label: 'Ground Duel' }
    ]
  },
  {
    key: 'advancedActions',
    label: 'Advanced Actions',
    color: '#A0A0A0', // Example color
    events: [
      { key: 'pressure', label: 'Pressure' },
      { key: 'dribble_attempt', label: 'Dribble Attempt' },
      { key: 'ball_recovery', label: 'Ball Recovery' }
    ]
  }
];

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
  'q': 'groundDuel',
  'm': 'sub'
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
  'groundDuel': 'Ground Duel',
  'sub': 'Sub',
  'pressure': 'Pressure Applied',
  'dribble_attempt': 'Dribble Attempt',
  'ball_recovery': 'Ball Recovery',
  'supportPass': 'Support Pass',
  'offensivePass': 'Offensive Pass',
  'contact': 'Contact',
  '6MeterViolation': '6 Meter Violation',
  'postHit': 'Post Hit',
  'aerialDuelWon': 'Aerial Duel Won',
  'aerialDuelLost': 'Aerial Duel Lost',
  'decisivePass': 'Decisive Pass',
  'successfulCross': 'Successful Cross',
  'successfulDribble': 'Successful Dribble',
  'longPass': 'Long Pass',
  'forwardPass': 'Forward Pass',
  'backwardPass': 'Backward Pass',
  'lateralPass': 'Lateral Pass',
};

export const EVENT_STYLES: Record<EventType, { color: string; description: string; icon?: string }> = {
  'pass': { color: '#3B82F6', description: 'Pass between players', icon: '⚽' },
  'shot': { color: '#EF4444', description: 'Shot on goal', icon: '🎯' },
  'tackle': { color: '#F59E0B', description: 'Defensive tackle', icon: '⚔️' },
  'foul': { color: '#EF4444', description: 'Rule violation', icon: '⚠️' },
  'corner': { color: '#10B981', description: 'Corner kick', icon: '📐' },
  'offside': { color: '#F59E0B', description: 'Offside violation', icon: '🚩' },
  'goal': { color: '#10B981', description: 'Goal scored', icon: '⚽' },
  'assist': { color: '#8B5CF6', description: 'Goal assist', icon: '🎯' },
  'yellowCard': { color: '#F59E0B', description: 'Yellow card', icon: '🟨' },
  'redCard': { color: '#EF4444', description: 'Red card', icon: '🟥' },
  'substitution': { color: '#6B7280', description: 'Player substitution', icon: '🔄' },
  'card': { color: '#F59E0B', description: 'Card shown', icon: '🟨' },
  'penalty': { color: '#EF4444', description: 'Penalty kick', icon: '⚽' },
  'free-kick': { color: '#10B981', description: 'Free kick', icon: '⚽' },
  'goal-kick': { color: '#3B82F6', description: 'Goal kick', icon: '👢' },
  'throw-in': { color: '#6B7280', description: 'Throw in', icon: '🤾' },
  'interception': { color: '#8B5CF6', description: 'Ball interception', icon: '✋' },
  'possession': { color: '#3B82F6', description: 'Ball possession', icon: '⚽' },
  'ballLost': { color: '#EF4444', description: 'Ball lost', icon: '❌' },
  'ballRecovered': { color: '#10B981', description: 'Ball recovered', icon: '✅' },
  'dribble': { color: '#8B5CF6', description: 'Dribbling move', icon: '🏃' },
  'cross': { color: '#3B82F6', description: 'Cross into box', icon: '↗️' },
  'clearance': { color: '#F59E0B', description: 'Defensive clearance', icon: '🦶' },
  'block': { color: '#6B7280', description: 'Shot block', icon: '🛡️' },
  'save': { color: '#10B981', description: 'Goalkeeper save', icon: '🥅' },
  'ownGoal': { color: '#EF4444', description: 'Own goal', icon: '😬' },
  'freeKick': { color: '#10B981', description: 'Free kick', icon: '⚽' },
  'throwIn': { color: '#6B7280', description: 'Throw in', icon: '🤾' },
  'goalKick': { color: '#3B82F6', description: 'Goal kick', icon: '👢' },
  'aerialDuel': { color: '#8B5CF6', description: 'Aerial duel', icon: '🦅' },
  'groundDuel': { color: '#F59E0B', description: 'Ground duel', icon: '⚔️' },
  'sub': { color: '#6B7280', description: 'Substitution', icon: '🔄' },
  'pressure': { color: '#4ADE80', description: 'Defensive pressure action', icon: '💨' },
  'dribble_attempt': { color: '#2DD4BF', description: 'Attempt to dribble past opponent', icon: '⚡' },
  'ball_recovery': { color: '#A78BFA', description: 'Recovering a loose ball', icon: '🖐️' },
  'supportPass': { color: '#4A90E2', description: 'Supportive pass', icon: '🤝' },
  'offensivePass': { color: '#50E3C2', description: 'Offensive pass', icon: '🚀' },
  'contact': { color: '#F5A623', description: 'Player contact event', icon: '💥' },
  '6MeterViolation': { color: '#BD10E0', description: '6 Meter Violation', icon: '📏' },
  'postHit': { color: '#9013FE', description: 'Ball hit the post', icon: '🥅' },
  'aerialDuelWon': { color: '#417505', description: 'Aerial duel won', icon: '🏆' },
  'aerialDuelLost': { color: '#D0021B', description: 'Aerial duel lost', icon: '👎' },
  'decisivePass': { color: '#F8E71C', description: 'Decisive pass (e.g., key pass)', icon: '🔑' },
  'successfulCross': { color: '#7ED321', description: 'Successful cross', icon: '✅' },
  'successfulDribble': { color: '#E350A9', description: 'Successful dribble', icon: '🏃‍♂️💨' },
  'longPass': { color: '#0E8A9C', description: 'Long pass', icon: '📏➡️' },
  'forwardPass': { color: '#2CA02C', description: 'Forward pass', icon: '⬆️' },
  'backwardPass': { color: '#D32F2F', description: 'Backward pass', icon: '⬇️' },
  'lateralPass': { color: '#FF9800', description: 'Lateral pass', icon: '↔️' },
};

export type EventCategory = keyof typeof EVENT_CATEGORIES;
