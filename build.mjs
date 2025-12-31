import fs from "node:fs/promises";
import path from "node:path";

const REF = "v3.0"; // pick a tag from releases, or use "master"
const STATES_URL = `https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/${REF}/json/states.json`;
const CITIES_URL = `https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/${REF}/json/cities.json`;

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}\n${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${url}\n${text.slice(0, 200)}`);
  }
}

async function main() {
  const [states, cities] = await Promise.all([fetchJson(STATES_URL), fetchJson(CITIES_URL)]);

  // 1) India states list (API #1)
  const indiaStates = states
    .filter(s => s.country_code === "IN")
    .map(s => ({
      state_code: s.state_code,  // e.g., "KA"
      name: s.name,              // e.g., "Karnataka"
      id: s.id
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // 2) Cities per state_code (API #2)
  const indiaCities = cities.filter(c => c.country_code === "IN");

  // Create dist folders
  await fs.mkdir("dist/cities", { recursive: true });

  // Write states.json
  await fs.writeFile("dist/states.json", JSON.stringify(indiaStates, null, 2));

  // Group cities by state_code and write one file per state
  const citiesByState = new Map();
  for (const c of indiaCities) {
    const code = c.state_code || "UNKNOWN";
    if (!citiesByState.has(code)) citiesByState.set(code, []);
    citiesByState.get(code).push({ name: c.name, id: c.id });
  }

  for (const [state_code, list] of citiesByState.entries()) {
    // Sort city list
    list.sort((a, b) => a.name.localeCompare(b.name));

    const outPath = path.join("dist", "cities", `${state_code}.json`);
    await fs.writeFile(outPath, JSON.stringify(list, null, 2));
  }

  console.log("✅ Generated:");
  console.log("   dist/states.json");
  console.log("   dist/cities/<STATE_CODE>.json (one per state)");
}

main().catch(err => {
  console.error("❌ Build failed:", err.message);
  process.exit(1);
});
