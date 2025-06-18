
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Camera, Play, Pause, RotateCcw } from 'lucide-react';

interface CameraMovement {
  timestamp: number;
  x: number;
  y: number;
  z: number;
  confidence: number;
  movementType: 'pan' | 'tilt' | 'zoom' | 'static';
}

interface CameraMovementEstimatorProps {
  videoElement: HTMLVideoElement | null;
  isAnalyzing: boolean;
  onMovementDetected: (movement: CameraMovement) => void;
}

export const CameraMovementEstimator: React.FC<CameraMovementEstimatorProps> = ({
  videoElement,
  isAnalyzing,
  onMovementDetected
}) => {
  const [movements, setMovements] = useState<CameraMovement[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [previousFrame, setPreviousFrame] = useState<ImageData | null>(null);

  useEffect(() => {
    const canvasElement = document.createElement('canvas');
    const ctx = canvasElement.getContext('2d');
    setCanvas(canvasElement);
    setContext(ctx);
  }, []);

  const estimateMovement = (currentFrame: ImageData, prevFrame: ImageData): CameraMovement => {
    // Simple optical flow estimation
    const width = currentFrame.width;
    const height = currentFrame.height;
    
    let totalDx = 0;
    let totalDy = 0;
    let samples = 0;
    
    // Sample points across the image
    const sampleSize = 20;
    for (let y = sampleSize; y < height - sampleSize; y += sampleSize) {
      for (let x = sampleSize; x < width - sampleSize; x += sampleSize) {
        const currentIdx = (y * width + x) * 4;
        const currentGray = (
          currentFrame.data[currentIdx] +
          currentFrame.data[currentIdx + 1] +
          currentFrame.data[currentIdx + 2]
        ) / 3;
        
        // Find best match in previous frame (simple block matching)
        let bestMatch = { dx: 0, dy: 0, error: Infinity };
        
        for (let dy = -10; dy <= 10; dy += 2) {
          for (let dx = -10; dx <= 10; dx += 2) {
            const newY = y + dy;
            const newX = x + dx;
            
            if (newY >= 0 && newY < height && newX >= 0 && newX < width) {
              const prevIdx = (newY * width + newX) * 4;
              const prevGray = (
                prevFrame.data[prevIdx] +
                prevFrame.data[prevIdx + 1] +
                prevFrame.data[prevIdx + 2]
              ) / 3;
              
              const error = Math.abs(currentGray - prevGray);
              if (error < bestMatch.error) {
                bestMatch = { dx, dy, error };
              }
            }
          }
        }
        
        if (bestMatch.error < 50) { // Threshold for valid matches
          totalDx += bestMatch.dx;
          totalDy += bestMatch.dy;
          samples++;
        }
      }
    }
    
    if (samples === 0) {
      return {
        timestamp: videoElement?.currentTime || 0,
        x: 0,
        y: 0,
        z: 0,
        confidence: 0,
        movementType: 'static'
      };
    }
    
    const avgDx = totalDx / samples;
    const avgDy = totalDy / samples;
    const magnitude = Math.sqrt(avgDx * avgDx + avgDy * avgDy);
    
    // Estimate zoom by analyzing average intensity changes
    let intensityChange = 0;
    for (let i = 0; i < Math.min(currentFrame.data.length, prevFrame.data.length); i += 4) {
      const currentIntensity = (currentFrame.data[i] + currentFrame.data[i + 1] + currentFrame.data[i + 2]) / 3;
      const prevIntensity = (prevFrame.data[i] + prevFrame.data[i + 1] + prevFrame.data[i + 2]) / 3;
      intensityChange += Math.abs(currentIntensity - prevIntensity);
    }
    intensityChange /= (currentFrame.data.length / 4);
    
    // Determine movement type
    let movementType: CameraMovement['movementType'] = 'static';
    if (magnitude > 2) {
      if (Math.abs(avgDx) > Math.abs(avgDy)) {
        movementType = 'pan';
      } else {
        movementType = 'tilt';
      }
    } else if (intensityChange > 10) {
      movementType = 'zoom';
    }
    
    const confidence = Math.min(magnitude / 10, 1);
    
    return {
      timestamp: videoElement?.currentTime || 0,
      x: avgDx,
      y: avgDy,
      z: intensityChange > 10 ? (intensityChange > 20 ? 1 : -1) : 0,
      confidence,
      movementType
    };
  };

  const processFrame = () => {
    if (!videoElement || !canvas || !context || !isAnalyzing) return;
    
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    context.drawImage(videoElement, 0, 0);
    const currentFrame = context.getImageData(0, 0, canvas.width, canvas.height);
    
    if (previousFrame && previousFrame.width === currentFrame.width) {
      const movement = estimateMovement(currentFrame, previousFrame);
      
      if (movement.confidence > 0.1) {
        setMovements(prev => [...prev.slice(-10), movement]); // Keep last 10 movements
        onMovementDetected(movement);
      }
    }
    
    setPreviousFrame(currentFrame);
    setProgress(prev => (prev + 1) % 100);
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isAnalyzing && videoElement) {
      intervalId = setInterval(processFrame, 100); // Process every 100ms
      setIsProcessing(true);
    } else {
      setIsProcessing(false);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAnalyzing, videoElement, canvas, context]);

  const clearMovements = () => {
    setMovements([]);
    setPreviousFrame(null);
    setProgress(0);
  };

  const getMovementColor = (type: CameraMovement['movementType']) => {
    switch (type) {
      case 'pan': return 'bg-blue-500';
      case 'tilt': return 'bg-green-500';
      case 'zoom': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5" />
          Camera Movement Estimator
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={isProcessing ? "default" : "secondary"}>
            {isProcessing ? "Analyzing" : "Idle"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={clearMovements}
            className="ml-auto"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing frames...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Movements</h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No movements detected yet</p>
            ) : (
              movements.slice(-5).map((movement, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Badge className={getMovementColor(movement.movementType)}>
                      {movement.movementType}
                    </Badge>
                    <span>{movement.timestamp.toFixed(1)}s</span>
                  </div>
                  <div className="text-xs space-x-2">
                    <span>X: {movement.x.toFixed(1)}</span>
                    <span>Y: {movement.y.toFixed(1)}</span>
                    <span>Z: {movement.z.toFixed(1)}</span>
                    <span>({(movement.confidence * 100).toFixed(0)}%)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Total Movements</p>
            <p className="text-2xl font-bold">{movements.length}</p>
          </div>
          <div>
            <p className="font-medium">Movement Types</p>
            <div className="flex gap-1 mt-1">
              <Badge className="bg-blue-500">Pan: {movements.filter(m => m.movementType === 'pan').length}</Badge>
              <Badge className="bg-green-500">Tilt: {movements.filter(m => m.movementType === 'tilt').length}</Badge>
              <Badge className="bg-purple-500">Zoom: {movements.filter(m => m.movementType === 'zoom').length}</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
