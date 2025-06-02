import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Play, Pause, Square, RotateCcw, FileText, Timer, Clock } from 'lucide-react';

interface MatchTimerControlProps {
  matchId: string;
  onTimerStateChange?: (state: 'running' | 'paused' | 'stopped', currentTime: number) => void;
  onMatchEnd?: () => void;
}

interface TimerState {
  status: 'stopped' | 'running' | 'paused';
  currentValue: number;
  lastStartedAt: string | null;
  period: 'first_half' | 'second_half' | 'extra_time' | 'penalties';
  addedTime: number;
}

const MatchTimerControl: React.FC<MatchTimerControlProps> = ({
  matchId,
  onTimerStateChange,
  onMatchEnd
}) => {
  const [timerState, setTimerState] = useState<TimerState>({
    status: 'stopped',
    currentValue: 0,
    lastStartedAt: null,
    period: 'first_half',
    addedTime: 0
  });
  const [displayTime, setDisplayTime] = useState(0);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch initial timer state from database
  useEffect(() => {
    const fetchTimerState = async () => {
      try {
        console.log('Fetching timer state for match:', matchId);
        const { data: matchData, error } = await supabase
          .from('matches')
          .select('timer_status, timer_current_value, timer_last_started_at')
          .eq('id', matchId)
          .single();

        if (error) {
          console.error('Error fetching timer state:', error);
          throw error;
        }

        console.log('Fetched timer data:', matchData);

        if (matchData) {
          setTimerState({
            status: (matchData.timer_status as 'stopped' | 'running' | 'paused') || 'stopped',
            currentValue: matchData.timer_current_value || 0,
            lastStartedAt: matchData.timer_last_started_at,
            period: 'first_half', // Default since column doesn't exist yet
            addedTime: 0 // Default since column doesn't exist yet
          });
        }
      } catch (error: any) {
        console.error('Error fetching timer state:', error);
        toast({
          title: 'Error Loading Timer',
          description: error.message,
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      fetchTimerState();
    }
  }, [matchId, toast]);

  // Real-time timer update
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (timerState.status === 'running' && timerState.lastStartedAt) {
      const startTime = new Date(timerState.lastStartedAt).getTime();
      
      const updateDisplayTime = () => {
        const elapsedSinceLastStart = (Date.now() - startTime) / 1000;
        const newTime = timerState.currentValue + elapsedSinceLastStart;
        setDisplayTime(newTime);
        
        // Auto-pause at 45 minutes for first half and 90 minutes for second half
        const periodLimit = timerState.period === 'first_half' ? 45 * 60 : 90 * 60;
        if (newTime >= periodLimit + timerState.addedTime) {
          handlePeriodEnd();
        }
      };
      
      updateDisplayTime();
      intervalId = setInterval(updateDisplayTime, 1000);
    } else {
      setDisplayTime(timerState.currentValue);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timerState.status, timerState.currentValue, timerState.lastStartedAt, timerState.period, timerState.addedTime]);

  const updateTimerInDB = async (updates: Partial<TimerState>) => {
    try {
      console.log('Updating timer in DB:', updates);
      const { error } = await supabase
        .from('matches')
        .update({
          timer_status: updates.status || timerState.status,
          timer_current_value: updates.currentValue !== undefined ? updates.currentValue : timerState.currentValue,
          timer_last_started_at: updates.lastStartedAt !== undefined ? updates.lastStartedAt : timerState.lastStartedAt
        })
        .eq('id', matchId);

      if (error) throw error;

      // Update local state
      setTimerState(prev => ({ ...prev, ...updates }));
      
      // Notify parent component
      if (onTimerStateChange) {
        onTimerStateChange(
          updates.status || timerState.status,
          updates.currentValue !== undefined ? updates.currentValue : timerState.currentValue
        );
      }

    } catch (error: any) {
      console.error('Error updating timer:', error);
      toast({
        title: 'Timer Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleStart = async () => {
    await updateTimerInDB({
      status: 'running',
      lastStartedAt: new Date().toISOString()
    });

    // Update match status to 'live' when timer starts
    await supabase
      .from('matches')
      .update({ status: 'live' })
      .eq('id', matchId);

    toast({
      title: 'Match Timer Started',
      description: `${timerState.period.replace('_', ' ').toUpperCase()} period started`
    });
  };

  const handlePause = async () => {
    const currentTime = displayTime;
    await updateTimerInDB({
      status: 'paused',
      currentValue: currentTime,
      lastStartedAt: null
    });

    toast({
      title: 'Match Timer Paused',
      description: `Timer paused at ${formatTime(currentTime)}`
    });
  };

  const handleStop = async () => {
    await updateTimerInDB({
      status: 'stopped',
      currentValue: 0,
      lastStartedAt: null
    });

    // Update match status to 'completed'
    await supabase
      .from('matches')
      .update({ status: 'completed' })
      .eq('id', matchId);

    toast({
      title: 'Match Ended',
      description: 'Timer stopped and match completed'
    });

    if (onMatchEnd) {
      onMatchEnd();
    }
  };

  const handleReset = async () => {
    await updateTimerInDB({
      status: 'stopped',
      currentValue: 0,
      lastStartedAt: null,
      period: 'first_half',
      addedTime: 0
    });

    toast({
      title: 'Timer Reset',
      description: 'Timer reset to 00:00'
    });
  };

  const handlePeriodEnd = async () => {
    if (timerState.period === 'first_half') {
      // Switch to second half
      await updateTimerInDB({
        status: 'paused',
        period: 'second_half',
        currentValue: 45 * 60, // Start second half at 45:00
        lastStartedAt: null
      });
      
      toast({
        title: 'Half Time',
        description: 'First half ended. Ready for second half.'
      });
    } else if (timerState.period === 'second_half') {
      // Match ended
      await handleStop();
      await generateMatchReport();
    }
  };

  const addTime = async (minutes: number) => {
    const newAddedTime = timerState.addedTime + (minutes * 60);
    await updateTimerInDB({
      addedTime: newAddedTime
    });

    toast({
      title: 'Added Time',
      description: `${minutes} minutes added to the period`
    });
  };

  const generateMatchReport = async () => {
    setIsGeneratingReport(true);
    
    try {
      // Fetch match data and events
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          match_events (*),
          match_tracker_assignments (*)
        `)
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      // Generate PDF report (simplified version - you can enhance this)
      const reportData = {
        match: matchData,
        events: matchData.match_events || [],
        assignments: matchData.match_tracker_assignments || [],
        finalTime: formatTime(displayTime),
        period: timerState.period,
        generatedAt: new Date().toISOString()
      };

      // Create a simple HTML report that can be converted to PDF
      const reportHTML = generateReportHTML(reportData);
      
      // Open in new window for printing/saving as PDF
      const reportWindow = window.open('', '_blank');
      if (reportWindow) {
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
        reportWindow.print();
      }

      toast({
        title: 'Match Report Generated',
        description: 'PDF report has been generated and opened for download'
      });

    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: 'Report Generation Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const generateReportHTML = (data: any) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Match Report - ${data.match.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 20px; }
          .event { padding: 10px; border-bottom: 1px solid #eee; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Match Report</h1>
          <h2>${data.match.name || `${data.match.home_team_name} vs ${data.match.away_team_name}`}</h2>
          <p>Final Time: ${data.finalTime} | Period: ${data.period.replace('_', ' ').toUpperCase()}</p>
          <p>Generated: ${new Date(data.generatedAt).toLocaleString()}</p>
        </div>
        
        <div class="section">
          <h3>Match Summary</h3>
          <table>
            <tr><th>Home Team</th><td>${data.match.home_team_name}</td></tr>
            <tr><th>Away Team</th><td>${data.match.away_team_name}</td></tr>
            <tr><th>Date</th><td>${new Date(data.match.match_date).toLocaleDateString()}</td></tr>
            <tr><th>Duration</th><td>${data.finalTime}</td></tr>
            <tr><th>Total Events</th><td>${data.events.length}</td></tr>
          </table>
        </div>

        <div class="section">
          <h3>Match Events (${data.events.length})</h3>
          ${data.events.map((event: any) => `
            <div class="event">
              <strong>${event.event_type}</strong> - 
              Player ${event.player_id} (Team: ${event.team_id}) - 
              ${new Date(event.timestamp).toLocaleTimeString()}
            </div>
          `).join('')}
        </div>

        <div class="section">
          <h3>Tracker Assignments</h3>
          <table>
            <tr><th>Tracker</th><th>Assignment Type</th><th>Status</th></tr>
            ${data.assignments.map((assignment: any) => `
              <tr>
                <td>${assignment.tracker_user_id}</td>
                <td>${assignment.assignment_type}</td>
                <td>${assignment.status}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </body>
      </html>
    `;
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPeriodDisplay = () => {
    switch (timerState.period) {
      case 'first_half': return 'First Half';
      case 'second_half': return 'Second Half';
      case 'extra_time': return 'Extra Time';
      case 'penalties': return 'Penalties';
      default: return 'Match';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading timer...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Match Timer Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="text-center space-y-2">
          <div className="text-6xl font-mono font-bold bg-black/5 dark:bg-white/10 rounded-lg p-4">
            {formatTime(displayTime)}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant={timerState.status === 'running' ? 'default' : 'secondary'}>
              {timerState.status.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {getPeriodDisplay()}
            </Badge>
            {timerState.addedTime > 0 && (
              <Badge variant="secondary">
                +{Math.floor(timerState.addedTime / 60)}min
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Control Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            onClick={handleStart}
            disabled={timerState.status === 'running'}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Start
          </Button>
          
          <Button
            onClick={handlePause}
            disabled={timerState.status !== 'running'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Pause className="h-4 w-4" />
            Pause
          </Button>
          
          <Button
            onClick={handleStop}
            disabled={timerState.status === 'stopped'}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop
          </Button>
          
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <Separator />

        {/* Added Time Controls */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Added Time
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => addTime(1)}
              variant="outline"
              size="sm"
            >
              +1 min
            </Button>
            <Button
              onClick={() => addTime(3)}
              variant="outline"
              size="sm"
            >
              +3 min
            </Button>
            <Button
              onClick={() => addTime(5)}
              variant="outline"
              size="sm"
            >
              +5 min
            </Button>
          </div>
        </div>

        <Separator />

        {/* Report Generation */}
        <Button
          onClick={generateMatchReport}
          disabled={isGeneratingReport || timerState.status === 'running'}
          className="w-full flex items-center gap-2"
          variant="outline"
        >
          <FileText className="h-4 w-4" />
          {isGeneratingReport ? 'Generating Report...' : 'Generate Match Report'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MatchTimerControl;
