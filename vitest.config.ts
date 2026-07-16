import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/public-api/index.ts",
        "src/public-api/version.ts",
        "src/domain/events/**",
        "src/domain/customer/**",
        "src/domain/payment/payment-attempt.ts",
        "src/domain/payment/payment-channel.ts",
        "src/domain/payment/payment-request.ts",
        "src/domain/payment/payment.ts",
        "src/domain/refund/refund.ts",
        "src/domain/webhook/**",
        "src/domain/metadata/**",
        "src/application/ports/**",
        "src/application/payment-client.ts",
        "src/application/client-config.ts",
        "src/infrastructure/providers/paystack/paystack-types.ts",
      ],
      thresholds: {
        statements: 65,
        branches: 60,
        functions: 65,
        lines: 65,
      },
    },
  },
});
