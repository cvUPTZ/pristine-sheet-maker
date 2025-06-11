import React, { useState, useEffect } from 'react';
import { ReactSketchCanvas, ReactSketchCanvasRef, CanvasPath } from 'react-sketch-canvas';
import { Button } from '@/components/ui/button';
import { Eraser, RotateCcw, RotateCw, Trash, Palette, Save } from 'lucide-react'; // Removed Minus, Plus as they are not used for width
import { toast } from 'sonner';
import { TaggedEvent } from '@/types/events';

interface AnnotationToolboxProps {
  canvasRef: React.RefObject<ReactSketchCanvasRef>;
  videoDimensions: { width: number; height: number };
  activeTaggedEvent: TaggedEvent | null | undefined; // Used to load annotations
  onSaveAnnotations: () => Promise<void>; // Simpler: parent handles getting paths via ref
  disabled?: boolean; // To disable controls, e.g. during playlist playback
  activeTaggedEventId: string | null; // Needed to enable/disable save button
}

export const AnnotationToolbox: React.FC<AnnotationToolboxProps> = ({
  canvasRef,
  videoDimensions,
  activeTaggedEvent,
  onSaveAnnotations,
  disabled = false,
  activeTaggedEventId,
}) => {
  const [strokeColor, setStrokeColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  // Effect for loading annotations onto canvas
  useEffect(() => {
    if (disabled) return; // Don't interfere if toolbox is disabled (e.g. playlist playing)
    if (!canvasRef.current) return;

    if (activeTaggedEvent && activeTaggedEvent.annotations && Array.isArray(activeTaggedEvent.annotations)) {
      canvasRef.current.loadPaths(activeTaggedEvent.annotations);
    } else {
      canvasRef.current.resetCanvas();
    }
  }, [activeTaggedEvent, canvasRef, disabled]); // Removed taggedEvents from deps, relies on activeTaggedEvent prop

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
    if (canvasRef.current && !isEraser) { // Apply width change only if not in eraser mode for stroke
        // react-sketch-canvas updates strokeWidth via prop, no imperative call needed here for pen
    }
  };


  return (
    <>
      {videoDimensions.width > 0 && videoDimensions.height > 0 && (
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
          strokeWidth={isEraser ? undefined : strokeWidth} // strokeWidth not applicable in eraser mode for some versions
          eraserWidth={isEraser ? strokeWidth : undefined} // Use strokeWidth for eraser size
          strokeColor={strokeColor} // Eraser mode uses this to "erase" to transparent
          canvasColor="transparent"
        />
      )}
      <div className="my-3 p-3 border rounded-md space-y-2">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-sm flex items-center"><Palette className="h-4 w-4 mr-2" />Drawing Tools</h4>
          <Button
            size="sm"
            onClick={onSaveAnnotations}
            disabled={disabled || !activeTaggedEventId}
            title="Save current drawing to the selected tagged event"
          >
            <Save className="h-4 w-4 mr-1" /> Save Annotations
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
            className="p-1 border rounded-md w-16 text-sm"
          />
          <label className="text-sm">Color:</label>
          {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#000000', '#FFFFFF'].map(color => ( // Added white
            <Button
              key={color}
              variant="outline"
              size="icon"
              onClick={() => setStrokeColor(color)}
              disabled={disabled || isEraser} // Disable color change in eraser mode
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
