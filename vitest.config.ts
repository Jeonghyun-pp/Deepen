import { defineConfig } from "vitest/config"
import path from "node:path"
import dotenv from "dotenv"

// .env.local 을 먼저 로드 (lib/env.ts 의 부팅 검증 통과 위해).
// CI 에서는 GitHub Actions secrets 가 process.env 에 직접 주입.
dotenv.config({ path: ".env.local" })

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
})
