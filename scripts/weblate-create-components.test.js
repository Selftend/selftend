const {
  componentName,
  namespacesFromFilenames,
  selectMissing,
  buildPayload,
  verifyComponent,
  createComponent,
  componentsNeedingIndentFix,
  indentFixPayload,
  fixComponentIndent,
  repairIndents,
  pluralCollisions,
  rawFileUrl,
  screenNamespaces,
  rootComponent,
  healthProblems,
  updateRepository,
  fetchAlerts,
  finishPass,
  passExitCode,
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

// The two components created before this script existed had their JSON indentation
// auto-detected and guessed wrong (5 for cbt, 3 for common). The first Weblate edit
// to either would rewrite the whole file at that width, so the pass repairs them.
describe("indent repair", () => {
  // The full five-key shape the live API returns, so the tests can prove the other
  // four survive the write.
  const liveParams = (overrides = {}) => ({
    dos_eol: false,
    json_indent: 5,
    json_sort_keys: false,
    json_indent_style: "spaces",
    json_use_compact_separators: false,
    ...overrides,
  });
  const drifted = (slug, indent, overrides = {}) => ({
    slug,
    is_glossary: false,
    file_format_params: liveParams({ json_indent: indent }),
    ...overrides,
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

  const patchedOk = (indent) => ({
    status: 200,
    body: { file_format_params: liveParams({ json_indent: indent }) },
  });

  describe("componentsNeedingIndentFix", () => {
    it("picks out exactly the two drifted components in the live project state", () => {
      const components = [
        drifted("cbt", 5),
        drifted("common", 3),
        drifted("auth", 2),
        drifted("errors", 2),
      ];
      expect(componentsNeedingIndentFix(components).map((c) => c.slug)).toEqual(["cbt", "common"]);
    });

    it("leaves the glossary alone - it tracks no locale file, so its indent cannot reformat one", () => {
      const components = [drifted("glossary", 5, { is_glossary: true })];
      expect(componentsNeedingIndentFix(components)).toEqual([]);
    });

    // An absent field means "unknown", not "wrong". Repairing it would be an
    // unasked-for write to a component the pass did not create - including
    // possibly `auth`, the root every other component inherits from. --verify
    // still reports it, so a human sees it either way.
    it("leaves a component with no file_format_params alone rather than blind-writing to it", () => {
      expect(componentsNeedingIndentFix([{ slug: "auth", is_glossary: false }])).toEqual([]);
    });

    it("returns nothing once every component is already at two spaces", () => {
      expect(componentsNeedingIndentFix([drifted("cbt", 2), drifted("common", 2)])).toEqual([]);
    });
  });

  describe("indentFixPayload", () => {
    it("forces the indent to two spaces", () => {
      expect(indentFixPayload(drifted("cbt", 5)).file_format_params.json_indent).toBe(2);
    });

    it("resends the server's other format params so a replacing PATCH cannot drop them", () => {
      const payload = indentFixPayload(drifted("cbt", 5));
      expect(payload.file_format_params).toEqual({
        dos_eol: false,
        json_indent: 2,
        json_sort_keys: false,
        json_indent_style: "spaces",
        json_use_compact_separators: false,
      });
    });

    it("touches nothing but the format params", () => {
      expect(Object.keys(indentFixPayload(drifted("cbt", 5)))).toEqual(["file_format_params"]);
    });
  });

  describe("fixComponentIndent", () => {
    it("PATCHes the component endpoint rather than re-creating it", async () => {
      const { request, calls } = stubRequest([patchedOk(2), patchedOk(2)]);
      await fixComponentIndent(drifted("cbt", 5), { request });
      expect(calls[0].method).toBe("PATCH");
      expect(calls[0].url).toBe(`${API_ROOT}/components/selftend/cbt/`);
      expect(calls[0].body.file_format_params.json_indent).toBe(2);
    });

    it("re-reads the component afterwards instead of trusting the status code", async () => {
      const { request, calls } = stubRequest([patchedOk(2), patchedOk(2)]);
      await fixComponentIndent(drifted("cbt", 5), { request });
      expect(calls[1].method).toBe("GET");
      expect(calls[1].url).toBe(`${API_ROOT}/components/selftend/cbt/`);
    });

    // The API docs list file_format_params as writable under PUT but not under PATCH,
    // so a 200 is not proof the value took. A silent no-op here would leave the pass
    // believing it fixed something it did not.
    it("fails loudly when the PATCH is accepted but the indent did not actually change", async () => {
      const { request } = stubRequest([patchedOk(5), patchedOk(5)]);
      await expect(fixComponentIndent(drifted("cbt", 5), { request })).rejects.toThrow(
        /still reports json_indent 5/,
      );
    });

    it("points at the manual UI fallback when the API ignores the field", async () => {
      const { request } = stubRequest([patchedOk(5), patchedOk(5)]);
      await expect(fixComponentIndent(drifted("cbt", 5), { request })).rejects.toThrow(
        /JSON indentation/,
      );
    });

    it("throws with the server's message when the PATCH is rejected", async () => {
      const { request } = stubRequest([
        { status: 403, body: { detail: "You do not have permission." } },
      ]);
      await expect(fixComponentIndent(drifted("cbt", 5), { request })).rejects.toThrow(
        /permission/,
      );
    });

    it("reports the repaired slug so the pass can summarise what it touched", async () => {
      const { request } = stubRequest([patchedOk(2), patchedOk(2)]);
      expect(await fixComponentIndent(drifted("cbt", 5), { request })).toEqual({
        slug: "cbt",
        json_indent: 2,
      });
    });
  });

  describe("repairIndents", () => {
    it("repairs every drifted component", async () => {
      const { request, calls } = stubRequest([
        patchedOk(2),
        patchedOk(2),
        patchedOk(2),
        patchedOk(2),
      ]);
      const failures = await repairIndents([drifted("cbt", 5), drifted("common", 3)], { request });
      expect(failures).toEqual([]);
      expect(calls.filter((c) => c.method === "PATCH").map((c) => c.url)).toEqual([
        `${API_ROOT}/components/selftend/cbt/`,
        `${API_ROOT}/components/selftend/common/`,
      ]);
    });

    // One rejected PATCH must not strand the components behind it in the queue.
    it("keeps going after a failure and reports it against the right slug", async () => {
      const { request, calls } = stubRequest([
        { status: 403, body: { detail: "You do not have permission." } },
        patchedOk(2),
        patchedOk(2),
      ]);
      const failures = await repairIndents([drifted("cbt", 5), drifted("common", 3)], { request });
      expect(failures).toHaveLength(1);
      expect(failures[0]).toMatch(/^cbt: /);
      expect(calls.some((c) => c.url.endsWith("/common/"))).toBe(true);
    });

    it("writes nothing when there is nothing to repair", async () => {
      const { request, calls } = stubRequest([]);
      expect(await repairIndents([], { request })).toEqual([]);
      expect(calls).toEqual([]);
    });

    it("reports through the injected logger rather than writing straight to the console", async () => {
      const log = jest.fn();
      const logError = jest.fn();
      const { request } = stubRequest([
        { status: 403, body: { detail: "nope" } },
        patchedOk(2),
        patchedOk(2),
      ]);
      await repairIndents([drifted("cbt", 5), drifted("common", 3)], { request, log, logError });
      expect(logError).toHaveBeenCalledWith(expect.stringMatching(/FAILED cbt/));
      expect(log).toHaveBeenCalledWith(expect.stringMatching(/common/));
    });
  });
});

// Weblate tracks `main`, not `dev`. A namespace whose file on `main` still carries
// a shape Weblate reads as broken would come up with error-level alerts the moment
// its component exists - and #1103 established that Libre approval is gated on zero
// of those. The pass screens every namespace against the tracked branch first.
describe("tracked-branch preconditions", () => {
  describe("pluralCollisions", () => {
    it("finds a bare key sitting next to its own _other form", () => {
      expect(
        pluralCollisions({
          program: {
            statChoicePoints: "{{count}} choice point mapped",
            statChoicePoints_other: "{{count}} choice points mapped",
          },
        }),
      ).toEqual(["program.statChoicePoints"]);
    });

    it("reports the four act keys that hold this ticket, and only those", () => {
      expect(
        pluralCollisions({
          program: {
            statChoicePoints: "a",
            statChoicePoints_other: "b",
            statDefusion: "a",
            statDefusion_other: "b",
            statExpansion: "a",
            statExpansion_other: "b",
            statActions: "a",
            statActions_other: "b",
            title: "ACT",
          },
        }),
      ).toEqual([
        "program.statActions",
        "program.statChoicePoints",
        "program.statDefusion",
        "program.statExpansion",
      ]);
    });

    it("passes the repaired _one/_other pair - that is the shape v4 wants", () => {
      expect(
        pluralCollisions({
          program: {
            statChoicePoints_one: "{{count}} choice point mapped",
            statChoicePoints_other: "{{count}} choice points mapped",
          },
        }),
      ).toEqual([]);
    });

    it("catches every CLDR plural suffix, not just _other", () => {
      expect(pluralCollisions({ a: "x", a_zero: "x", b: "x", b_many: "x" })).toEqual(["a", "b"]);
    });

    // `_otherwise` is not a plural category; treating any underscore suffix as one
    // would withhold namespaces over ordinary key names.
    it("does not mistake a key that merely starts with a plural suffix for a collision", () => {
      expect(pluralCollisions({ label: "x", label_otherwise: "y", label_ones: "z" })).toEqual([]);
    });

    it("keeps the two halves of a collision apart when they live at different depths", () => {
      expect(
        pluralCollisions({ stat: "bare", nested: { stat_other: "unrelated namesake" } }),
      ).toEqual([]);
    });

    // Policy screens load structured arrays through `returnObjects`; an array is a
    // leaf value here, not a level to walk into.
    it("treats an array value as a leaf", () => {
      expect(pluralCollisions({ sections: ["one", "two"], sections_other: "x" })).toEqual([
        "sections",
      ]);
    });
  });

  describe("rawFileUrl", () => {
    it("points at the namespace file on the branch Weblate tracks", () => {
      expect(
        rawFileUrl({ repo: "https://github.com/Selftend/selftend", branch: "main" }, "act"),
      ).toBe(
        "https://raw.githubusercontent.com/Selftend/selftend/main/src/i18n/locales/en/act.json",
      );
    });

    it("tolerates the .git suffix and a trailing slash on the repo URL", () => {
      expect(
        rawFileUrl({ repo: "https://github.com/Selftend/selftend.git/", branch: "main" }, "mood"),
      ).toBe(
        "https://raw.githubusercontent.com/Selftend/selftend/main/src/i18n/locales/en/mood.json",
      );
    });

    // Guessing a URL for a repo we cannot read would turn every screening fetch into
    // a 404 and withhold all 13 namespaces for the wrong reason.
    it("refuses to guess for a repo host it cannot read", () => {
      expect(() =>
        rawFileUrl({ repo: "git@gitlab.com:selftend/selftend.git", branch: "main" }, "act"),
      ).toThrow(/GitHub/);
    });
  });

  describe("screenNamespaces", () => {
    const root = { repo: "https://github.com/Selftend/selftend", branch: "main" };
    const stubFetch = (byNs) =>
      jest.fn(async (url) => {
        const ns = url.split("/").pop().replace(".json", "");
        const entry = byNs[ns];
        if (!entry) throw new Error(`unexpected fetch: ${url}`);
        return entry;
      });

    it("lets a namespace through when its file on the tracked branch is clean", async () => {
      const fetchText = stubFetch({ mood: { status: 200, text: '{"title":"Mood"}' } });
      const screened = await screenNamespaces(["mood"], root, { fetchText });
      expect(screened.ready).toEqual(["mood"]);
      expect(screened.withheld).toEqual([]);
    });

    it("withholds a namespace whose tracked-branch file has plural collisions, naming the keys", async () => {
      const fetchText = stubFetch({
        act: { status: 200, text: '{"program":{"stat":"a","stat_other":"b"}}' },
      });
      const screened = await screenNamespaces(["act"], root, { fetchText });
      expect(screened.ready).toEqual([]);
      expect(screened.withheld).toHaveLength(1);
      expect(screened.withheld[0].ns).toBe("act");
      expect(screened.withheld[0].reason).toMatch(/program\.stat/);
      expect(screened.withheld[0].reason).toMatch(/main/);
    });

    // The filemask finds no file and the creation fails with "Could not find any
    // matching file" - the same dev-is-ahead-of-main cause, caught before the POST.
    it("withholds a namespace that has not reached the tracked branch at all", async () => {
      const fetchText = stubFetch({ brandnew: { status: 404, text: "404: Not Found" } });
      const screened = await screenNamespaces(["brandnew"], root, { fetchText });
      expect(screened.ready).toEqual([]);
      expect(screened.withheld[0].reason).toMatch(/not on main/);
    });

    // A transient upstream failure read as "clean" is the one outcome that defeats
    // the guard entirely, so it stops the pass instead.
    it("throws rather than assuming clean when the fetch fails unexpectedly", async () => {
      const fetchText = stubFetch({ mood: { status: 500, text: "boom" } });
      await expect(screenNamespaces(["mood"], root, { fetchText })).rejects.toThrow(/500/);
    });

    it("throws rather than assuming clean when the tracked file is not parseable JSON", async () => {
      const fetchText = stubFetch({ mood: { status: 200, text: "<!DOCTYPE html>" } });
      await expect(screenNamespaces(["mood"], root, { fetchText })).rejects.toThrow(/parse/i);
    });

    it("screens each namespace independently so one blocked file cannot strand the rest", async () => {
      const fetchText = stubFetch({
        act: { status: 200, text: '{"stat":"a","stat_other":"b"}' },
        mood: { status: 200, text: "{}" },
        sleep: { status: 200, text: "{}" },
      });
      const screened = await screenNamespaces(["act", "mood", "sleep"], root, { fetchText });
      expect(screened.ready).toEqual(["mood", "sleep"]);
      expect(screened.withheld.map((w) => w.ns)).toEqual(["act"]);
    });
  });

  describe("rootComponent", () => {
    it("finds the component every other one links to", () => {
      const components = [
        { slug: "cbt", is_glossary: false },
        { slug: "auth", is_glossary: false, repo: "https://github.com/Selftend/selftend" },
      ];
      expect(rootComponent(components).slug).toBe("auth");
    });

    it("fails loudly when auth is absent instead of screening against a guess", () => {
      expect(() => rootComponent([{ slug: "cbt", is_glossary: false }])).toThrow(/auth/);
    });
  });
});

// Run-order step 4: after the creations, pull the repository and confirm the
// project is clean before the owner revokes the token.
describe("post-pass health", () => {
  describe("healthProblems", () => {
    it("reports nothing when every namespace is tracked and no check is failing", () => {
      expect(
        healthProblems({
          statistics: { failing: 0, translated_percent: 100 },
          namespaces: ["act", "mood"],
          components: [
            { slug: "act", is_glossary: false },
            { slug: "mood", is_glossary: false },
          ],
        }),
      ).toEqual([]);
    });

    it("reports failing checks", () => {
      const problems = healthProblems({
        statistics: { failing: 4 },
        namespaces: [],
        components: [],
      });
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatch(/4 failing check/);
    });

    it("reports namespaces that still have no component", () => {
      const problems = healthProblems({
        statistics: { failing: 0 },
        namespaces: ["act", "mood"],
        components: [{ slug: "mood", is_glossary: false }],
      });
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatch(/act/);
    });

    // The glossary is a real component but tracks no namespace file, so it must not
    // be counted as coverage for one.
    it("does not let the glossary stand in for a namespace", () => {
      const problems = healthProblems({
        statistics: { failing: 0 },
        namespaces: ["act"],
        components: [{ slug: "act", is_glossary: true }],
      });
      expect(problems).toHaveLength(1);
    });
  });

  // The standing instruction on this project is to pull only while outgoing
  // commits are 0: Weblate pushes through a pull request whose path is still
  // untested live (#1104), and pulling over pending local work is how a component
  // gets wedged.
  describe("updateRepository", () => {
    const clean = {
      status: 200,
      body: { needs_commit: false, needs_merge: false, needs_push: false },
    };

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

    it("reads the repository status before it pulls", async () => {
      const { request, calls } = stubRequest([clean, { status: 200, body: { result: true } }]);
      await updateRepository({ request });
      expect(calls[0].method).toBe("GET");
      expect(calls[0].url).toBe(`${API_ROOT}/projects/selftend/repository/`);
    });

    it("POSTs the documented update operation once the status is clean", async () => {
      const { request, calls } = stubRequest([clean, { status: 200, body: { result: true } }]);
      expect(await updateRepository({ request })).toBeNull();
      expect(calls[1].method).toBe("POST");
      expect(calls[1].url).toBe(`${API_ROOT}/projects/selftend/repository/`);
      expect(calls[1].body).toEqual({ operation: "update" });
    });

    it("refuses to pull over uncommitted work", async () => {
      const { request, calls } = stubRequest([{ status: 200, body: { needs_commit: true } }]);
      const problem = await updateRepository({ request });
      expect(problem).toMatch(/needs_commit/);
      expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
    });

    it("refuses to pull while a push is still outstanding", async () => {
      const { request, calls } = stubRequest([{ status: 200, body: { needs_push: true } }]);
      const problem = await updateRepository({ request });
      expect(problem).toMatch(/needs_push/);
      expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
    });

    // An unreadable status is treated exactly like a dirty one - the point of the
    // check is not to pull without knowing.
    it("does not pull blind when the status cannot be read", async () => {
      const { request, calls } = stubRequest([{ status: 403, body: { detail: "nope" } }]);
      const problem = await updateRepository({ request });
      expect(problem).toMatch(/not pulling blind/);
      expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
    });

    // A failed pull is worth reporting but must not bury the creations that just
    // succeeded, so it comes back as a problem string rather than a throw.
    it("returns the failure instead of throwing so a finished pass is still reported", async () => {
      const { request } = stubRequest([clean, { status: 403, body: { detail: "no permission" } }]);
      expect(await updateRepository({ request })).toMatch(/no permission/);
    });
  });

  describe("fetchAlerts", () => {
    it("returns the alert names for a component", async () => {
      const request = jest.fn(async () => ({
        status: 200,
        body: { results: [{ name: "RepositoryOutdated" }, { name: "DuplicateString" }] },
      }));
      expect(await fetchAlerts("cbt", { request })).toEqual([
        "RepositoryOutdated",
        "DuplicateString",
      ]);
    });

    // Alerts need the token; a read that fails should not fail the pass, because the
    // owner can still see them in the UI.
    it("comes back null when the alerts endpoint cannot be read", async () => {
      const request = jest.fn(async () => ({ status: 404, body: "" }));
      expect(await fetchAlerts("cbt", { request })).toBeNull();
    });
  });

  describe("finishPass", () => {
    // One stub for the whole closing sequence: repository status, the pull,
    // the component list, project statistics, then one alerts read per component.
    const stubProject = ({ alerts = { status: 200, body: { results: [] } }, failing = 0 } = {}) => {
      const request = jest.fn(async (method, url) => {
        if (url.endsWith("/repository/") && method === "GET") {
          return { status: 200, body: { needs_commit: false, needs_push: false } };
        }
        if (url.endsWith("/repository/")) return { status: 200, body: { result: true } };
        if (url.includes("/alerts/")) return alerts;
        if (url.includes("/statistics/")) return { status: 200, body: { failing } };
        return {
          status: 200,
          body: { results: [{ slug: "mood", is_glossary: false }], next: null },
        };
      });
      return request;
    };

    it("reports nothing to fix when the project is clean", async () => {
      expect(await finishPass(["mood"], { request: stubProject() })).toEqual([]);
    });

    it("reports failing checks", async () => {
      const problems = await finishPass(["mood"], { request: stubProject({ failing: 3 }) });
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatch(/3 failing check/);
    });

    // The regression this exists for: a token without component-manage rights makes
    // every alerts read fail, and folding that into "nothing to report" would hand
    // back a clean bill of health on the one check Libre approval is gated on.
    it("never reports a clean bill of health when the alerts could not be read", async () => {
      const log = jest.fn();
      const problems = await finishPass(["mood"], {
        request: stubProject({ alerts: { status: 403, body: { detail: "nope" } } }),
        log,
      });
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatch(/NOT made/);
      expect(log).not.toHaveBeenCalledWith(expect.stringMatching(/no alerts reported/));
    });

    it("says so plainly when every component really is alert-free", async () => {
      const log = jest.fn();
      await finishPass(["mood"], { request: stubProject(), log });
      expect(log).toHaveBeenCalledWith(expect.stringMatching(/no alerts reported/));
    });

    it("carries a refused pull through as a problem", async () => {
      const request = jest.fn(async (method, url) => {
        if (url.endsWith("/repository/") && method === "GET") {
          return { status: 200, body: { needs_push: true } };
        }
        if (url.includes("/alerts/")) return { status: 200, body: { results: [] } };
        if (url.includes("/statistics/")) return { status: 200, body: { failing: 0 } };
        return { status: 200, body: { results: [{ slug: "mood", is_glossary: false }] } };
      });
      const problems = await finishPass(["mood"], { request });
      expect(problems.some((p) => /needs_push/.test(p))).toBe(true);
    });

    it("writes through the injected logger rather than the global console", async () => {
      const log = jest.fn();
      const logError = jest.fn();
      await finishPass(["mood"], { request: stubProject({ failing: 1 }), log, logError });
      expect(log).toHaveBeenCalled();
      expect(logError).toHaveBeenCalledWith(expect.stringMatching(/failing check/));
    });
  });

  // Nothing may read a run that left namespaces behind as "all 20 tracked".
  describe("passExitCode", () => {
    it("is 0 only when nothing failed, nothing is wrong, and nothing was withheld", () => {
      expect(passExitCode({ failures: [], problems: [], withheld: [] })).toBe(0);
    });

    it("is 1 when a namespace was withheld, even though withholding was correct", () => {
      expect(passExitCode({ failures: [], problems: [], withheld: [{ ns: "act" }] })).toBe(1);
    });

    it("is 1 when a creation failed", () => {
      expect(passExitCode({ failures: ["act: boom"], problems: [], withheld: [] })).toBe(1);
    });

    it("is 1 when the closing health check found a problem", () => {
      expect(passExitCode({ failures: [], problems: ["4 failing check(s)"], withheld: [] })).toBe(
        1,
      );
    });
  });
});
