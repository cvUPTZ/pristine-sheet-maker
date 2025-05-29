
import { EventType } from '@/types';

export const eventTypeConfig: Record<EventType, { color: string; description: string; icon?: string }> = {
  pass: { color: '#3B82F6', description: 'Pass' },
  shot: { color: '#EF4444', description: 'Shot' },
  tackle: { color: '#F59E0B', description: 'Tackle' },
  foul: { color: '#DC2626', description: 'Foul' },
  corner: { color: '#8B5CF6', description: 'Corner' },
  offside: { color: '#F97316', description: 'Offside' },
  goal: { color: '#10B981', description: 'Goal' },
  assist: { color: '#06B6D4', description: 'Assist' },
  yellowCard: { color: '#FBBF24', description: 'Yellow Card' },
  redCard: { color: '#DC2626', description: 'Red Card' },
  substitution: { color: '#6366F1', description: 'Substitution' },
  card: { color: '#FBBF24', description: 'Card' },
  penalty: { color: '#DC2626', description: 'Penalty' },
  'free-kick': { color: '#8B5CF6', description: 'Free Kick' },
  'goal-kick': { color: '#06B6D4', description: 'Goal Kick' },
  'throw-in': { color: '#10B981', description: 'Throw In' },
  interception: { color: '#F59E0B', description: 'Interception' },
  possession: { color: '#3B82F6', description: 'Possession' }
};
