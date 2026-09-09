import { useEffect, useRef } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import Lenis from "lenis";
import "@/App.css";
import YearIndex from "@/pages/YearIndex";
import YearPage from "@/pages/YearPage";
import { Toaster } from "@/components/ui/sonner";

// react-router's client-side navigation keeps whatever scroll position
// the previous page was at, so clicking a year card partway down the
// landing page lands you partway down the year page too. This resets
// the scroll to the top on every route change. It goes through the
// Lenis instance (rather than a plain window.scrollTo) so Lenis's own
// idea of the scroll position stays in sync with the jump — otherwise
// the next wheel/touch event can snap the page straight back to the
// old spot.
function ScrollToTop({ lenisRef }) {
  const { pathname } = useLocation();
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    // lenisRef is a ref (stable identity) — the effect only actually
    // needs to re-run when pathname changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return null;
}

function App() {
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenisRef.current = lenis;
    let frameId;
    const raf = (time) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };
    frameId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <BrowserRouter>
      <div data-testid="app-shell">
        <ScrollToTop lenisRef={lenisRef} />
        <Routes>
          <Route path="/" element={<YearIndex />} />
          <Route path="/:yearSlug" element={<YearPage />} />
        </Routes>
        <Toaster position="bottom-right" />
      </div>
    </BrowserRouter>
  );
}

export default App;
