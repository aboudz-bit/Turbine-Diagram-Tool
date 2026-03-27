import { defineConfig } from "vitest/config";

const prodUrl = process.env.DATABASE_URL ?? "";
const testDbUrl = prodUrl.replace("/heliumdb", "/turbine_test");

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 15000,
    hookTimeout: 30000,
    fileParallelism: false,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    env: {
      DATABASE_URL: testDbUrl || prodUrl,
    },
  },
});
