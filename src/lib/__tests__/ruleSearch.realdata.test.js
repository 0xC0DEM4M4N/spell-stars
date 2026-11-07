import fs from "fs";
import path from "path";
import { flattenYears, searchRules } from "../ruleSearch";

const slugs = ["reception", "year1", "year2", "year3", "year4", "year5", "year6"];
const byYear = Object.fromEntries(
  slugs.map((s) => [s, JSON.parse(fs.readFileSync(path.join(__dirname, "../../../public/data", s, "words.json"), "utf8"))]),
);
const entries = flattenYears(byYear, slugs);

test("-le ending finds the -le words and only the -le learning points", () => {
  const r = searchRules("-le ending", entries);
  expect(r.words.map((w) => w.word)).toEqual(expect.arrayContaining(["table", "apple", "little"]));
  expect(r.points.some((p) => p.year === "year2" && p.focus === "-le ending")).toBe(true);
  expect(r.points.some((p) => /-less/.test(p.focus) && !/-le(?![a-z])/.test(p.focus))).toBe(false);
});

test("/ee/ finds words in the year lists", () => {
  expect(searchRules("/ee/", entries).words.map((w) => w.word)).toEqual(expect.arrayContaining(["tree", "feet", "knee"]));
});

test("kn- and wr- find the start-of-word weeks", () => {
  expect(searchRules("kn-", entries).words.map((w) => w.word)).toEqual(expect.arrayContaining(["knee", "knot", "know"]));
  expect(searchRules("wr at the start", entries).points.some((p) => p.year === "year2")).toBe(true);
});
