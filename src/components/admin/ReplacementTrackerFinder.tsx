
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, User, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AvailableTracker {
  id: string;
  email: string;
  lastSeen?: number;
  batteryLevel?: number;
}

interface ReplacementTrackerFinderProps {
  absentTrackerId: string;
  availableTrackers: AvailableTracker[];
  onAssignReplacement: (absentId: string, replacementId: string) => void;
  isLoading: boolean;
}

const ReplacementTrackerFinder: React.FC<ReplacementTrackerFinderProps> = ({
  absentTrackerId,
  availableTrackers,
  onAssignReplacement,
  isLoading
}) => {
  const [selectedReplacement, setSelectedReplacement] = useState<string>('');

  const getTrackerScore = (tracker: AvailableTracker): number => {
    let score = 100;
    
    // Deduct points for old last seen time
    if (tracker.lastSeen) {
      const minutesAgo = (Date.now() - tracker.lastSeen) / 60000;
      score -= Math.min(minutesAgo * 2, 50); // Max 50 point deduction
    }
    
    // Deduct points for low battery
    if (tracker.batteryLevel) {
      if (tracker.batteryLevel < 20) score -= 30;
      else if (tracker.batteryLevel < 50) score -= 15;
    }
    
    return Math.max(0, Math.round(score));
  };

  const sortedTrackers = availableTrackers
    .map(tracker => ({ ...tracker, score: getTrackerScore(tracker) }))
    .sort((a, b) => b.score - a.score);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Search className="h-5 w-5" />
          Find Replacement for Tracker {absentTrackerId.slice(-4)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedTrackers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No available replacement trackers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-blue-700 mb-4">
              Found {sortedTrackers.length} available tracker(s). Select the best replacement:
            </p>
            
            <AnimatePresence>
              {sortedTrackers.map((tracker, index) => (
                <motion.div
                  key={tracker.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedReplacement === tracker.id
                      ? 'border-blue-500 bg-blue-100'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedReplacement(tracker.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        selectedReplacement === tracker.id ? 'bg-blue-500' : 'bg-gray-400'
                      }`}>
                        {selectedReplacement === tracker.id ? (
                          <CheckCircle className="h-4 w-4 text-white" />
                        ) : (
                          <User className="h-4 w-4 text-white" />
                        )}
                      </div>
                      
                      <div>
                        <div className="font-medium text-gray-800">
                          {tracker.email.split('@')[0]} ({tracker.id.slice(-4)})
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          {tracker.batteryLevel && (
                            <span>Battery: {tracker.batteryLevel}%</span>
                          )}
                          {tracker.lastSeen && (
                            <span>Last seen: {Math.floor((Date.now() - tracker.lastSeen) / 60000)}m ago</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Badge className={`${getScoreColor(tracker.score)} border-0`}>
                      Score: {tracker.score}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {selectedReplacement && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 border-t border-blue-200"
              >
                <Button
                  onClick={() => onAssignReplacement(absentTrackerId, selectedReplacement)}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? 'Assigning...' : 'Assign Replacement'}
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReplacementTrackerFinder;
