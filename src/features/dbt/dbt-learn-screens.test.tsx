import { screen } from "@testing-library/react-native";

import DbtLearnGroupScreen from "./dbt-learn-group-screen";
import DbtLearnPrimerScreen from "./dbt-learn-primer-screen";
import { DBT_GROUP_BY_SLUG, DBT_GROUP_SLUGS } from "./dbt-home-config";
import enCbt from "@/src/i18n/locales/en/cbt.json";
import enDbt from "@/src/i18n/locales/en/dbt.json";
import { renderWithProviders } from "@/test/render-with-providers";

let mockPathname = "/modules/dbt/learn";

jest.mock("expo-router", () => ({
  router: { canGoBack: jest.fn(() => false), push: jest.fn() },
  usePathname: () => mockPathname,
  useFocusEffect: jest.fn(),
}));

beforeEach(() => {
  mockPathname = "/modules/dbt/learn";
});

const GROUP_KEYS = Object.keys(DBT_GROUP_SLUGS) as (keyof typeof DBT_GROUP_SLUGS)[];

describe("the DBT learn primer", () => {
  it("teaches what DBT is and why it is called dialectical", () => {
    renderWithProviders(<DbtLearnPrimerScreen />);

    expect(screen.getByText("What DBT is")).toBeTruthy();
    expect(screen.getByText(/It pairs acceptance with change in equal measure/)).toBeTruthy();
    expect(screen.getByText(/two things that seem opposed being true at once/)).toBeTruthy();
  });

  it("offers a door to each of the four groups", () => {
    renderWithProviders(<DbtLearnPrimerScreen />);

    for (const name of [
      "Distress tolerance",
      "Mindfulness",
      "Emotion regulation",
      "Interpersonal effectiveness",
    ]) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  /**
   * ADR-0004's over-use obligation, in DBT's voice: mode over amount, with the
   * professional door as the last sentence and nothing behind it.
   */
  it("teaches mode over amount and names the professional door", () => {
    renderWithProviders(<DbtLearnPrimerScreen />);

    expect(screen.getByText(/more in a day is not more progress/)).toBeTruthy();
    expect(screen.getByText(/worth bringing to a professional/)).toBeTruthy();
  });

  /**
   * ☠️ The same teaching in the same words on a third surface is what
   * `test/over-use-copy.test.ts` pins to two. This asserts the DBT card carries
   * the teaching in its OWN words - a copy edit that reached for CBT's phrasing
   * would turn this red here rather than somewhere unrelated later.
   */
  it("does not reuse the CBT card's signature phrasing", () => {
    renderWithProviders(<DbtLearnPrimerScreen />);

    expect(screen.queryByText(/challenging (that )?has become checking/i)).toBeNull();
    expect(enDbt.learn.pacing.signs).not.toMatch(/challenging (that )?has become checking/i);
    // A positive control: CBT's card really does say it, so the negative above
    // is testing a live phrase rather than one nothing says any more.
    expect(enCbt.learn.pacing.signs).toMatch(/challenging (that )?has become checking/i);
  });

  it("carries the crisis bar, the departure these pages make from their siblings", () => {
    renderWithProviders(<DbtLearnPrimerScreen />);

    expect(screen.getByLabelText("Not for emergencies · Crisis resources")).toBeTruthy();
  });
});

describe.each(GROUP_KEYS)("the %s learn page", (groupKey) => {
  beforeEach(() => {
    mockPathname = `/modules/dbt/learn/${DBT_GROUP_SLUGS[groupKey]}`;
  });

  it("is headed by the group name and renders every authored section", () => {
    renderWithProviders(<DbtLearnGroupScreen groupKey={groupKey} />);

    const group = enDbt.learn.groups[groupKey];
    expect(screen.getAllByText(enDbt.groups[groupKey].name).length).toBeGreaterThan(0);
    // A positive control on the content itself: a `returnObjects` read that
    // came back as a string would render nothing and pass a looser assertion.
    expect(group.sections.length).toBeGreaterThan(0);
    for (const section of group.sections) {
      expect(screen.getByText(section.title)).toBeTruthy();
    }
  });

  it("carries the crisis bar", () => {
    renderWithProviders(<DbtLearnGroupScreen groupKey={groupKey} />);

    expect(screen.getByLabelText("Not for emergencies · Crisis resources")).toBeTruthy();
  });
});

describe("the group slugs", () => {
  it("round-trip between the URL and the copy key", () => {
    for (const key of GROUP_KEYS) {
      expect(DBT_GROUP_BY_SLUG[DBT_GROUP_SLUGS[key]]).toBe(key);
    }
    expect(DBT_GROUP_BY_SLUG["not-a-group"]).toBeUndefined();
  });
});

/**
 * The physical-skills section is the one place in the module that carries
 * medical cautions, and #1985 fixed their shape: told, never asked. A caution
 * that grew into a question, a gate or a stored acknowledgement would be a
 * different thing wearing the same name.
 */
describe("the technique cautions", () => {
  const section = enDbt.learn.groups.distressTolerance.sections.find(
    (candidate) => "cautions" in candidate,
  ) as { cautions: string[] } | undefined;

  it("exist on the physical skills, and nowhere else in the module", () => {
    expect(section?.cautions.length).toBe(4);
    const others = [
      ...enDbt.learn.groups.mindfulness.sections,
      ...enDbt.learn.groups.emotionRegulation.sections,
      ...enDbt.learn.groups.interpersonal.sections,
    ].filter((candidate) => "cautions" in candidate);
    expect(others).toEqual([]);
  });

  it("tell rather than ask - no question, no gate, nothing to acknowledge", () => {
    for (const caution of section?.cautions ?? []) {
      expect(caution).not.toMatch(/\?/);
      expect(caution).not.toMatch(/\bdo you\b|\bhave you\b|\bconfirm\b|\bI understand\b/i);
    }
  });

  it("say cool water rather than ice, and name the four-minute cap only as a cap", () => {
    const cold = section?.cautions.find((line) => /cold water/i.test(line));
    expect(cold).toMatch(/not ice on skin/i);
    expect(cold).toMatch(/Four minutes is the most/i);
  });
});
