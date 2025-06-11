// src/components/video/analysis/AnnotationToolbox.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef, CanvasPath } from 'react-sketch-canvas';
import { Button } from '@/components/ui/button';
import { Eraser, RotateCcw, RotateCw, Trash, Palette, Save, PenTool, Minus, Share2, Circle as CircleIcon, Square, Type as TypeIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Added Label for text input

// --- Annotation Data Structures ---
export type DrawingToolType = 'freehand' | 'line' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'eraser';

interface Point { x: number; y: number; }

interface BaseAnnotation {
  id: string;
  type: DrawingToolType;
  color: string;
  strokeWidth?: number;
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  paths: Point[];
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'line' | 'arrow' | 'rectangle' | 'circle';
  x: number;
  y: number;
  width?: number; 
  height?: number;
  radius?: number;
  endX?: number; 
  endY?: number; 
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontFamily?: string;
  fontSize?: number;
}

export type AnnotationObject = FreehandAnnotation | ShapeAnnotation | TextAnnotation;
// --- End Annotation Data Structures ---

interface AnnotationToolboxProps {
  canvasRef: React.RefObject<ReactSketchCanvasRef>;
  videoDimensions: { width: number; height: number };
  initialAnnotations: AnnotationObject[] | null;
  onSaveAnnotations: (annotations: AnnotationObject[]) => Promise<void>; 
  canSave: boolean;
  disabled?: boolean;
}

export const AnnotationToolbox: React.FC<AnnotationToolboxProps> = ({
  canvasRef,
  videoDimensions,
  initialAnnotations,
  onSaveAnnotations,
  canSave,
  disabled = false,
}) => {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null); // Ref for text input

  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [activeTool, setActiveTool] = useState<DrawingToolType>('freehand');
  
  const [isDrawing, setIsDrawing] = useState(false); // For shapes
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentEndPoint, setCurrentEndPoint] = useState<Point | null>(null);
  const [drawnSessionAnnotations, setDrawnSessionAnnotations] = useState<AnnotationObject[]>([]);

  // State for Text Tool
  const [isAddingText, setIsAddingText] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState<{ x: number; y: number } | null>(null);
  const [currentTextValue, setCurrentTextValue] = useState('');
  const [currentTextFontSize, setCurrentTextFontSize] = useState(16);

  const getCanvasCoordinates = (event: React.MouseEvent): Point => {
    if (overlayCanvasRef.current) {
        const rect = overlayCanvasRef.current.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    return { x: 0, y: 0 };
  };
  
  const commitCurrentText = useCallback(() => {
    if (currentTextValue.trim() && textInputPosition) {
      const newTextAnnotation: TextAnnotation = {
        id: crypto.randomUUID(),
        type: 'text',
        x: textInputPosition.x,
        y: textInputPosition.y + currentTextFontSize, // Adjust y to be baseline
        text: currentTextValue.trim(),
        color: strokeColor,
        fontSize: currentTextFontSize,
        fontFamily: 'Arial', // Default
      };
      setDrawnSessionAnnotations(prev => [...prev, newTextAnnotation]);
    }
    setIsAddingText(false);
    setCurrentTextValue('');
    setTextInputPosition(null);
  }, [currentTextValue, textInputPosition, strokeColor, currentTextFontSize, /*drawnSessionAnnotations? No, causes loop */ ]);


  const drawAnnotationOnOverlay = useCallback((ctx: CanvasRenderingContext2D, annotation: AnnotationObject) => {
    if (!ctx) return;
    ctx.strokeStyle = annotation.color;
    ctx.lineWidth = annotation.strokeWidth || strokeWidth;
    ctx.fillStyle = annotation.color; // For text and future filled shapes
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (annotation.type) {
      case 'line':
      case 'arrow': { /* ... (same as before) ... */ 
        const shape = annotation as ShapeAnnotation;
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.endX!, shape.endY!);
        ctx.stroke();
        if (annotation.type === 'arrow') {
          const angle = Math.atan2(shape.endY! - shape.y, shape.endX! - shape.x);
          const headLength = Math.min(10, (annotation.strokeWidth || 4) * 2.5);
          ctx.beginPath();
          ctx.moveTo(shape.endX!, shape.endY!);
          ctx.lineTo(shape.endX! - headLength * Math.cos(angle - Math.PI / 6), shape.endY! - headLength * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(shape.endX!, shape.endY!);
          ctx.lineTo(shape.endX! - headLength * Math.cos(angle + Math.PI / 6), shape.endY! - headLength * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
        break;
      }
      case 'rectangle': { /* ... (same as before) ... */ 
        const shape = annotation as ShapeAnnotation;
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, shape.width!, shape.height!);
        ctx.stroke();
        break;
      }
      case 'circle': { /* ... (same as before) ... */ 
        const shape = annotation as ShapeAnnotation;
        ctx.beginPath();
        ctx.arc(shape.x + shape.radius!, shape.y + shape.radius!, shape.radius!, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      }
      case 'text': {
        const textAnn = annotation as TextAnnotation;
        ctx.font = `${textAnn.fontSize || currentTextFontSize}px ${textAnn.fontFamily || 'Arial'}`;
        // Fill text using the main color property
        ctx.fillText(textAnn.text, textAnn.x, textAnn.y);
        break;
      }
    }
  }, [strokeWidth, currentTextFontSize]); // currentTextFontSize for default if not in annotation

  const redrawAllOverlayAnnotations = useCallback(() => {
    if (!overlayCanvasRef.current) return;
    const ctx = overlayCanvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    initialAnnotations?.forEach(ann => { if (ann.type !== 'freehand') drawAnnotationOnOverlay(ctx, ann); });
    drawnSessionAnnotations.forEach(ann => drawAnnotationOnOverlay(ctx, ann));
  }, [initialAnnotations, drawnSessionAnnotations, drawAnnotationOnOverlay]);

  useEffect(() => { redrawAllOverlayAnnotations(); }, [drawnSessionAnnotations, redrawAllOverlayAnnotations]);


  useEffect(() => {
    if (disabled) return;
    if (canvasRef.current) { /* ... (freehand loading same as before) ... */ 
        const freehandInitial = initialAnnotations?.filter(a => a.type === 'freehand') as FreehandAnnotation[] || [];
        const pathsToLoad: CanvasPath[] = freehandInitial.map(fa => ({
            paths: fa.paths, strokeColor: fa.color, strokeWidth: fa.strokeWidth || 4, drawMode: true,
        })).filter(p => p.paths && p.paths.length > 0);
        if (pathsToLoad.length > 0) canvasRef.current.loadPaths(pathsToLoad);
        else canvasRef.current.resetCanvas();
    }
    setDrawnSessionAnnotations([]); 
    redrawAllOverlayAnnotations();
  }, [initialAnnotations, disabled, canvasRef, redrawAllOverlayAnnotations]);

  useEffect(() => {
    if (overlayCanvasRef.current && videoDimensions.width > 0 && videoDimensions.height > 0) { /* ... (resize same as before) ... */ 
        overlayCanvasRef.current.width = videoDimensions.width;
        overlayCanvasRef.current.height = videoDimensions.height;
        redrawAllOverlayAnnotations();
    }
  }, [videoDimensions, redrawAllOverlayAnnotations]);
  
  useEffect(() => { // Focus textarea when isAddingText becomes true
    if (isAddingText && textAreaRef.current) {
        textAreaRef.current.focus();
    }
  }, [isAddingText]);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (disabled) return;
    const coords = getCanvasCoordinates(event);

    if (activeTool === 'text') {
        if (isAddingText) commitCurrentText(); // Commit previous text if any
        setTextInputPosition(coords);
        setIsAddingText(true);
        setCurrentTextValue(''); // Start with empty text for new input
        // Focus will be handled by useEffect on isAddingText change
    } else if (activeTool !== 'freehand' && activeTool !== 'eraser') {
        if (isAddingText) commitCurrentText(); // Commit text if user clicks to draw shape while text input is active
        setIsDrawing(true);
        setStartPoint(coords);
        setCurrentEndPoint(null);
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => { /* ... (same as before for shapes) ... */ 
    if (!isDrawing || !startPoint || activeTool === 'freehand' || activeTool === 'eraser' || activeTool === 'text') return;
    const currentPos = getCanvasCoordinates(event);
    setCurrentEndPoint(currentPos);
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      if (!ctx) return;
      redrawAllOverlayAnnotations();
      const previewAnnotation: ShapeAnnotation = {
        id: 'preview', type: activeTool as 'line' | 'arrow' | 'rectangle' | 'circle',
        x: startPoint.x, y: startPoint.y, color: strokeColor, strokeWidth: strokeWidth,
      };
      if (activeTool === 'line' || activeTool === 'arrow') {
        previewAnnotation.endX = currentPos.x; previewAnnotation.endY = currentPos.y;
      } else if (activeTool === 'rectangle') {
        previewAnnotation.width = currentPos.x - startPoint.x; previewAnnotation.height = currentPos.y - startPoint.y;
      } else if (activeTool === 'circle') {
        const dx = currentPos.x - startPoint.x; const dy = currentPos.y - startPoint.y;
        previewAnnotation.radius = Math.sqrt(dx * dx + dy * dy) / 2;
        previewAnnotation.x = startPoint.x + dx / 2 - previewAnnotation.radius; 
        previewAnnotation.y = startPoint.y + dy / 2 - previewAnnotation.radius;
      }
      drawAnnotationOnOverlay(ctx, previewAnnotation);
    }
  };

  const handleMouseUp = () => { /* ... (same as before for shapes) ... */ 
    if (!isDrawing || !startPoint || !currentEndPoint || activeTool === 'freehand' || activeTool === 'eraser' || activeTool === 'text') {
      setIsDrawing(false); return;
    }
    let newShapeAnnotation: ShapeAnnotation | null = null;
    const commonProps = { id: crypto.randomUUID(), color: strokeColor, strokeWidth: strokeWidth };
    if (activeTool === 'line' || activeTool === 'arrow') {
      newShapeAnnotation = { ...commonProps, type: activeTool, x: startPoint.x, y: startPoint.y, endX: currentEndPoint.x, endY: currentEndPoint.y };
    } else if (activeTool === 'rectangle') {
      newShapeAnnotation = { ...commonProps, type: 'rectangle', 
        x: Math.min(startPoint.x, currentEndPoint.x), y: Math.min(startPoint.y, currentEndPoint.y),
        width: Math.abs(currentEndPoint.x - startPoint.x), height: Math.abs(currentEndPoint.y - startPoint.y) };
    } else if (activeTool === 'circle') {
        const dx = currentEndPoint.x - startPoint.x; const dy = currentEndPoint.y - startPoint.y;
        const radius = Math.sqrt(dx*dx + dy*dy) / 2;
        newShapeAnnotation = { ...commonProps, type: 'circle', 
            x: startPoint.x + dx/2 - radius, y: startPoint.y + dy/2 - radius, radius: radius  };
    }
    if (newShapeAnnotation) setDrawnSessionAnnotations(prev => [...prev, newShapeAnnotation!]);
    setIsDrawing(false); setStartPoint(null); setCurrentEndPoint(null);
    // redrawAllOverlayAnnotations(); // Not strictly needed here if mouseMove was the last event
  };
  
  const handleMouseLeave = () => { /* ... (same as before for shapes) ... */ 
      if (isDrawing) handleMouseUp();
  };

  const handleToolSelect = (tool: DrawingToolType) => {
    if (isAddingText && tool !== 'text') { // If text input is active and switching away from text tool
        commitCurrentText();
    }
    setActiveTool(tool);
    if (canvasRef.current) canvasRef.current.eraseMode(tool === 'eraser');
    if (tool !== 'text' && isAddingText) { // If switching away from text tool, ensure text input is hidden
        setIsAddingText(false);
        setCurrentTextValue('');
        setTextInputPosition(null);
    }
  };
  
  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => setStrokeWidth(Number(e.target.value));

  const handleSave = async () => { /* ... (Updated to include text annotations) ... */ 
    let finalAnnotations: AnnotationObject[] = [];
    // Preserve initial non-freehand annotations (includes shapes and text)
    const initialStaticAnnotations = initialAnnotations?.filter(a => a.type !== 'freehand') || [];
    finalAnnotations.push(...initialStaticAnnotations);
    // Add all newly drawn session annotations (shapes and text)
    finalAnnotations.push(...drawnSessionAnnotations);
    // Get current freehand drawing
    if (canvasRef.current) {
      const exportedPaths: CanvasPath[] = await canvasRef.current.exportPaths();
      if (exportedPaths.length > 0) {
        const consolidatedPaths: Point[] = [];
        let firstPathStyle = exportedPaths[0];
        exportedPaths.forEach(p => consolidatedPaths.push(...p.paths));
        if (consolidatedPaths.length > 0) {
            finalAnnotations.push({
                id: crypto.randomUUID(), type: 'freehand', paths: consolidatedPaths,
                color: firstPathStyle.strokeColor || strokeColor, 
                strokeWidth: firstPathStyle.strokeWidth || strokeWidth,
            });
        }
      }
    }
    // Filter out any potential duplicates by ID before saving, prioritizing newer ones from session.
    // This is a basic deduplication. More sophisticated merging might be needed if annotations can be edited.
    const uniqueAnnotations = Array.from(new Map(finalAnnotations.map(ann => [ann.id, ann])).values());

    await onSaveAnnotations(uniqueAnnotations);
    setDrawnSessionAnnotations([]); 
    if (canvasRef.current) canvasRef.current.resetCanvas();
    if (isAddingText) commitCurrentText(); // Commit any pending text
    toast.success("Annotation session saved.");
  };
  
  const handleClearShapesAndText = () => {
    setDrawnSessionAnnotations([]);
    // redrawAllOverlayAnnotations(); // Already called by useEffect on drawnSessionAnnotations change
    toast.info("Shapes and text drawn in this session have been cleared.");
  };

  const commonButtonClass = "p-2 h-auto"; 

  return (
    <>
      <div 
        className="absolute top-0 left-0 z-[11]"
        style={{ width: videoDimensions.width, height: videoDimensions.height, 
                 pointerEvents: (activeTool !== 'freehand' && activeTool !== 'eraser' && !disabled && !isAddingText) ? 'auto' : 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <canvas ref={overlayCanvasRef} className="absolute top-0 left-0" style={{pointerEvents: 'none'}} />
      </div>

      {isAddingText && textInputPosition && (
        <textarea
          ref={textAreaRef}
          value={currentTextValue}
          onChange={(e) => setCurrentTextValue(e.target.value)}
          onBlur={() => setTimeout(commitCurrentText, 100)} // Timeout to allow click on other buttons e.g. save
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitCurrentText(); }
            if (e.key === 'Escape') { setIsAddingText(false); setCurrentTextValue(''); setTextInputPosition(null); }
          }}
          style={{
            position: 'absolute', top: textInputPosition.y, left: textInputPosition.x, zIndex: 25,
            border: '1px dashed #777', fontSize: `${currentTextFontSize}px`, fontFamily: 'Arial',
            color: strokeColor, background: 'rgba(255,255,255,0.9)', outline: 'none',
            minWidth: '30px', minHeight: `${currentTextFontSize + 6}px`, resize: 'none', overflow: 'hidden', lineHeight: '1.1',
            padding: '2px', borderRadius: '2px',
          }}
          placeholder="..."
        />
      )}

      {videoDimensions.width > 0 && videoDimensions.height > 0 && !disabled && (
        <ReactSketchCanvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 10,
            pointerEvents: (activeTool === 'freehand' || activeTool === 'eraser') ? 'auto' : 'none',
          }} width={videoDimensions.width} height={videoDimensions.height}
          strokeWidth={activeTool === 'eraser' ? undefined : strokeWidth}
          eraserWidth={activeTool === 'eraser' ? strokeWidth : undefined}
          strokeColor={strokeColor} canvasColor="transparent" />
      )}

      <div className={`my-3 p-3 border rounded-md space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex flex-wrap gap-1 justify-center p-1 bg-slate-100 rounded-md">
          {/* ... (Tool buttons JSX same as before) ... */}
          {[
            { tool: 'freehand' as DrawingToolType, icon: <PenTool className="h-4 w-4" />, label: 'Pen' },
            { tool: 'line' as DrawingToolType, icon: <Minus className="h-4 w-4" />, label: 'Line' },
            { tool: 'arrow' as DrawingToolType, icon: <Share2 className="h-4 w-4 -rotate-45" />, label: 'Arrow' },
            { tool: 'rectangle' as DrawingToolType, icon: <Square className="h-4 w-4" />, label: 'Rectangle' },
            { tool: 'circle' as DrawingToolType, icon: <CircleIcon className="h-4 w-4" />, label: 'Circle' },
            { tool: 'text' as DrawingToolType, icon: <TypeIcon className="h-4 w-4" />, label: 'Text' },
            { tool: 'eraser' as DrawingToolType, icon: <Eraser className="h-4 w-4" />, label: 'Eraser' },
          ].map(({ tool, icon, label }) => (
            <Button key={tool} variant={activeTool === tool ? 'secondary' : 'ghost'} size="sm"
              className={`${commonButtonClass} flex flex-col items-center text-xs h-12 w-12`}
              onClick={() => handleToolSelect(tool)} title={label}>
              {icon} <span className="mt-0.5 block">{label}</span>
            </Button>
          ))}
        </div>
        
        <div>
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-xs flex items-center"><Palette className="h-3 w-3 mr-1" />Drawing Options</h4>
              <Button size="sm" onClick={handleSave} disabled={!canSave || disabled} title="Save current drawing session" className="h-auto py-1 px-2 text-xs">
                  <Save className="h-3 w-3 mr-1" /> Save Session
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-2 items-center mt-1">
                {(activeTool !== 'text' && activeTool !== 'eraser') && (
                    <><Label htmlFor="strokeWidth" className="text-xs">Width:</Label>
                    <Input type="number" id="strokeWidth" min="1" max="50" value={strokeWidth} onChange={handleStrokeWidthChange} disabled={disabled} className="p-1 border rounded-md w-14 h-7 text-xs bg-white dark:bg-gray-800"/></>
                )}
                {activeTool === 'text' && (
                    <><Label htmlFor="fontSize" className="text-xs">Font Size:</Label>
                    <Input type="number" id="fontSize" min="8" max="128" value={currentTextFontSize} onChange={e => setCurrentTextFontSize(Number(e.target.value))} className="p-1 border rounded-md w-14 h-7 text-xs bg-white dark:bg-gray-800" /></>
                )}
                 {(activeTool !== 'eraser') && ( 
                    <><Label className="text-xs">Color:</Label>
                    {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#000000', '#FFFFFF'].map(color => (
                    <Button key={color} variant="outline" size="icon" onClick={() => setStrokeColor(color)} disabled={disabled} className={`w-5 h-5 ${strokeColor === color ? 'ring-2 ring-offset-1 ring-black dark:ring-white' : ''}`} style={{ backgroundColor: color }} title={color}/>
                    ))}</>
                )}
            </div>
            <div className="flex flex-wrap gap-1 items-center mt-2">
                {(activeTool === 'freehand' || activeTool === 'eraser') && (
                    <><Button variant="outline" size="xs" className={commonButtonClass} onClick={() => canvasRef.current?.resetCanvas()} disabled={disabled} title="Clear Freehand Canvas">
                        <Trash className="h-3 w-3 mr-1" /> Clear Pen
                    </Button>
                    <Button variant="outline" size="xs" className={commonButtonClass} onClick={() => canvasRef.current?.undo()} disabled={disabled} title="Undo Freehand">
                        <RotateCcw className="h-3 w-3 mr-1" /> Undo Pen
                    </Button>
                    <Button variant="outline" size="xs" className={commonButtonClass} onClick={() => canvasRef.current?.redo()} disabled={disabled} title="Redo Freehand">
                        <RotateCw className="h-3 w-3 mr-1" /> Redo Pen
                    </Button></>
                )}
                 {(activeTool !== 'freehand' && activeTool !== 'eraser') && ( // Clear for shapes and text
                     <Button variant="outline" size="xs" className={commonButtonClass} onClick={handleClearShapesAndText} disabled={disabled || drawnSessionAnnotations.length === 0} title="Clear Drawn Shapes/Text in this Session">
                        <Trash2Icon className="h-3 w-3 mr-1" /> Clear Items
                    </Button>
                 )}
            </div>
        </div>
      </div>
    </>
  );
};

export default AnnotationToolbox;
