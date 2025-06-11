import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { AnalysisStats } from '../AnalysisStats'; // Adjust path as necessary
import { TaggedEvent } from '@/types/events'; // Assuming global path alias

// Mock Recharts components
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children, data }: { children: React.ReactNode, data: any[] }) => <div data-testid="bar-chart" data-chartdata={JSON.stringify(data)}>{children}</div>,
    Bar: ({ dataKey, fill }: { dataKey: string, fill: string }) => <div data-testid={`bar-${dataKey}`} data-fill={fill}>Bar-{dataKey}</div>,
    XAxis: ({ dataKey }: { dataKey: string }) => <div data-testid="x-axis" data-datakey={dataKey}>XAxis-{dataKey}</div>,
    YAxis: ({ allowDecimals }: { allowDecimals: boolean}) => <div data-testid="y-axis" data-allowdecimals={allowDecimals.toString()}>YAxis</div>,
    Tooltip: () => <div data-testid="tooltip">Tooltip</div>,
    Legend: () => <div data-testid="legend">Legend</div>,
    CartesianGrid: () => <div data-testid="cartesian-grid">CartesianGrid</div>,
  };
});

const mockTaggedEvents: TaggedEvent[] = [
  {
    id: 'te1', video_job_id: 'job1', event_type_id: 'et1', timestamp: 120, created_at: '', updated_at: '',
    event_types: { id: 'et1', user_id: 'user1', name: 'Goal', color: '#00FF00', created_at: '', updated_at: '' }
  },
  {
    id: 'te2', video_job_id: 'job1', event_type_id: 'et2', timestamp: 300, created_at: '', updated_at: '',
    event_types: { id: 'et2', user_id: 'user1', name: 'Foul', color: '#FF0000', created_at: '', updated_at: '' }
  },
  {
    id: 'te3', video_job_id: 'job1', event_type_id: 'et1', timestamp: 700, created_at: '', updated_at: '', // 11.6 min
    event_types: { id: 'et1', user_id: 'user1', name: 'Goal', color: '#00FF00', created_at: '', updated_at: '' }
  },
  {
    id: 'te4', video_job_id: 'job1', event_type_id: 'et3', timestamp: 10, created_at: '', updated_at: '',
    event_types: { id: 'et3', user_id: 'user1', name: 'Corner', color: '#0000FF', created_at: '', updated_at: '' }
  },
];

const videoDuration = 1200; // 20 minutes

describe('AnalysisStats', () => {
  describe('Event Counts Table', () => {
    it('should display "no data" message when no tagged events are provided', () => {
      render(<AnalysisStats taggedEvents={[]} videoDuration={videoDuration} />);
      expect(screen.getByText(/No tagged events to generate statistics yet/i)).toBeInTheDocument();
    });

    it('should correctly calculate and display event counts', () => {
      render(<AnalysisStats taggedEvents={mockTaggedEvents} videoDuration={videoDuration} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check for Goal
      const goalRow = within(table).getByText('Goal').closest('tr');
      expect(within(goalRow!).getByText('2')).toBeInTheDocument(); // Count for Goal
      const goalColorSwatch = goalRow!.querySelector('td:first-child div');
      expect(goalColorSwatch).toHaveStyle('background-color: #00FF00');


      // Check for Foul
      const foulRow = within(table).getByText('Foul').closest('tr');
      expect(within(foulRow!).getByText('1')).toBeInTheDocument(); // Count for Foul
      const foulColorSwatch = foulRow!.querySelector('td:first-child div');
      expect(foulColorSwatch).toHaveStyle('background-color: #FF0000');

      // Check for Corner
      const cornerRow = within(table).getByText('Corner').closest('tr');
      expect(within(cornerRow!).getByText('1')).toBeInTheDocument(); // Count for Corner
      const cornerColorSwatch = cornerRow!.querySelector('td:first-child div');
      expect(cornerColorSwatch).toHaveStyle('background-color: #0000FF');
    });
  });

  describe('Event Distribution Chart', () => {
    it('should render the chart section when data is available', () => {
      render(<AnalysisStats taggedEvents={mockTaggedEvents} videoDuration={videoDuration} />);
      expect(screen.getByText(/Event Distribution Over Time/i)).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should render XAxis, YAxis, Tooltip, Legend, and CartesianGrid', () => {
      render(<AnalysisStats taggedEvents={mockTaggedEvents} videoDuration={videoDuration} />);
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('should render Bars for each event type with correct dataKeys and fills', () => {
      render(<AnalysisStats taggedEvents={mockTaggedEvents} videoDuration={videoDuration} />);

      const goalBar = screen.getByTestId('bar-Goal');
      expect(goalBar).toBeInTheDocument();
      expect(goalBar).toHaveAttribute('data-fill', '#00FF00');

      const foulBar = screen.getByTestId('bar-Foul');
      expect(foulBar).toBeInTheDocument();
      expect(foulBar).toHaveAttribute('data-fill', '#FF0000');

      const cornerBar = screen.getByTestId('bar-Corner');
      expect(cornerBar).toBeInTheDocument();
      expect(cornerBar).toHaveAttribute('data-fill', '#0000FF');
    });

    it('should pass correct data to BarChart for distribution', () => {
      // Interval length for 1200s video (aiming for up to 12 intervals, min 60s)
      // intervalLengthSec = Math.max(60, Math.ceil(1200 / 12)) = Math.max(60, 100) = 100 seconds.
      // numIntervals = Math.ceil(1200 / 100) = 12 intervals.
      // Interval names: 0-1m, 1-3m, 3-5m ... (approx based on floor(seconds/60))
      // Goal (120s = 2m) -> intervalIndex = floor(120/100) = 1. Interval "1-3m" (approx)
      // Foul (300s = 5m) -> intervalIndex = floor(300/100) = 3. Interval "5-6m" (approx)
      // Goal (700s = 11.6m) -> intervalIndex = floor(700/100) = 7. Interval "11-13m" (approx)
      // Corner (10s = 0.1m) -> intervalIndex = floor(10/100) = 0. Interval "0-1m" (approx)

      render(<AnalysisStats taggedEvents={mockTaggedEvents} videoDuration={videoDuration} />);
      const barChartElement = screen.getByTestId('bar-chart');
      const chartData = JSON.parse(barChartElement.getAttribute('data-chartdata') || '[]');

      expect(chartData.length).toBe(12); // 1200s / 100s/interval = 12 intervals

      // Check interval names based on the actual logic in AnalysisStats
      // intervalName = `${Math.floor((i * 100) / 60)}m - ${Math.floor(((i + 1) * 100) / 60)}m`
      // i=0: 0m - 1m
      // i=1: 1m - 3m
      // i=3: 5m - 6m
      // i=7: 11m - 13m

      expect(chartData[0].intervalName).toBe('0m - 1m');
      expect(chartData[0].Corner).toBe(1);
      expect(chartData[0].Goal).toBe(0);

      expect(chartData[1].intervalName).toBe('1m - 3m');
      expect(chartData[1].Goal).toBe(1);
      expect(chartData[1].Corner).toBe(0);

      expect(chartData[3].intervalName).toBe('5m - 6m'); // 300s / 100s_per_interval = index 3. 3*100/60 = 5. 4*100/60 = 6.66 -> 6
      expect(chartData[3].Foul).toBe(1);

      expect(chartData[7].intervalName).toBe('11m - 13m'); // 700s / 100s_per_interval = index 7. 7*100/60 = 11.66 -> 11. 8*100/60 = 13.33 -> 13
      expect(chartData[7].Goal).toBe(1);
    });
  });
});
