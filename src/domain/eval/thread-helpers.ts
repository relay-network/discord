import { ChannelType, Message, ThreadChannel } from "discord.js";

export const createThread = async (
  message: Message<true>,
  threadName: string
) => {
  const channel = await message.startThread({
    name: threadName,
    autoArchiveDuration: 60,
  });

  if (channel.type === ChannelType.PrivateThread) {
    return null;
  }

  return channel;
};

export const readAllThreadMessages = async (thread: ThreadChannel) => {
  const messages: Message[] = [];

  // Create message pointer
  let message = await thread.messages
    .fetch({ limit: 1 })
    .then((messagePage) => (messagePage.size === 1 ? messagePage.at(0) : null));

  if (message) {
    messages.push(message);
  }
  while (message) {
    await thread.messages
      .fetch({ limit: 100, before: message.id })
      .then((messagePage) => {
        messagePage.forEach((msg) => messages.push(msg));

        // Update our message pointer to be the last message on the page of messages
        message =
          0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
      });
  }
  return messages;
};
