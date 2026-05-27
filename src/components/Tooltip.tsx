import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tooltip Component
 *
 * Displays contextual help information on hover.
 * Designed for scientific/statistical explanations for epidemiologists and biostatisticians.
 */
const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && containerRef.current) {
      const tooltip = tooltipRef.current.getBoundingClientRect();
      const container = containerRef.current.getBoundingClientRect();

      // Adjust position if tooltip would overflow viewport
      if (position === 'top' && container.top - tooltip.height < 10) {
        setAdjustedPosition('bottom');
      } else if (position === 'bottom' && container.bottom + tooltip.height > window.innerHeight - 10) {
        setAdjustedPosition('top');
      } else if (position === 'left' && container.left - tooltip.width < 10) {
        setAdjustedPosition('right');
      } else if (position === 'right' && container.right + tooltip.width > window.innerWidth - 10) {
        setAdjustedPosition('left');
      } else {
        setAdjustedPosition(position);
      }
    }
  }, [isVisible, position]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent',
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onTouchStart={() => setIsVisible(true)}
      onTouchEnd={() => setTimeout(() => setIsVisible(false), 2000)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${positionClasses[adjustedPosition]} w-72 max-w-[calc(100vw-2rem)] sm:max-w-sm tooltip-content`}
        >
          <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            {content}
            <div
              className={`absolute w-0 h-0 border-4 ${arrowClasses[adjustedPosition]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * InfoIcon Component
 *
 * Small info icon that triggers tooltip on hover.
 */
export const InfoIcon: React.FC<{ tooltip: React.ReactNode }> = ({ tooltip }) => (
  <Tooltip content={tooltip}>
    <button
      type="button"
      className="ml-1 text-gray-400 hover:text-indigo-500 transition-colors focus:outline-none"
      aria-label="More information"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  </Tooltip>
);

export default Tooltip;
