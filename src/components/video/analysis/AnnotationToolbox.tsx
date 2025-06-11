// src/components/video/analysis/AnnotationToolbox.tsx
import React, { useState, useEffect } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef, CanvasPath } from 'react-sketch-canvas';
import { Button } from '@/components/ui/button';
import { Eraser, RotateCcw, RotateCw, Trash, Palette, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AnnotationToolboxProps {
  canvasRef: React.RefObject<ReactSketchCanvasRef>;
  videoDimensions: { width: number; height: number };
  initialPaths: CanvasPath[] | null; // For loading existing drawings
  onSaveAnnotations: (paths: CanvasPath[]) => Promise<void>; // Parent handles saving
  canSave: boolean; // Parent determines if save is enabled
  disabled?: boolean; // To disable controls (e.g. if no video loaded)
}

export const AnnotationToolbox: React.FC<AnnotationToolboxProps> = ({
  canvasRef,
  videoDimensions,
  initialPaths,
  onSaveAnnotations,
  canSave,
  disabled = false,
}) => {
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    if (disabled || !canvasRef.current) {
      if(canvasRef.current) canvasRef.current.resetCanvas(); // Clear if disabled
      return;
    }
    if (initialPaths) {
      canvasRef.current.loadPaths(initialPaths);
    } else {
      canvasRef.current.resetCanvas();
    }
  }, [initialPaths, canvasRef, disabled]);

  const handleToggleEraser = () => {
    if (canvasRef.current) {
      const newEraseMode = !isEraser;
      canvasRef.current.eraseMode(newEraseMode);
      setIsEraser(newEraseMode);
    }
  };

  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = Number(e.target.value);
    setStrokeWidth(newWidth);
  };

  const handleSave = async () => {
    if (!canvasRef.current) {
      toast.error("Canvas not available.");
      return;
    }
    const paths = await canvasRef.current.exportPaths();
    await onSaveAnnotations(paths);
    // Parent should give feedback via toast ideally
  };

  return (
    <>
      {videoDimensions.width > 0 && videoDimensions.height > 0 && !disabled && (
        <ReactSketchCanvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10,
          }}
          width={videoDimensions.width}
          height={videoDimensions.height}
          strokeWidth={isEraser ? undefined : strokeWidth}
          eraserWidth={isEraser ? strokeWidth : undefined}
          strokeColor={strokeColor}
          canvasColor="transparent"
        />
      )}
      <div className={`my-3 p-3 border rounded-md space-y-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-sm flex items-center"><Palette className="h-4 w-4 mr-2" />Drawing Tools</h4>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!canSave || disabled}
            title="Save current drawing"
          >
            <Save className="h-4 w-4 mr-1" /> Save Drawing
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="outline" size="sm" onClick={handleToggleEraser} disabled={disabled} title={isEraser ? "Switch to Pen" : "Switch to Eraser"}>
            <Eraser className="h-4 w-4 mr-1" /> {isEraser ? 'Pen' : 'Eraser'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => canvasRef.current?.resetCanvas()} disabled={disabled} title="Clear Canvas & Reset">
            <Trash className="h-4 w-4 mr-1" /> Clear
          </Button>
          <Button variant="outline" size="sm" onClick={() => canvasRef.current?.undo()} disabled={disabled} title="Undo">
            <RotateCcw className="h-4 w-4 mr-1" /> Undo
          </Button>
          <Button variant="outline" size="sm" onClick={() => canvasRef.current?.redo()} disabled={disabled} title="Redo">
            <RotateCw className="h-4 w-4 mr-1" /> Redo
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label htmlFor="strokeWidth" className="text-sm">Width:</label>
          <input
            type="number"
            id="strokeWidth"
            min="1"
            max="50"
            value={strokeWidth}
            onChange={handleStrokeWidthChange}
            disabled={disabled}
            className="p-1 border rounded-md w-16 text-sm bg-white dark:bg-gray-800"
          />
          <label className="text-sm">Color:</label>
          {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#000000', '#FFFFFF'].map(color => (
            <Button
              key={color}
              variant="outline"
              size="icon"
              onClick={() => setStrokeColor(color)}
              disabled={disabled || isEraser}
              className={`w-6 h-6 ${!isEraser && strokeColor === color ? 'ring-2 ring-offset-1 ring-black dark:ring-white' : ''}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </>
  );
};
