
import React from 'react';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger, 
  TooltipProvider,
  TooltipWrapper
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export const TooltipExample = () => {
  // Using the wrapper method
  return (
    <TooltipWrapper>
      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-xl font-bold">Tooltip Examples</h2>
        
        <div>
          <h3 className="text-lg font-medium mb-2">Individual Tooltips</h3>
          <div className="flex gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>
                This is a tooltip
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Another tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>
                This is another tooltip
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Multiple Tooltips with one Provider</h3>
          <div className="flex gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary">First tooltip</Button>
                </TooltipTrigger>
                <TooltipContent>
                  First tooltip content
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="secondary">Second tooltip</Button>
                </TooltipTrigger>
                <TooltipContent>
                  Second tooltip content
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </TooltipWrapper>
  );
};

export default TooltipExample;
