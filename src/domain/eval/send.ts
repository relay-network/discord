import {
  Channel,
  ChannelType,
  Client,
  EmbedBuilder,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import { PrismaClient } from "@prisma/client";
import { nonEmpty } from "../../util/ts.js";

export type ChannelOrThread = TextChannel | ThreadChannel;

export const sendHook =
  (prisma: PrismaClient, client: Client, channels?: ChannelOrThread[]) =>
  async (answerId: string): Promise<boolean> => {
    const answer = await prisma.answer.findUniqueOrThrow({
      where: { id: answerId },
      include: { question: true, message: true },
    });

    let sendTo: (Channel | ThreadChannel)[];
    if (channels && channels.length > 0) {
      sendTo = channels;
    } else {
      const aliases = await prisma.pipelineAlias.findMany({
        where: { pipelineId: { in: answer.usedPipelineIds } },
      });
      const channelIds = aliases.map(
        (alias) => alias.discordManagementChannelId
      );
      sendTo = (
        await Promise.all(
          channelIds.filter(nonEmpty).map((id) => client.channels.fetch(id))
        )
      ).filter(nonEmpty);
    }
    await Promise.all(
      sendTo.map(async (channel) => {
        if (
          channel &&
          (channel.type === ChannelType.GuildText ||
            channel.type === ChannelType.PrivateThread ||
            channel.type === ChannelType.PublicThread)
        ) {
          const question = answer.question;
          const messageId = await createAndPostMessage(
            channel,
            question.text,
            answer.text,
            true
          );
          await prisma.discordMessage.create({
            data: {
              answerId: answerId,
              discordMessageId: messageId,
              discordChannelId: channel.id,
            },
          });
        }
      })
    );
    return true;
  };

const createAndPostMessage = async (
  channel: ChannelOrThread,
  question: string,
  answer: string,
  addReactions: boolean
): Promise<string> => {
  const poll = new EmbedBuilder()
    .setTitle(question)
    .setDescription(answer)
    .setTimestamp();

  const message = await channel.send({ embeds: [poll.data] });
  if (addReactions) {
    for (const r of ["👍", "👎"]) {
      await message.react(r);
    }
  }
  return message.id;
};
