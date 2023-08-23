import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import * as Reactions from "./reactions.js";
import {
  executeAdminCommand,
  registerAdminCommandGlobally,
} from "./commands/relay-admin.js";
import { commandExecutor } from "./commands/command-executor.js";
import { executeAskCommand } from "./commands/ask.js";
import { sConfig } from "../../stack/config.js";

const env = sConfig.read("discord");

export const client = async () => {
  const perms = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ];
  const client = new Client({ intents: perms });

  /* ***************************************************************************
   *
   * Frontend features
   *
   * **************************************************************************/

  const myCommandExecutor = commandExecutor([
    executeAdminCommand,
    executeAskCommand,
  ]);

  client.on("interactionCreate", async (interaction) => {
    await myCommandExecutor(interaction);
  });

  client.on("ready", async () => {
    try {
      await registerAdminCommandGlobally();
    } catch (error) {
      // do nothing
    }
  });

  /* ***************************************************************************
   *
   * Backend features
   *
   * **************************************************************************/

  const channelList: string[] = [];

  client.on("messageReactionAdd", async (reaction, user) => {
    //console.log(reaction.message.channelId, DISCORD_CHANNEL_ID, user.id, client.user?.id)
    if (
      channelList.find(
        (channelId) => channelId === reaction.message.channelId
      ) &&
      user.id !== client.user?.id
    ) {
      await Reactions.add(reaction, user);
    }
  });
  client.on("messageReactionRemove", async (reaction, user) => {
    //console.log(reaction.message.channelId, DISCORD_CHANNEL_ID, user.id, client.user?.id)
    if (
      channelList.find(
        (channelId) => channelId === reaction.message.channelId
      ) &&
      user.id !== client.user?.id
    ) {
      await Reactions.remove(reaction, user);
    }
  });

  client.on("ready", async () => {
    for (const channelId of channelList) {
      const c = (await client.channels.fetch(channelId)) as
        | TextChannel
        | undefined;
      if (!c) {
        return;
      }

      await c.messages.fetch({ limit: 100 });
    }
  });

  client.login(env.botToken);
};
