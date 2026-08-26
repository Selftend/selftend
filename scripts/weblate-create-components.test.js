const {
  componentName,
  namespacesFromFilenames,
  selectMissing,
  buildPayload,
  verifyComponent,
  createComponent,
  API_ROOT,
} = require("./weblate-create-components");

const liveComponent = (slug, overrides = {}) => ({
  slug,
  name: componentName(slug),
  is_glossary: false,
  file_format: "i18nextv4",
  filemask: `src/i18n/locales/*/${slug.toLowerCase()}.json`,
  template: `src/i18n/locales/en/${slug.toLowerCase()}.json`,
  check_flags: "ignore-ellipsis, ignore-reused",
  allow_translation_propagation: false,
  linked_component: `${API_ROOT}/components/selftend/auth/?format=json`,
  file_format_params: { json_indent: 2 },
  ...overrides,
});

describe("namespacesFromFilenames", () => {
  it("keeps only .json files, strips the extension, and sorts", () => {
    expect(namespacesFromFilenames(["mood.json", "act.json", "README.md", "sleep.json"])).toEqual([
      "act",
      "mood",
      "sleep",
    ]);
  });
});

describe("componentName", () => {
  it("upper-cases the acronym namespaces", () => {
    expect(componentName("act")).toBe("ACT");
    expect(componentName("cbt")).toBe("CBT");
  });

  it("capitalizes every other namespace", () => {
    expect(componentName("gratitude")).toBe("Gratitude");
    expect(componentName("notifications")).toBe("Notifications");
  });
});

describe("selectMissing", () => {
  const tracked = ["auth", "cbt", "common", "errors", "navigation", "policies", "settings"];
  const all = [
    "act",
    "auth",
    "cbt",
    "common",
    "errors",
    "gratitude",
    "habits",
    "help",
    "journal",
    "meditation",
    "modules",
    "mood",
    "navigation",
    "notifications",
    "policies",
    "routines",
    "security",
    "settings",
    "sleep",
    "timer",
  ];

  it("returns exactly the 13 untracked namespaces for the live project state", () => {
    expect(
      selectMissing(
        all,
        tracked.map((slug) => liveComponent(slug)),
      ),
    ).toEqual([
      "act",
      "gratitude",
      "habits",
      "help",
      "journal",
      "meditation",
      "modules",
      "mood",
      "notifications",
      "routines",
      "security",
      "sleep",
      "timer",
    ]);
  });

  it("ignores the glossary component so its slug can never shadow a namespace", () => {
    const components = [liveComponent("act", { is_glossary: true })];
    expect(selectMissing(["act"], components)).toEqual(["act"]);
  });

  it("matches slugs case-insensitively so a differently-cased component is not re-created", () => {
    expect(selectMissing(["mood"], [liveComponent("Mood")])).toEqual([]);
  });

  it("returns nothing once every namespace is tracked", () => {
    expect(
      selectMissing(
        tracked,
        tracked.map((slug) => liveComponent(slug)),
      ),
    ).toEqual([]);
  });
});

describe("buildPayload", () => {
  const payload = buildPayload("act");

  it("links the component to auth instead of re-declaring the VCS settings", () => {
    expect(payload.repo).toBe("weblate://selftend/auth");
    expect(payload.vcs).toBeUndefined();
    expect(payload.push).toBeUndefined();
    expect(payload.branch).toBeUndefined();
  });

  it("uses the v4 i18next format, not the legacy v3 one", () => {
    expect(payload.file_format).toBe("i18nextv4");
  });

  it("points the mask and template at the namespace files", () => {
    expect(payload.filemask).toBe("src/i18n/locales/*/act.json");
    expect(payload.template).toBe("src/i18n/locales/en/act.json");
  });

  it("keeps translation propagation off because 135 key paths are reused across namespaces", () => {
    expect(payload.allow_translation_propagation).toBe(false);
  });

  it("carries the agreed check flags", () => {
    expect(payload.check_flags).toBe("ignore-ellipsis, ignore-reused");
  });

  it("pins two-space JSON indentation so a write-back cannot reformat the whole file", () => {
    expect(payload.file_format_params.json_indent).toBe(2);
  });
});

