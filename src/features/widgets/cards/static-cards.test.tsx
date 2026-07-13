import { ShortcutCard } from "@/src/features/widgets/cards/shortcut-card";
import { PromptCard } from "@/src/features/widgets/cards/prompt-card";
import { SignedOutCard } from "@/src/features/widgets/cards/signed-out-card";
import { ProgrammeCard } from "@/src/features/widgets/cards/programme-card";
import { widgetTree, texts, clickPaths } from "@/src/features/widgets/cards/widget-tree-helper";

const base = { width: 320, height: 180, theme: "light" as const, opacity: 1 };

describe("ShortcutCard", () => {
  const payload = {
    kind: "shortcut" as const,
    title: "Thought record",
    moduleLabel: "CBT",
    description: "Catch a thought and reframe it.",
    cta: { label: "New record", path: "/modules/cbt/new" },
  };
  it("renders header, description, and outline CTA deep link", () => {
    const tree = widgetTree(
      <ShortcutCard payload={payload} icon="psychology" tint="primary" {...base} />,
    );
    expect(texts(tree)).toEqual([
      "Thought record",
      "CBT",
      "Catch a thought and reframe it.",
      "New record",
    ]);
    expect(clickPaths(tree)).toEqual(["/modules/cbt/new"]);
  });
  it("compact tier drops the description", () => {
    const tree = widgetTree(
      <ShortcutCard payload={payload} icon="psychology" tint="primary" {...base} height={90} />,
    );
    expect(texts(tree)).toEqual(["Thought record", "CBT", "New record"]);
  });
});

describe("PromptCard", () => {
  it("renders prompt and ghost CTA", () => {
    const payload = {
      kind: "prompt" as const,
      title: "Drop anchor",
      moduleLabel: "ACT",
      prompt: "Take 60 seconds to steady yourself.",
      cta: { label: "Begin", path: "/modules/act/connection/drop-anchor" },
    };
    const tree = widgetTree(<PromptCard payload={payload} icon="anchor" tint="act" {...base} />);
    expect(texts(tree)).toContain("Take 60 seconds to steady yourself.");
    expect(clickPaths(tree)).toEqual(["/modules/act/connection/drop-anchor"]);
  });
});

describe("ProgrammeCard", () => {
  it("renders current goals and deep-links each goal and the programme", () => {
    const payload = {
      kind: "programme" as const,
      title: "CBT programme",
      moduleLabel: "CBT",
      state: "in-progress" as const,
      message: null,
      goals: [
        { label: "Notice thoughts", done: false, path: "/modules/cbt/new" },
        { label: "Set goals", done: true, path: "/modules/cbt/goals/new" },
      ],
      moreGoalsLabel: "+1 more goal",
      programmeCta: { label: "Open programme", path: "/modules/cbt" },
    };
    const tree = widgetTree(
      <ProgrammeCard payload={payload} icon="school" tint="primary" {...base} />,
    );

    expect(texts(tree)).toEqual([
      "CBT programme",
      "CBT",
      "Notice thoughts",
      "Set goals",
      "+1 more goal",
      "Open programme",
    ]);
    expect(clickPaths(tree)).toEqual([
      "/modules/cbt/new",
      "/modules/cbt/goals/new",
      "/modules/cbt",
      "/modules/cbt",
    ]);
  });

  it("renders the non-enrolled explanation and programme link", () => {
    const payload = {
      kind: "programme" as const,
      title: "ACT programme",
      moduleLabel: "ACT",
      state: "not-enrolled" as const,
      message: "Review the programme before choosing whether to begin.",
      goals: [],
      moreGoalsLabel: null,
      programmeCta: { label: "View programme", path: "/modules/act" },
    };
    const tree = widgetTree(<ProgrammeCard payload={payload} icon="school" tint="act" {...base} />);

    expect(texts(tree)).toContain("Review the programme before choosing whether to begin.");
    expect(clickPaths(tree)).toEqual(["/modules/act"]);
  });
});

describe("SignedOutCard", () => {
  it("whole card opens the app root", () => {
    const tree = widgetTree(
      <SignedOutCard title="Selftend" cta="Open Selftend" theme="dark" opacity={1} />,
    );
    expect(texts(tree)).toEqual(["Selftend", "Open Selftend"]);
    expect(clickPaths(tree)).toEqual(["/"]);
  });
});
