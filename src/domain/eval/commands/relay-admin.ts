import { z } from "zod";
import {
  ChatInputCommandInteraction,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import {
  AskCommandRegistrationSuccessResponse,
  CommandExecutor,
} from "../types.js";
import {
  deregisterAskCommandFromGuild,
  registerAskCommandToGuild,
} from "./ask.js";
import { sPrisma } from "../../../stack/prisma.js";
import { sConfig } from "../../../stack/config.js";

const prisma = sPrisma.create({
  feature: "relay-admin.ts",
})("TODO");

const env = sConfig.read("discord");

export const registerAdminCommandGlobally = async () => {
  const rest = new REST().setToken(env.botToken);
  await rest.put(Routes.applicationCommands(env.appId), {
    body: [relayAdmin.toJSON()],
  });
};

const reservedNames = ["relay", "relay-admin"];

const add: SlashCommandSubcommandBuilder = new SlashCommandSubcommandBuilder()
  .setName("add")
  .setDescription(
    "Adds a new relay ask command to your server, use `/relay-admin list available` for options"
  )
  .addStringOption((option) =>
    option
      .setName("name_or_address")
      .setDescription("The name or eth address of a project you want to add")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("as")
      .setDescription("You can add a custom name for the command if you wish")
      .setRequired(false)
  );

const remove: SlashCommandSubcommandBuilder =
  new SlashCommandSubcommandBuilder()
    .setName("remove")
    .setDescription(
      "Removes a relay ask command from your server, use `/relay-admin list added` for options"
    )
    .addStringOption((option) =>
      option
        .setName("name_or_address")
        .setDescription("The name or eth address of a project you want to add")
        .setRequired(true)
    );

const list: SlashCommandSubcommandBuilder = new SlashCommandSubcommandBuilder()
  .setName("list")
  .setDescription(
    "Lists the available projects you added or you can add to your server"
  )
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("The type of the list you want to see")
      .setRequired(true)
      .addChoices(
        { name: "available", value: "available" },
        { name: "added", value: "added" }
      )
  );

export const relayAdmin = new SlashCommandBuilder()
  .setName("relay-admin")
  .setDescription("Relay-bot admin commands")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
  .addSubcommand(add)
  .addSubcommand(remove)
  .addSubcommand(list);

const registerNameOrAddressToGuild = async (
  nameOrAddress: string,
  as: string | undefined | null,
  guildId: string
) => {
  const candidates = await prisma.pipelineAlias.findMany({
    where: {
      OR: [
        { name: nameOrAddress },
        { ethAddress: nameOrAddress },
        { ensAddress: nameOrAddress },
      ],
    },
  });
  if (candidates.length !== 1) {
    return {
      error:
        "There are no projects with that name or address (or we have multiple of them, if this is the case please contact the relay team)",
    };
  }
  const candidate = candidates[0];
  const name = as || candidate.name?.toLowerCase();
  if (!name || reservedNames.includes(name)) {
    return {
      error:
        "The project doesn't have a name, or the selected name is reserved, please use an alias/as",
    };
  }
  await prisma.discordGuildToPipelineAlias.create({
    data: {
      guildId: guildId,
      aliasId: candidate.id,
      as: name,
    },
  });
  return {
    commandAlias: name,
    ensOrAddress:
      candidate.ensAddress || candidate.ethAddress || candidate.name || "",
  } as AskCommandRegistrationSuccessResponse;
};

const deregisterNameOrAddressFromGuild = async (
  nameOrAddress: string,
  as: string | undefined | null,
  guildId: string
) => {
  const candidates = await prisma.discordGuildToPipelineAlias.findMany({
    where: {
      guildId,
      OR: [
        {
          alias: {
            OR: [
              { name: nameOrAddress },
              { ethAddress: nameOrAddress },
              { ensAddress: nameOrAddress },
            ],
          },
        },
        { as: nameOrAddress },
      ],
    },
    include: {
      alias: true,
    },
  });
  if (candidates.length === 0) {
    return {
      error: "We couldn't find a project with that name or address or alias",
    };
  }
  await prisma.discordGuildToPipelineAlias.deleteMany({
    where: {
      id: {
        in: candidates.map((c) => c.id),
      },
      guildId,
    },
  });
  return candidates.map((c) => ({
    commandAlias: c.as,
    ensOrAddress:
      c.alias.ensAddress || c.alias.ethAddress || c.alias.name || "",
  })) as AskCommandRegistrationSuccessResponse[];
};

