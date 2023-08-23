import { z } from "zod";
import {
  ApplicationCommand,
  ChatInputCommandInteraction,
  REST,
  Routes,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  ApplicationCommandOptionType,
} from "discord.js";
import {
  AskCommandRegistrationSuccessResponse,
  CommandExecutor,
} from "../types.js";
import { sPrisma } from "../../../stack/prisma.js";
import { sConfig } from "../../../stack/config.js";

const prisma = sPrisma.create({
  feature: "ask.ts",
});

const env = sConfig.read("discord");

const globalAskCommand = new SlashCommandBuilder()
  .setName("relay")
  .setDescription("Ask a question");

export const registerAskCommandToGuild = async (
  res: AskCommandRegistrationSuccessResponse,
  guildId: string
) => {
  const command = new SlashCommandBuilder()
    .setName(res.commandAlias)
    .setDescription("Relay ask command for " + res.ensOrAddress)
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription(
          "The question we will ask from the parsed url/documentation"
        )
        .setRequired(true)
    )
    .setDMPermission(false);

  const subCommand = new SlashCommandSubcommandBuilder()
    .setName(res.commandAlias)
    .setDescription("Relay ask command for " + res.ensOrAddress)
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription(
          "The question we will ask from the parsed url/documentation"
        )
        .setRequired(true)
    );

  const rest = new REST().setToken(env.botToken);
  const prevCommands = await listAskCommands(guildId);
  const prevCommand = prevCommands.find(
    (c) => c.name === globalAskCommand.name
  );
  //console.log(prevCommand);
  if (prevCommand && prevCommand.options) {
    const option = prevCommand.options.find(
      (o) =>
        o.type === ApplicationCommandOptionType.Subcommand &&
        o.name === res.commandAlias
    );
    if (!option) {
      const modifiedCommand = { ...prevCommand };
      modifiedCommand.options.push(subCommand.toJSON());
      await rest.post(Routes.applicationGuildCommands(env.appId, guildId), {
        body: modifiedCommand,
      });
    }
  } else {
    await rest.post(Routes.applicationGuildCommands(env.appId, guildId), {
      body: globalAskCommand.addSubcommand(subCommand).toJSON(),
    });
  }
  await rest.post(Routes.applicationGuildCommands(env.appId, guildId), {
    body: command.toJSON(),
  });
};

export const deregisterAskCommandFromGuild = async (
  res: AskCommandRegistrationSuccessResponse,
  guildId: string
) => {
  const rest = new REST().setToken(env.botToken);
  const prevCommands = await listAskCommands(guildId);
  const relayAskCommand = prevCommands.find(
    (c) => c.name === globalAskCommand.name
  );
  if (relayAskCommand && relayAskCommand.options) {
    const options = relayAskCommand.options.filter(
      (o) =>
        o.type === ApplicationCommandOptionType.Subcommand &&
        o.name !== res.commandAlias
    );
    if (options.length !== relayAskCommand.options.length) {
      const modifiedCommand = { ...relayAskCommand };
      modifiedCommand.options = options;
      await rest.post(Routes.applicationGuildCommands(env.appId, guildId), {
        body: modifiedCommand,
      });
    }
  }
  const actualCommand = prevCommands.find((c) => c.name === res.commandAlias);
  if (actualCommand) {
    await rest.delete(
      Routes.applicationGuildCommand(env.appId, guildId, actualCommand.id)
    );
  }
};

export const listAskCommands = async (guildId: string) => {
  const rest = new REST().setToken(env.botToken);
  const commands = await rest.get(
    Routes.applicationGuildCommands(env.appId, guildId)
  );
  return commands as ApplicationCommand[];
};

const findCommansByGuildAndAlias = async (
  guildId: string,
  alias: string | undefined
) => {
  try {
    const res = await prisma("TODO").discordGuildToPipelineAlias.findMany({
      where: {
        guildId: guildId,
        as: alias,
      },
      include: {
        alias: true,
      },
    });
    return res;
  } catch (e) {
    return undefined;
  }
};

export const executeAskCommand: CommandExecutor = async (
  interaction: ChatInputCommandInteraction
) => {
  if (!interaction.guildId) {
    return { handled: false };
  }
  let alias: string | undefined = undefined;
  if (interaction.commandName !== globalAskCommand.name) {
    alias = interaction.commandName;
  } else if (interaction.commandName === globalAskCommand.name) {
    alias = interaction.options.getSubcommand();
  }
  const res = await findCommansByGuildAndAlias(interaction.guildId, alias);
  if (!res || res.length === 0) {
    return { handled: false };
  }

  const question = interaction.options.getString("question");
  if (!question) {
    await interaction.reply("You need to ask a question");
    return { handled: true };
  }
  await interaction.deferReply();
  const answer = {
    answer: "TEST ANSWER",
  };
  await interaction.editReply(`Q: ${question}\nA: ${answer.answer}`);
  return { handled: true };
};
