import { Client } from 'discord.js';

export function createBot() {
  const client = new Client({
    intents: [],
  });

  client.once('ready', () => {
    console.log('Bot ready!');
  });

  return client;
}
