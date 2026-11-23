import { buildDictationSheet } from "../printSheets";

const lines = [
  { id: 1, text: "The frost is cold.", words: ["frost"] },
  { id: 2, text: "A <b>stamp</b> & a stump sat there.", words: ["stamp", "stump"] },
];

describe("buildDictationSheet", () => {
  const html = buildDictationSheet({ title: "Week 08", topic: "Words with st", meta: "English (UK)", lines });

  test("has a page to write on and a teacher's copy", () => {
    expect(html.match(/class="sheet-page"/g)).toHaveLength(2);
    expect(html).toContain("Teacher's copy");
    expect(html).toContain("Name:");
  });
  test("the pupil page has numbered lines but not the sentences", () => {
    const pupil = html.split('class="sheet-page"')[1];
    expect(pupil).toContain('class="dn">2<');
    expect(pupil).not.toContain("frost");
  });
  test("the teacher page has the sentences, escaped, with the lesson words picked out", () => {
    const teacher = html.split('class="sheet-page"')[2];
    expect(teacher).toContain('<strong class="hl">frost</strong>');
    expect(teacher).toContain("&lt;b&gt;");
    expect(teacher).toContain('<strong class="hl">stump</strong>');
  });
});
