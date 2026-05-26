import { Global, Module } from "@nestjs/common";
import { Env } from "../config/env.schema";
import { createDatabase, AppDb } from "./db";

export const DATABASE = Symbol("DATABASE");

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [Env],
      useFactory: (env: Env): AppDb => createDatabase(env.DATABASE_URL),
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
