import { z } from "zod";
import * as Env from "./0-env.js";
import postgres from "postgres";

/* *****************************************************************************
 *
 * CONFIG SCHEMAS
 *
 * ****************************************************************************/

const zEnvConfig = z.object({
  name: z.string(),
  env: z.enum(["dev", "production", "test"]),
  instance: z.string(),
  service: z.string(),
});

const zExpressConfig = z.object({
  port: z.number(),
});

const zLoggerConfig = z.object({
  level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]),
});

const zPrismaConfig = z.object({
  connection: z.string(),
});

const zOpenAiConfig = z.object({
  apiKey: z.string(),
  orgs: z.array(z.string()),
});

const zDiscordConfig = z.object({
  botToken: z.string(),
  evalChannelId: z.string(),
  appId: z.string(),
});

const zApiConfig = z.object({});

const zEvalsConfig = z.object({});

const SCHEMAS = {
  env: zEnvConfig,
  express: zExpressConfig,
  logger: zLoggerConfig,
  prisma: zPrismaConfig,
  openAi: zOpenAiConfig,
  discord: zDiscordConfig,
  api: zApiConfig,
  evals: zEvalsConfig,
} as const;

const zRootConfig = z.object({
  name: z.string(),
  env: z.enum(["dev", "production", "test"]),
  instance: z.string(),
  service: z.string(),
  config: z
    .object({
      env: z.unknown(),
      express: z.unknown(),
      logger: z.unknown(),
      prisma: z.unknown(),
      openAi: z.unknown(),
      discord: z.unknown(),
      api: z.unknown(),
      evals: z.unknown(),
    })
    .partial(),
});

/* *****************************************************************************
 *
 * GETTERS
 *
 * ****************************************************************************/

const sql = postgres(Env.PG_CONNECTION_STRING);

const ROOT = await (async () => {
  const [root] = await sql`
    select * from "Environment"
      where name = ${Env.APP_NAME}
      and env = ${Env.APP_ENV}
      and instance = ${Env.APP_INSTANCE}
      and service = ${Env.APP_SERVICE}
    limit 1
  `;

  /* eslint-disable-next-line no-console */
  console.log("ROOT CONFIG", root);

  return zRootConfig.parse(root, {
    errorMap: () => {
      return {
        message: `Failed to parse config from database`,
      };
    },
  });
})();

export const read = <T extends keyof typeof SCHEMAS>(
  key: T
): z.infer<(typeof SCHEMAS)[T]> => {
  return SCHEMAS[key].parse(ROOT.config[key], {
    errorMap: () => {
      return {
        message: `Failed to parse ${key} config from database`,
      };
    },
  });
};
