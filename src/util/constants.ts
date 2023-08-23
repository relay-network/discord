import { z } from "zod";

export const GPT3TURBO = "gpt-3.5-turbo" as const;
export const GPT4 = "gpt-4" as const;
export const MODEL = z.enum([GPT3TURBO, GPT4]);
export type Model = "gpt-3.5-turbo" | "gpt-4";
export const MAX_TOKENS = 750 as const;

export const EMBEDDING_MODEL = "text-embedding-ada-002" as const;

export const PRICE_PER_TOKEN = {
  GPT4: 0.000045,
  GPT3TURBO: 0.000002,
  EMBEDDING_MODEL: 0.0000004,
} as const;

export const NO_GPT_4 = MODEL.superRefine((val, ctx) => {
  if (val === "gpt-4") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "skipping gpt-4 for question completions",
    });
  }
});
