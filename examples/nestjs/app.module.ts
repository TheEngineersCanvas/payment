import { Module } from "@nestjs/common";
import { PaymentModule } from "../../src/adapters/nestjs/index.js";

@Module({
  imports: [
    PaymentModule.forRoot({
      providers: {
        paystack: {
          secretKey: process.env.PAYSTACK_SECRET_KEY ?? "sk_test_fake",
          webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
        },
      },
      defaultProvider: "paystack",
    }),
  ],
})
export class AppModule {}
