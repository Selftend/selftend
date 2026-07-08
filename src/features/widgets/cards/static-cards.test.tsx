import { ShortcutCard } from "@/src/features/widgets/cards/shortcut-card";
import { PromptCard } from "@/src/features/widgets/cards/prompt-card";
import { SignedOutCard } from "@/src/features/widgets/cards/signed-out-card";
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

describe("SignedOutCard", () => {
  it("whole card opens the app root", () => {
    const tree = widgetTree(
      <SignedOutCard title="Selftend" cta="Open Selftend" theme="dark" opacity={1} />,
    );
    expect(texts(tree)).toEqual(["Selftend", "Open Selftend"]);
    expect(clickPaths(tree)).toEqual(["/"]);
  });
});
