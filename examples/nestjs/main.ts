import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  await app.listen(3000);
  console.log("NestJS server running on http://localhost:3000");
}

bootstrap().catch((err) => {
  console.error("Failed to bootstrap:", err);
  process.exit(1);
});