const listAvailableAdds = async () => {
  const aliases = await prisma.pipelineAlias.findMany();
  return aliases.map((a) => ({
    name: a.name,
    ensAddress: a.ethAddress,
    ethAddress: a.ethAddress,
  }));
};

const listAdded = async (guildId: string) => {
  const candidates = await prisma.discordGuildToPipelineAlias.findMany({
    where: {
      guildId,
    },
    include: {
      alias: true,
    },
  });
  return candidates.map((c) => ({
    commandAlias: c.as,
    name: c.alias.name,
    ensAddress: c.alias.ethAddress,
    ethAddress: c.alias.ethAddress,
  }));
};

export const executeAdminCommand: CommandExecutor = async (
  interaction: ChatInputCommandInteraction
) => {
  if (interaction.commandName === relayAdmin.name && interaction.guildId) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === add.name) {
      const nameOrAddress = interaction.options.getString("name_or_address");
      const as = interaction.options.getString("as")?.toLowerCase();
      if (!nameOrAddress) {
        await interaction.reply("You need to provide a name or address");
        return { handled: true };
      }
      await interaction.deferReply();
      const res = await registerNameOrAddressToGuild(
        nameOrAddress,
        as,
        interaction.guildId
      );
      if ("error" in res) {
        await interaction.editReply(res.error);
        return { handled: true };
      }
      try {
        await registerAskCommandToGuild(res, interaction.guildId);
      } catch (e) {
        console.log(e);
        try {
          await deregisterNameOrAddressFromGuild(
            nameOrAddress,
            as,
            interaction.guildId
          );
        } catch {
          console.log(
            "we couldn't deregister the name or address after a failed registering, db is probably inconsistent"
          );
        }
        await interaction.editReply("Failed to add the command to your server");
        return { handled: true };
      }
      await interaction.editReply(
        `Successfully added ${res.commandAlias} to your server`
      );
      return { handled: true };
    }
    if (subcommand === remove.name) {
      const nameOrAddress = interaction.options.getString("name_or_address");
      if (!nameOrAddress) {
        await interaction.reply("You need to provide a name or address");
        return { handled: true };
      }
      await interaction.deferReply();
      const res = await deregisterNameOrAddressFromGuild(
        nameOrAddress,
        nameOrAddress,
        interaction.guildId
      );
      if ("error" in res) {
        await interaction.editReply(res.error);
        return { handled: true };
      }
      for (const r of res) {
        await deregisterAskCommandFromGuild(r, interaction.guildId);
      }
      await interaction.editReply(
        `Successfully removed ${res
          .map((r) => r.commandAlias)
          .join(", ")} from your server`
      );
      return { handled: true };
    }
    if (subcommand === list.name) {
      const type = interaction.options.getString("type");
      if (!type) {
        await interaction.reply("You need to provide a type");
        return { handled: true };
      }
      await interaction.deferReply();
      if (type === "available") {
        const res = await listAvailableAdds();
        await interaction.editReply(
          `Available commands:\n${res
            .map((r) => `${r.name} - ${r.ensAddress} - ${r.ethAddress}`)
            .join("\n")}`
        );
        return { handled: true };
      }
      if (type === "added") {
        const res = await listAdded(interaction.guildId);

        await interaction.editReply(
          `Added commands:\n${res
            .map(
              (r) =>
                `${r.commandAlias} - ${r.name} - ${r.ensAddress} - ${r.ethAddress}`
            )
            .join("\n")}`
        );
        return { handled: true };
      }
      await interaction.editReply("Unknown type");
      return { handled: true };
    }
    await interaction.reply("Unknown subcommand");
    return { handled: true };
  }
  return { handled: false };
};
