import { useEffect, useRef } from "react";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import Lenis from "lenis";
import "@/App.css";
import YearIndex from "@/pages/YearIndex";
import YearPage from "@/pages/YearPage";
import HowItWorks from "@/pages/HowItWorks";
import ForEducators from "@/pages/ForEducators";
import Faq from "@/pages/Faq";
import About from "@/pages/About";
import SyncPage from "@/pages/SyncPage";
import CustomListsPage from "@/pages/CustomListsPage";
import CustomListPage from "@/pages/CustomListPage";
import SharedListPage from "@/pages/SharedListPage";
import DigitalJourney from "@/pages/DigitalJourney";
import OfflineJourney from "@/pages/OfflineJourney";
import { Toaster } from "@/components/ui/sonner";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

// Links from before the home page was split (/#faq, /#offline-routine...)
// still work: they forward to the page that now holds that section.
const LEGACY_HASHES = {
  "how-it-works": "/how-it-works",
  "how-a-session-works": "/how-it-works#how-a-session-works",
  "beyond-spelling": "/how-it-works#beyond-spelling",
  "offline-routine": "/offline-journey",
  "for-educators": "/for-educators",
  faq: "/faq",
};

// Space to leave above a section the page scrolls to, so the fixed
// header doesn't sit on top of its heading.
const HEADER_OFFSET = -80;

// react-router's client-side navigation keeps whatever scroll position
// the previous page was at, so clicking a year card partway down the
// landing page lands you partway down the year page too. This resets
// the scroll to the top on every navigation, or, when the link has a
// #hash, scrolls to that section once it has rendered (the target may
// appear a moment late while page data loads). Both go through the
// Lenis instance (rather than a plain window.scrollTo) so Lenis's own
// idea of the scroll position stays in sync with the jump — otherwise
// the next wheel/touch event can snap the page straight back to the
// old spot. Keyed on location.key so clicking a link to the page
// you're already on (the logo on the home page) still scrolls.
function ScrollToTop({ lenisRef }) {
  const { pathname, hash, key } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // On /sync and /shared the hash can hold a whole payload, not a
    // section id. Never look it up (or decode it): just start at the top.
    if (pathname === "/sync" || pathname === "/shared") {
      lenisRef.current?.scrollTo(0, { immediate: true });
      return undefined;
    }

    const id = decodeURIComponent(hash.slice(1));

    if (pathname === "/" && LEGACY_HASHES[id]) {
      navigate(LEGACY_HASHES[id], { replace: true });
      return undefined;
    }

    if (!id) {
      lenisRef.current?.scrollTo(0, { immediate: true });
      return undefined;
    }

    let frame;
    let tries = 0;
    const seek = () => {
      const target = document.getElementById(id);
      if (target) {
        const lenis = lenisRef.current;
        if (lenis) {
          // Lenis measures the page when it's created and on resize
          // events, so re-measure first: right after a route change its
          // idea of the page height can still be the previous (shorter)
          // page, which would clamp the scroll to 0.
          lenis.resize();
          lenis.scrollTo(target, { offset: HEADER_OFFSET });
        } else {
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + HEADER_OFFSET });
        }
        return;
      }
      if (tries++ < 120) frame = requestAnimationFrame(seek);
    };
    seek();
    return () => cancelAnimationFrame(frame);
    // lenisRef is a ref (stable identity) — the effect only needs to
    // re-run when the location changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, hash, key]);

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
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/for-educators" element={<ForEducators />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/about" element={<About />} />
            <Route path="/digital-journey" element={<DigitalJourney />} />
            <Route path="/offline-journey" element={<OfflineJourney />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/custom" element={<CustomListsPage />} />
            <Route path="/custom/:listId" element={<CustomListPage />} />
            <Route path="/shared" element={<SharedListPage />} />
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
