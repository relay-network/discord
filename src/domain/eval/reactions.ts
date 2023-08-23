import {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";
import { sPrisma } from "../../stack/prisma.js";

const prisma = sPrisma.create({
  feature: "reactions.ts",
})("TODO");

export const add = async (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => {
  try {
    return await prisma.discordReaction.create({
      data: {
        discordMessage: {
          connect: {
            discordMessageId_discordChannelId: {
              discordMessageId: reaction.message.id,
              discordChannelId: reaction.message.channelId,
            },
          },
        },
        discordUserId: user.id,
        type: reaction.emoji.name === "👍" ? "THUMBS_UP" : "THUMBS_DOWN",
      },
    });
  } catch (err) {
    throw err;
  }
};

export const remove = async (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => {
  try {
    return await prisma.discordReaction.delete({
      where: {
        discordUserId_discordMessageId_discordChannelId: {
          discordUserId: user.id,
          discordMessageId: reaction.message.id,
          discordChannelId: reaction.message.channelId,
        },
      },
    });
  } catch (err) {
    throw err;
  }
};
