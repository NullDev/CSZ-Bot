## Setup

See [docs/SETUP.md](./docs/SETUP.md) for a guide on setting up your local bot.

## Commands

We differentiate between the following types of commands:
- **ApplicationCommands**: These are the new so-called [SlashCommands](https://discord.com/developers/docs/interactions/application-commands) by Discord.
- **MessageCommands**: These are plain-old discord commands invoked by writing a prefixed message into the chat
- **SpecialCommands**: These commands will be automatically invoked by writing a message matching a defined pattern into the chat

So how do I create a new Command? Because of our new abstraction, you first need to define a command and register it in our handler.

A command is defined by implementing either the [ApplicationCommand](./src/commands/command.ts), [MessageCommand](./src/commands/command.ts) or [SpecialCommand](./src/commands/command.ts) interface. The documentation should be self-explaniatory, otherwise you can take a look at the [Info Command](./src/commands/info.ts) which is some kind of a reference implementation.

Next up you need to register the command in our [CommandHandler](./src/handler/commandHandler.ts). This is as easy as adding a new instance in the `commands` Array.

Now everything is set up for you to implement your own command. Simple as that.

## State / Database

If you require a Database or State for your command, please refrain from creating a json file or saving your state into a object unless it is not required to be a persistent state.

If you need to persist some state, you are strongley encouraged to use our Database (it is SQLite). Have a look at `src/storage/db/model.ts` to see our Kysely model.

When defining a new table, you **should always** use a `INTEGER PRIMARY KEY AUTOINCREMENT` as surrogate key.

We don't enforce any rules or model definitions further. The only thing that matters is: Keep your business logic separated from the model. The model is not an entity and shouldn't be.

## Review Notes

Keep in mind that your PR should be reviewable by a person with a BAC of 2.5 ‰ (as it _may_ happen).
