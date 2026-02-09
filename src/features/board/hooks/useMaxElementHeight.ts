import { useRef, useLayoutEffect, useState } from "react";

export const useMaxElementHeight = (count: number, tasksData?: any): [(el: HTMLDivElement | null, index: number) => void, number | null] => {
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const [shouldApplyHeight, setShouldApplyHeight] = useState(false);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  const setRef = (el: HTMLDivElement | null, index: number) => {
    columnRefs.current[index] = el;
  };

  useLayoutEffect(() => {
    setShouldApplyHeight(false);
    setMaxHeight(null);
    
    requestAnimationFrame(() => {
      if (columnRefs.current.length > 0) {
        const heights = columnRefs.current
          .filter(Boolean)
          .map(ref => ref!.offsetHeight);
        
        if (heights.length > 0) {
          const max = Math.max(...heights);
          setMaxHeight(max);
          setShouldApplyHeight(true);
        }
      }
    });
  }, [count, tasksData]);

  useLayoutEffect(() => {
    const handleResize = () => {
      setShouldApplyHeight(false);
      setMaxHeight(null);
      
      requestAnimationFrame(() => {
        if (columnRefs.current.length > 0) {
          const heights = columnRefs.current
            .filter(Boolean)
            .map(ref => ref!.offsetHeight);
          
          if (heights.length > 0) {
            const max = Math.max(...heights);
            setMaxHeight(max);
            setShouldApplyHeight(true);
          }
        }
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return [setRef, shouldApplyHeight ? maxHeight : null];
};