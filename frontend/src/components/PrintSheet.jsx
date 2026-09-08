export const PrintSheet = ({ week, programmeTitle }) => (
  <section className="print-sheet" data-testid="print-sheet" aria-label={`Printable spelling list for week ${week.week}`}>
    <div style={{ borderBottom: "3px solid #0f172a", paddingBottom: 16 }}>
      <p style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>{programmeTitle}</p>
      <h1 style={{ fontSize: 30, margin: "12px 0 4px" }}>Week {week.week}: {week.focus}</h1>
      <p style={{ margin: 0, color: "#475569" }}>{week.dateLabel} · {week.term}</p>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, margin: "24px 0" }}>
      <p>Name: ______________________</p>
      <p>Date: ______________________</p>
      <p>Score: ________ / 10</p>
    </div>
    <h2 style={{ fontSize: 18 }}>Learning point</h2>
    <p style={{ fontSize: 15, lineHeight: 1.5 }}>{week.learningPoint}</p>
    <h2 style={{ fontSize: 18, marginTop: 28 }}>Spelling list</h2>
    <ol style={{ columns: 2, fontSize: 20, lineHeight: 2, paddingLeft: 0, listStylePosition: "inside" }}>
      {week.words.map((word) => <li key={word.text}>{word.text}{word.challenge ? " *" : ""}</li>)}
    </ol>
    <p style={{ marginTop: 24, color: "#475569", fontSize: 13 }}>* Challenge word — optional extension for quick finishers.</p>
    <h2 style={{ fontSize: 18, marginTop: 28 }}>Dictation practice</h2>
    <p style={{ lineHeight: 2 }}>1. ________________________________________________________________</p>
    <p style={{ lineHeight: 2 }}>2. ________________________________________________________________</p>
  </section>
);
