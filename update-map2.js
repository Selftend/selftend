const fs = require("fs");
let map = fs.readFileSync("map-1175b.md", "utf8");
const decision = fs.readFileSync("decision-1205.md", "utf8").trim();

if (map.includes("issues/1205) —")) {
  console.error("map already carries a 1205 decision — aborting");
  process.exit(1);
}

const fogHeading = "\n## Not yet specified";
const idx = map.indexOf(fogHeading);
if (idx < 0) throw new Error("fog heading not found");
map = `${map.slice(0, idx).replace(/\s+$/, "")}\n\n${decision}\n${map.slice(idx)}`;

// The map is now complete: every child ticket is closed and the fog is empty.
const before = map;
map = map.replace(
  /## Not yet specified\n\n[\s\S]*?(?=\n## Out of scope)/,
  "## Not yet specified\n\n_Empty — and now final. Every child ticket is closed and no fog remains: the way to the destination is clear. **This map is complete; the next step is `/to-spec` on #1175, then `/to-tickets`.**_\n",
);
if (map === before) throw new Error("could not rewrite the fog section");

fs.writeFileSync("map-1175b-new.md", map);
console.log("ok, bytes:", map.length);
