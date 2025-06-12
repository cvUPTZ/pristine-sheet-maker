
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef } from 'react-sketch-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, Save, Square, Circle, Minus, ArrowRight, Type, Pencil, Palette, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

// Updated Annotation Interfaces
interface BaseAnnotation {
  id: string;
  type: 'freehand' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text';
  color: string;
  strokeWidth?: number;
}

interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  paths: Array<{ x: number; y: number }>;
}

interface ShapeAnnotation extends BaseAnnotation {
  type: 'rectangle' | 'circle' | 'line' | 'arrow';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  endX?: number;
  endY?: number;
  fillColor?: string;
}

interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontFamily?: string;
  fontSize?: number;
}

type AnnotationObject = FreehandAnnotation | ShapeAnnotation | TextAnnotation;

interface AnnotationToolboxProps {
  canvasRef: React.RefObject<ReactSketchCanvasRef>;
  videoDimensions: { width: number; height: number };
  initialAnnotations: AnnotationObject[] | null;
  onSaveAnnotations: (annotations: AnnotationObject[]) => void;
  canSave: boolean;
  disabled?: boolean;
}

export const AnnotationToolbox: React.FC<AnnotationToolboxProps> = ({
  canvasRef,
  videoDimensions,
  initialAnnotations,
  onSaveAnnotations,
  canSave,
  disabled = false
}) => {
  const [currentTool, setCurrentTool] = useState<'freehand' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text'>('freehand');
  const [strokeColor, setStrokeColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [annotations, setAnnotations] = useState<AnnotationObject[]>(initialAnnotations || []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (initialAnnotations) {
      setAnnotations(initialAnnotations);
      loadAnnotationsToCanvas();
    }
  }, [initialAnnotations]);

  const loadAnnotationsToCanvas = useCallback(async () => {
    if (!canvasRef.current || !initialAnnotations) return;
    
    try {
      await canvasRef.current.resetCanvas();
      
      for (const annotation of initialAnnotations) {
        if (annotation.type === 'freehand') {
          const paths = annotation.paths.map(point => ({
            x: point.x,
            y: point.y
          }));
          
          if (paths.length > 0) {
            await canvasRef.current.loadPaths([{
              paths: paths,
              strokeColor: annotation.color,
              strokeWidth: annotation.strokeWidth || 3,
              drawMode: false
            }]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading annotations to canvas:', error);
    }
  }, [canvasRef, initialAnnotations]);

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || currentTool === 'freehand') return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setStartPoint({ x, y });
    setIsDrawing(true);
  };

  const handleCanvasMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !isDrawing || !startPoint || currentTool === 'freehand' || currentTool === 'text') return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;
    
    const newAnnotation: ShapeAnnotation = {
      id: crypto.randomUUID(),
      type: currentTool,
      color: strokeColor,
      strokeWidth,
      x: startPoint.x,
      y: startPoint.y,
      endX,
      endY,
      width: Math.abs(endX - startPoint.x),
      height: Math.abs(endY - startPoint.y),
      radius: currentTool === 'circle' ? Math.sqrt(Math.pow(endX - startPoint.x, 2) + Math.pow(endY - startPoint.y, 2)) : undefined
    };
    
    setAnnotations(prev => [...prev, newAnnotation]);
    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleTextPlacement = (event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || currentTool !== 'text') return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const text = prompt('Enter text:');
    if (text) {
      const newAnnotation: TextAnnotation = {
        id: crypto.randomUUID(),
        type: 'text',
        color: strokeColor,
        x,
        y,
        text,
        fontSize: 16,
        fontFamily: 'Arial'
      };
      
      setAnnotations(prev => [...prev, newAnnotation]);
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (currentTool === 'text') {
      handleTextPlacement(event);
    }
  };

  const handleSaveAnnotations = async () => {
    if (!canvasRef.current) return;
    
    try {
      const freehandPaths = await canvasRef.current.exportPaths();
      const freehandAnnotations: FreehandAnnotation[] = freehandPaths.map((path, index) => ({
        id: `freehand-${index}-${Date.now()}`,
        type: 'freehand' as const,
        color: path.strokeColor || strokeColor,
        strokeWidth: path.strokeWidth || strokeWidth,
        paths: path.paths.map(point => ({ x: point.x, y: point.y }))
      }));
      
      const allAnnotations = [...annotations.filter(a => a.type !== 'freehand'), ...freehandAnnotations];
      setAnnotations(allAnnotations);
      onSaveAnnotations(allAnnotations);
    } catch (error) {
      console.error('Error saving annotations:', error);
      toast.error('Failed to save annotations');
    }
  };

  const handleClearAll = async () => {
    if (canvasRef.current) {
      await canvasRef.current.resetCanvas();
    }
    setAnnotations([]);
  };

  const renderShapeOverlay = () => {
    return (
      <svg
        ref={svgOverlayRef}
        className="absolute inset-0 pointer-events-none"
        style={{ width: videoDimensions.width, height: videoDimensions.height }}
      >
        {annotations.filter(a => a.type !== 'freehand').map((annotation) => {
          if (annotation.type === 'rectangle') {
            const shape = annotation as ShapeAnnotation;
            return (
              <rect
                key={annotation.id}
                x={Math.min(shape.x, shape.endX || shape.x)}
                y={Math.min(shape.y, shape.endY || shape.y)}
                width={shape.width}
                height={shape.height}
                fill="none"
                stroke={annotation.color}
                strokeWidth={annotation.strokeWidth || 3}
              />
            );
          }
          
          if (annotation.type === 'circle') {
            const shape = annotation as ShapeAnnotation;
            return (
              <circle
                key={annotation.id}
                cx={shape.x}
                cy={shape.y}
                r={shape.radius || 0}
                fill="none"
                stroke={annotation.color}
                strokeWidth={annotation.strokeWidth || 3}
              />
            );
          }
          
          if (annotation.type === 'line') {
            const shape = annotation as ShapeAnnotation;
            return (
              <line
                key={annotation.id}
                x1={String(shape.x)}
                y1={String(shape.y)}
                x2={String(shape.endX || shape.x)}
                y2={String(shape.endY || shape.y)}
                stroke={annotation.color}
                strokeWidth={annotation.strokeWidth || 3}
              />
            );
          }
          
          if (annotation.type === 'text') {
            const textAnnotation = annotation as TextAnnotation;
            return (
              <text
                key={annotation.id}
                x={textAnnotation.x}
                y={textAnnotation.y}
                fill={annotation.color}
                fontSize={textAnnotation.fontSize || 16}
                fontFamily={textAnnotation.fontFamily || 'Arial'}
              >
                {textAnnotation.text}
              </text>
            );
          }
          
          return null;
        })}
      </svg>
    );
  };

  if (videoDimensions.width === 0 || videoDimensions.height === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
        <p>Loading video player...</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div
        className="relative w-full h-full cursor-crosshair"
        onMouseDown={handleCanvasMouseDown}
        onMouseUp={handleCanvasMouseUp}
        onClick={handleCanvasClick}
      >
        <ReactSketchCanvas
          ref={canvasRef}
          width={`${videoDimensions.width}px`}
          height={`${videoDimensions.height}px`}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          canvasColor="transparent"
          allowOnlyPointerType="all"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: disabled ? 'none' : (currentTool === 'freehand' ? 'auto' : 'none')
          }}
        />
        {renderShapeOverlay()}
      </div>
      
      <div className={`absolute bottom-4 left-4 right-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Annotation Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={currentTool === 'freehand' ? 'default' : 'outline'}
                onClick={() => setCurrentTool('freehand')}
                disabled={disabled}
              >
                <Pencil className="h-3 w-3 mr-1" />Freehand
              </Button>
              <Button
                size="sm"
                variant={currentTool === 'rectangle' ? 'default' : 'outline'}
                onClick={() => setCurrentTool('rectangle')}
                disabled={disabled}
              >
                <Square className="h-3 w-3 mr-1" />Rectangle
              </Button>
              <Button
                size="sm"
                variant={currentTool === 'circle' ? 'default' : 'outline'}
                onClick={() => setCurrentTool('circle')}
                disabled={disabled}
              >
                <Circle className="h-3 w-3 mr-1" />Circle
              </Button>
              <Button
                size="sm"
                variant={currentTool === 'line' ? 'default' : 'outline'}
                onClick={() => setCurrentTool('line')}
                disabled={disabled}
              >
                <Minus className="h-3 w-3 mr-1" />Line
              </Button>
              <Button
                size="sm"
                variant={currentTool === 'text' ? 'default' : 'outline'}
                onClick={() => setCurrentTool('text')}
                disabled={disabled}
              >
                <Type className="h-3 w-3 mr-1" />Text
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <input
                  type="color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                  disabled={disabled}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Width:</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                  className="w-20"
                  disabled={disabled}
                />
                <span className="text-sm w-6">{strokeWidth}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveAnnotations} disabled={disabled || !canSave}>
                <Save className="h-3 w-3 mr-1" />Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearAll} disabled={disabled}>
                <RotateCcw className="h-3 w-3 mr-1" />Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnnotationToolbox;
