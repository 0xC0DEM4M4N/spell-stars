import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Lenis from "lenis";
import "@/App.css";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Navbar } from "@/components/Navbar";
import { NotesSection } from "@/components/NotesSection";
import { PrintSheet } from "@/components/PrintSheet";
import { WeekCarousel } from "@/components/WeekCarousel";
import { Toaster, toast } from "@/components/ui/sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#05070d] text-cyan-300" data-testid="loading-screen">
    <div className="font-mono text-sm uppercase tracking-[0.35em]">Loading spell// stars</div>
  </div>
);

const ErrorScreen = ({ message }) => (
  <div className="flex min-h-screen items-center justify-center bg-[#05070d] px-6 text-slate-100" data-testid="error-screen">
    <div className="max-w-md border border-red-400/40 bg-red-950/30 p-8">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-red-300">System error</p>
      <h1 className="mt-4 font-display text-3xl font-bold">Programme data did not load.</h1>
      <p className="mt-4 text-sm text-slate-300">{message}</p>
    </div>
  </div>
);

const Home = () => {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["spelling-programme"],
    queryFn: async () => (await axios.get(`${API}/programme`)).data,
  });

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

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error.message} />;

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
