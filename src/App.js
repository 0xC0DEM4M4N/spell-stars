import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Lenis from "lenis";
import "@/App.css";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Navbar } from "@/components/Navbar";
import { NotesSection } from "@/components/NotesSection";
import { PrintSheet } from "@/components/PrintSheet";
import { WeekCarousel } from "@/components/WeekCarousel";
import { Toaster, toast } from "@/components/ui/sonner";
import programmeData from "@/data/programme.json";

const Home = () => {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const data = programmeData;

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    let frameId;
    const raf = (time) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };
    frameId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, []);

  const activeWeekNumber = selectedWeek ?? data.currentWeek;
  const activeWeek = data.weeks.find((week) => week.week === activeWeekNumber) ?? data.weeks[0];

  const handlePrint = () => {
    toast.success("Printable weekly list ready", {
      description: `Week ${activeWeek.week} is formatted as a clean A4 spelling sheet.`,
    });
    window.print();
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#05070d] text-slate-100" data-testid="app-shell">
      <Navbar activeWeek={activeWeek} totalWeeks={data.totalWeeks} onPrint={handlePrint} />
      <main>
        <Hero programme={data} activeWeek={activeWeek} />
        <WeekCarousel
          weeks={data.weeks}
          currentWeek={data.currentWeek}
          selectedWeek={activeWeek.week}
          onSelectWeek={setSelectedWeek}
          onPrint={handlePrint}
        />
        <NotesSection notes={data.notes} />
      </main>
      <Footer onPrint={handlePrint} />
      <PrintSheet week={activeWeek} programmeTitle={data.title} />
      <Toaster position="bottom-right" />
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
