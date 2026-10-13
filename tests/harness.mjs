// Loads every src/*.js file into one V8 context, the way Apps Script does, with in-memory
// stand-ins for the few Apps Script services that pure logic touches. Sheet-building code is
// not exercised here; it needs a real spreadsheet.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const SRC_DIR = fileURLToPath(new URL("../src/", import.meta.url));

function memoryProperties() {
  const store = new Map();
  return {
    getProperty: (k) => (store.has(k) ? store.get(k) : null),
    setProperty: (k, v) => {
      store.set(k, String(v));
    },
    setProperties: (o) => {
      Object.entries(o).forEach(([k, v]) => store.set(k, String(v)));
    },
    deleteProperty: (k) => {
      store.delete(k);
    },
    getKeys: () => [...store.keys()],
    raw: store,
  };
}

function formatDate(date, timeZone, pattern) {
  if (pattern === "yyyy-MM-dd HH:mm:ss Z") return date.toISOString();
  if (pattern !== "yyyy-MM-dd")
    throw new Error(`stub formatDate: unsupported pattern ${pattern}`);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function loadApp() {
  const docProps = memoryProperties();
  const context = vm.createContext({
    console,
    PropertiesService: { getDocumentProperties: () => docProps },
    Utilities: { formatDate },
  });
  const dir = SRC_DIR;
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .sort()) {
    vm.runInContext(readFileSync(join(dir, file), "utf8"), context, {
      filename: `src/${file}`,
    });
  }
  const run = (expr) => vm.runInContext(expr, context);
  return { run, docProps, context };
}

/** Top-level declarations per file, to detect names declared twice across files. */
export function topLevelDeclarations() {
  const dir = SRC_DIR;
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .flatMap((f) =>
      [
        ...readFileSync(join(dir, f), "utf8").matchAll(
          /^(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm,
        ),
      ].map((m) => ({ file: f, name: m[1] })),
    );
}