describe("verifyComponent", () => {
  it("reports nothing for a correctly configured component", () => {
    expect(verifyComponent("mood", liveComponent("mood"))).toEqual([]);
  });

  it("catches the legacy v3 file format", () => {
    const problems = verifyComponent("mood", liveComponent("mood", { file_format: "i18next" }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/file_format/);
  });

  it("catches translation propagation left on", () => {
    const problems = verifyComponent(
      "mood",
      liveComponent("mood", { allow_translation_propagation: true }),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/propagation/);
  });

  it("catches a component that is not linked to auth", () => {
    const problems = verifyComponent("mood", liveComponent("mood", { linked_component: null }));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/linked/);
  });

  it("does not ask auth itself to be linked - it is the root every other one links to", () => {
    expect(verifyComponent("auth", liveComponent("auth", { linked_component: null }))).toEqual([]);
  });

  it("catches a JSON indent that would reformat the file on write-back", () => {
    const problems = verifyComponent(
      "mood",
      liveComponent("mood", { file_format_params: { json_indent: 5 } }),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/json_indent/);
  });

  it("catches missing check flags and a wrong filemask together", () => {
    const problems = verifyComponent(
      "mood",
      liveComponent("mood", { check_flags: "", filemask: "locales/*/mood.json" }),
    );
    expect(problems).toHaveLength(2);
  });
});

describe("createComponent", () => {
  const okCreate = () => ({
    status: 201,
    body: { slug: "act", task_url: `${API_ROOT}/tasks/abc/` },
  });

  const stubRequest = (responses) => {
    const calls = [];
    const request = jest.fn(async (method, url, body) => {
      calls.push({ method, url, body });
      const next = responses.shift();
      if (!next) throw new Error(`unexpected request: ${method} ${url}`);
      return next;
    });
    return { request, calls };
  };

  it("POSTs the payload to the project's components endpoint", async () => {
    const { request, calls } = stubRequest([
      okCreate(),
      { status: 200, body: { completed: true } },
    ]);
    await createComponent("act", { request, sleep: async () => {} });
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toBe(`${API_ROOT}/projects/selftend/components/`);
    expect(calls[0].body.slug).toBe("act");
  });

  it("polls task_url until the async creation completes", async () => {
    const { request, calls } = stubRequest([
      okCreate(),
      { status: 200, body: { completed: false } },
      { status: 200, body: { completed: false } },
      { status: 200, body: { completed: true } },
    ]);
    const result = await createComponent("act", { request, sleep: async () => {} });
    expect(result.created).toBe(true);
    expect(calls.filter((c) => c.url.includes("/tasks/"))).toHaveLength(3);
  });

  it("waits between polls instead of hammering the API", async () => {
    const sleep = jest.fn(async () => {});
    const { request } = stubRequest([
      okCreate(),
      { status: 200, body: { completed: false } },
      { status: 200, body: { completed: true } },
    ]);
    await createComponent("act", { request, sleep });
    expect(sleep).toHaveBeenCalled();
  });

  it("does not treat a create response without task_url as unfinished", async () => {
    const { request, calls } = stubRequest([{ status: 201, body: { slug: "act" } }]);
    const result = await createComponent("act", { request, sleep: async () => {} });
    expect(result.created).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it("throws with the server's message when creation is rejected", async () => {
    const { request } = stubRequest([
      { status: 400, body: { filemask: ["Could not find any matching file."] } },
    ]);
    await expect(createComponent("act", { request, sleep: async () => {} })).rejects.toThrow(
      /matching file/,
    );
  });

  it("gives up rather than polling forever when the task never completes", async () => {
    const responses = [okCreate()];
    for (let i = 0; i < 200; i += 1) responses.push({ status: 200, body: { completed: false } });
    const { request } = stubRequest(responses);
    await expect(
      createComponent("act", { request, sleep: async () => {}, maxPolls: 5 }),
    ).rejects.toThrow(/did not complete/);
  });

  it("surfaces a task that completed with an error", async () => {
    const { request } = stubRequest([
      okCreate(),
      { status: 200, body: { completed: true, result: { error: "repository not found" } } },
    ]);
    await expect(createComponent("act", { request, sleep: async () => {} })).rejects.toThrow(
      /repository not found/,
    );
  });
});
