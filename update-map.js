const fs = require("fs");
let map = fs.readFileSync("map-1175.md", "utf8");
const decision = fs.readFileSync("decision-1231.md", "utf8").trim();

if (map.includes("issues/1231)")) {
  console.error("map already references 1231 — aborting to avoid a duplicate");
  process.exit(1);
}

// 1. Append the decision to "Decisions so far" (immediately before the next heading).
const fogHeading = "\n## Not yet specified";
const idx = map.indexOf(fogHeading);
if (idx < 0) throw new Error("could not find the fog heading");
map = `${map.slice(0, idx).replace(/\s+$/, "")}\n\n${decision}\n${map.slice(idx)}`;

// 2. Record the scope boundary ruling 1 draws.
const oosHeading = "## Out of scope\n";
const oosIdx = map.indexOf(oosHeading);
if (oosIdx < 0) throw new Error("could not find the out-of-scope heading");
const insertAt = oosIdx + oosHeading.length;
const bullet =
  "\n- **Supporting viewports narrower than 360dp** (#1231). The measured floor is 360: below ~324px the compact 12-hour time control paints over the reminders row's `Switch`, and the day tap target falls to 32.4px at 320. Ruled unsupported rather than fixed — ⚠️ but the spec must **say so explicitly**, because the failure is silent otherwise.\n";
map = map.slice(0, insertAt) + bullet + map.slice(insertAt);

fs.writeFileSync("map-1175-new.md", map);
console.log("ok, bytes:", map.length);
