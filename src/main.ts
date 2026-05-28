import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import type { Request, Response, NextFunction } from "express";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { Env } from "./config/env.schema";

const httpLogger = new Logger("HTTP");

function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number((process.hrtime.bigint() - start) / 1_000_000n);
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
      req.ip ||
      "-";
    const status = res.statusCode;
    const level: "log" | "warn" | "error" =
      status >= 500 ? "error" : status >= 400 ? "warn" : "log";
    httpLogger[level](
      `${req.method} ${req.originalUrl} ${status} ${ms}ms · ${ip}`,
    );
  });
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });

  const config = app.get(Env);

  app.use(helmet());
  app.use(cookieParser());
  app.use(requestLogger);
  app.enableCors({
    origin: config.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(config.PORT);
  Logger.log(`API ready on http://localhost:${config.PORT}`, "Bootstrap");
}

bootstrap();
