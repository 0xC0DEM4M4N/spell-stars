// Named learners (see lib/learners.js): who is practising on this device
// right now, and the roster of everyone who has been added. This sits above
// the router in App.js, next to ThemeProvider, so the header menu and the
// year/list pages all see the same active learner without threading it
// through props.
//
// The roster and the active learner both live in localStorage (so they
// survive a refresh); this context is just a React-friendly view over
// lib/learners.js, kept in sync with a bit of state that bumps whenever
// something changes.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  MAIN_LEARNER_ID,
  addLearner as addLearnerToStorage,
  clearLearnerProgress as clearLearnerProgressInStorage,
  getActiveLearnerId,
  getLearners,
  removeLearner as removeLearnerFromStorage,
  renameLearner as renameLearnerInStorage,
  setActiveLearnerId,
} from "@/lib/learners";

const LearnerContext = createContext(null);

// Whether *someone* has been chosen since this tab was opened -- cleared
// when the tab closes, unlike the remembered active learner. So the first
// person to open the site today is still asked "who's practising?" even
// though the device remembers who practised last night.
const SESSION_CHOSEN_KEY = "spellstars.learnerChosenThisSession";

function readSessionChosen() {
  try {
    return window.sessionStorage.getItem(SESSION_CHOSEN_KEY) === "1";
  } catch (err) {
    return true; // storage unavailable: don't block practice on it
  }
}

function writeSessionChosen() {
  try {
    window.sessionStorage.setItem(SESSION_CHOSEN_KEY, "1");
  } catch (err) {
    // not persisted -- the gate may ask again next reload, not fatal
  }
}

export function LearnersProvider({ children }) {
  const [learners, setLearners] = useState(() => getLearners(window.localStorage));
  const [activeLearnerId, setActiveId] = useState(() => getActiveLearnerId(window.localStorage));
  const [chosen, setChosen] = useState(readSessionChosen);

  const refresh = useCallback(() => {
    setLearners(getLearners(window.localStorage));
    setActiveId(getActiveLearnerId(window.localStorage));
  }, []);

  const selectLearner = useCallback((id) => {
    setActiveLearnerId(window.localStorage, id);
    setActiveId(id);
    writeSessionChosen();
    setChosen(true);
  }, []);

  const addLearner = useCallback((name, { select = false } = {}) => {
    const result = addLearnerToStorage(window.localStorage, name);
    if (result.ok) {
      setLearners(result.learners);
      if (select) selectLearner(result.learner.id);
    }
    return result;
  }, [selectLearner]);

  const renameLearner = useCallback((id, name) => {
    const result = renameLearnerInStorage(window.localStorage, id, name);
    if (result.ok) setLearners(result.learners);
    return result;
  }, []);

  const removeLearner = useCallback((id) => {
    const result = removeLearnerFromStorage(window.localStorage, id);
    if (result.ok) {
      setLearners(result.learners);
      setActiveId(getActiveLearnerId(window.localStorage));
    }
    return result;
  }, []);

  const clearLearnerProgress = useCallback((id) => clearLearnerProgressInStorage(window.localStorage, id), []);

  const activeLearner = learners.find((l) => l.id === activeLearnerId) || learners[0];

  const value = useMemo(
    () => ({
      learners,
      activeLearnerId,
      activeLearner,
      // Whether more than one child has actually been named -- an
      // untouched device with just the implicit main learner doesn't count.
      hasMultipleLearners: learners.length > 1,
      chosenThisSession: chosen,
      selectLearner,
      addLearner,
      renameLearner,
      removeLearner,
      clearLearnerProgress,
      refresh,
    }),
    [learners, activeLearnerId, activeLearner, chosen, selectLearner, addLearner, renameLearner, removeLearner, clearLearnerProgress, refresh],
  );

  return <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>;
}

export function useLearners() {
  const ctx = useContext(LearnerContext);
  if (!ctx) throw new Error("useLearners must be used within a LearnersProvider");
  return ctx;
}

export { MAIN_LEARNER_ID };
