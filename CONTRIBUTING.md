## Commands

We differentiate between the following types of commands:
- **ApplicationCommands**: These are the new so-called [SlashCommands](https://discord.com/developers/docs/interactions/application-commands) by Discord.
- **MessageCommands**: These are plain-old discord commands invoked by writing a prefixed message into the chat
- **SpecialCommands**: These commands will be automatically invoked by wrtigin a message matching a defined pattern into the chat

So how do I create a new Command? Because of our new abstraction, you first need to define a command and register it in our handler.

A command is defined by implementing either the [ApplicationCommand](./src/commands/command.ts), [MessageCommand](./src/commands/command.ts) or [SpecialCommand](./src/commands/command.ts) interface. The documentation should be self-explaniatory, otherwise you can take a look at the [Info Command](./src/commands/info.ts) which is some kind of a reference implementation.

Next up you need to register the command in our [CommandHandler](./src/handler/commandHandler.ts). This is as easy as adding a new instance in the `commands` Array.

Now everything is set up for you to implement your own command. Simple as that.

## State / Database

If you require a Database or State for your command, please refrain from creating a json file or saving your state into a object unless it is not required to be a persistent state.

If you require to persist some state, you are strongley encouraged to use our Database (It is SQLite). We use an [Active Record Pattern](https://de.wikipedia.org/wiki/Active_Record) to persist objects into the Database using [Sequelize](https://sequelize.org/).

Models are defined in the [models directory](./src/storage/model) and **should always** use a uuid as surrogate key. However please make sure that you define also natural keys and unique constraints.

We don't enforce any rules or model definitions further. The only thing that matters is: Keep your business logic seperated from the model. The Model is not an entity and shouldn't be.
