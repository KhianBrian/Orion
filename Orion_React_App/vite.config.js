import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const browserEnvironmentKeys = [
  "VITE_API_BASE_URL",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_ANON_KEY",
];

export default defineConfig(({ mode }) => {
  const fileEnvironment = loadEnv(mode, process.cwd(), "");
  const browserEnvironment = Object.fromEntries(browserEnvironmentKeys.map((key) => [
    `import.meta.env.${key}`,
    JSON.stringify(process.env[key] || fileEnvironment[key] || ""),
  ]));

  return {
    plugins: [react(), tailwindcss()],
    // Playwright loads the ignored .env before starting Vite. Prefer those
    // process values over .env.local so browser tests and service-role fixtures
    // always target the same Supabase project.
    define: browserEnvironment,
  };
});
