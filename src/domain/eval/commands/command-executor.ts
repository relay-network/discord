import { ChatInputCommandInteraction, Interaction } from "discord.js";
import { CommandExecutor } from "../types.js";

export const commandExecutor =
  (commandsInOrder: CommandExecutor[]) => async (interaction: Interaction) => {
    console.log("RUNNING SOMETHING");
    if (!interaction.isChatInputCommand()) return;

    try {
      const { handled } = await commandsInOrder.reduce(async (prev, curr) => {
        const { handled } = await prev;
        if (handled) return prev;
        return curr(interaction);
      }, Promise.resolve({ handled: false }));

      if (!handled) {
        console.error(
          `No command matching ${interaction.commandName} was found or handled.`
        );
        errorHandlingWithMessage(
          `No command matching ${interaction.commandName} was found or handled.`,
          interaction
        );
        return;
      }
    } catch (error) {
      console.error(error);
      errorHandlingWithMessage(
        "There was an error while executing this command!",
        interaction
      );
    }
  };

const errorHandlingWithMessage = async (
  message: string,
  interaction: ChatInputCommandInteraction
) => {
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({
      content: message,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: message,
      ephemeral: true,
    });
  }
};
