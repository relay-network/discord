import { ChatInputCommandInteraction } from "discord.js";

export type CommandExecutor = (
  interaction: ChatInputCommandInteraction
) => Promise<{ handled: boolean }>;

export interface AskCommandRegistrationSuccessResponse {
  commandAlias: string;
  ensOrAddress: string;
}

export type AskCommandRegistrationResponse =
  | AskCommandRegistrationSuccessResponse
  | { error: string };
