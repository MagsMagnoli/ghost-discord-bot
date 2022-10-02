import { createBot } from './bot';
import { env } from './env';
import { ghostAPIClient } from './ghost';
import { createServer } from './server';

const start = async () => {
  console.log('Starting');

  const bot = createBot();
  await bot.login(env.DISCORD_BOT_TOKEN);

  console.log('Discord bot logged in');

  const server = createServer(bot, ghostAPIClient);
  server.listen({ port: env.SERVER_PORT || 3000, host: '0.0.0.0' }, () => {
    console.log(`Server listening on port ${env.SERVER_PORT || 3000}`);

    console.log('Started');
  });
};

start();
