import { Client, GatewayIntentBits } from "discord.js";
import * as Config from "./1-config.js";
import * as Effect from "./2-effect.js";

export const create = ({ feature }: { feature: string }) => {
  const perms = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ];

  const client = new Client({ intents: perms });

  const config = Config.read("discord");

  return new Proxy(client, {
    get: (target, prop, receiver) => {
      switch (prop) {
        case "login": {
          const original = Reflect.get(target, prop, receiver);
          return () => {
            const effect = Effect.create({
              api: "discord",
              feature,
              request: "register",
            });

            try {
              const result = original.call(target, config.botToken);

              if (result instanceof Promise) {
                result
                  .then(() => {
                    effect.success();
                  })
                  .catch((err) => {
                    effect.failure(err, "login threw an error");
                  });
              } else {
                effect.success();
              }

              return result;
            } catch (err) {
              effect.failure(err, "login threw an error");
              throw err;
            }
          };
        }
        case "on": {
          const original = Reflect.get(target, prop, receiver);
          return (
            event: string,
            handler: (...args: unknown[]) => Promise<void>
          ) => {
            Effect.create({
              api: "discord",
              feature: "on",
              request: "register",
              metadata: { event },
            }).success();

            return original.call(
              target,
              event,
              async (...args: unknown[]): Promise<void> => {
                const effect = Effect.create({
                  api: "discord",
                  feature: "on-event",
                  request: event,
                });

                try {
                  effect.attempt();

                  const result = await handler(...args);

                  effect.success();

                  return result;
                } catch (err) {
                  effect.failure(err, "handler threw an error");
                  throw err;
                }
              }
            );
          };
        }
        default:
          return Reflect.get(target, prop, receiver);
      }
    },
  });
};
