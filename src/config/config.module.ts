import { Global, Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule, ConfigService } from "@nestjs/config";
import { Env, validateEnv } from "./env.schema";

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
  ],
  providers: [
    {
      provide: Env,
      useFactory: (cfg: ConfigService) => {
        const env = new Env();
        const validated = validateEnv(process.env);
        Object.assign(env, validated);
        void cfg;
        return env;
      },
      inject: [ConfigService],
    },
  ],
  exports: [Env],
})
export class ConfigModule {}
