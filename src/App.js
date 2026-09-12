import { useEffect, useRef } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import Lenis from "lenis";
import "@/App.css";
import YearIndex from "@/pages/YearIndex";
import YearPage from "@/pages/YearPage";
import { Toaster } from "@/components/ui/sonner";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

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

function AppShell() {
  const lenisRef = useRef(null);
  const { reducedMotion } = useTheme();

  useEffect(() => {
    // Reduced motion turns off Lenis's inertial smooth-scrolling too,
    // not just CSS/framer-motion animations — a near-zero duration
    // makes it track the raw scroll position immediately.
    const lenis = new Lenis({ duration: reducedMotion ? 0.001 : 1.15, smoothWheel: !reducedMotion });
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
  }, [reducedMotion]);

  return (
    // reducedMotion "always" forces every framer-motion animation in the
    // app (motion.div / AnimatePresence, wherever it's used) down to an
    // instant transition when our own toggle is on; "user" otherwise
    // still respects the OS-level prefers-reduced-motion setting.
    <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
      <BrowserRouter>
        <div data-testid="app-shell">
          <ScrollToTop lenisRef={lenisRef} />
          <Routes>
            <Route path="/" element={<YearIndex />} />
            <Route path="/:yearSlug" element={<YearPage />} />
          </Routes>
          <Toaster position="bottom-right" />
          <AccessibilityMenu />
        </div>
      </BrowserRouter>
    </MotionConfig>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}

export default App;
