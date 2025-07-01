import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false); // Default to desktop view

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // Update state with the actual value on the client.
    setIsMobile(mql.matches);

    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mql.addEventListener('change', onChange);

    // Clean up the event listener when the component unmounts.
    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, []); // The empty dependency array ensures this runs only once on mount.

  return isMobile;
}
