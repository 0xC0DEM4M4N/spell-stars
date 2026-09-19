import { useEffect, useState } from "react";

// True once the page has scrolled past `threshold` px. Drives the
// floating header's scroll-edge effect: the bar is always a translucent
// material, but only grows its edge fade and shadow once content is
// actually passing underneath it.
export function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [threshold]);

  return scrolled;
}
