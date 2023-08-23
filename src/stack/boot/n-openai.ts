import { z } from "zod";
import { Configuration, OpenAIApi } from "openai";
import * as Config from "./1-config.js";
import * as Effect from "./2-effect.js";

const client = new OpenAIApi(
  new Configuration({
    apiKey: Config.read("openAi").apiKey,
  })
);

type CreateOpenAiInterface = ({ feature }: { feature: string }) => (
  request: string,
  orgId: string
) => {
  createEmbedding: typeof OpenAIApi.prototype.createEmbedding;
  createChatCompletion: typeof OpenAIApi.prototype.createChatCompletion;
};

export const create: CreateOpenAiInterface = ({ feature }) => {
  const effect = Effect.create({
    api: "openai",
    feature,
    request: "register",
  });

  effect.attempt();

  return (request, orgId) => {
    return {
      createEmbedding: async (args) => {
        const effect = Effect.create({
          api: "openai",
          feature,
          request,
          metadata: { model: args.model },
        });

        try {
          const response = await client.createEmbedding(args, {
            headers: { "OpenAI-Organization": orgId },
          });

          z.number().gte(200).lte(299).parse(response.status);

          effect.success();

          return response;
        } catch (err) {
          effect.failure(err, "createEmbedding threw an error");
          throw err;
        }
      },

      createChatCompletion: async (args) => {
        const effect = Effect.create({
          api: "openai",
          feature,
          request,
          metadata: { model: args.model },
        });

        try {
          const response = await client.createChatCompletion(args, {
            headers: { "OpenAI-Organization": orgId },
          });

          z.number().gte(200).lte(299).parse(response.status);

          effect.success();

          return response;
        } catch (err) {
          effect.failure(err, "createChatCompletion threw an error");
          throw err;
        }
      },
    };
  };
};
