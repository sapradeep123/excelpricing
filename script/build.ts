import { build } from "esbuild";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function buildApp() {
  console.log("Building client...");
  execSync("npx vite build", { cwd: rootDir, stdio: "inherit" });

  console.log("Building server...");
  await build({
    entryPoints: [path.join(rootDir, "server/index.ts")],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    outfile: path.join(rootDir, "dist/index.cjs"),
    external: [
      "pg-native",
      "better-sqlite3",
      "sqlite3",
      "mysql",
      "mysql2",
      "oracledb",
      "pg-query-stream",
      "tedious",
      "vite",
      "@babel/*",
      "lightningcss",
      "esbuild",
      "tsx",
      "@replit/*",
      "./vite",
      "../vite.config",
      "./vite.config",
      "nanoid",
    ],
    sourcemap: true,
  });

  console.log("Build complete!");
}

buildApp().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
