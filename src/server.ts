import GhostAdminAPI from '@tryghost/admin-api';
import axios from 'axios';
import { Client, Role } from 'discord.js';
import express, { NextFunction, Request, Response } from 'express';
import { env } from './env';

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };

export function createServer(bot: Client, ghostAPIClient: GhostAdminAPI) {
  const app = express();

  app.use(express.json({ limit: '5mb' }));

  app.get(
    '/auth/discord/return',
    asyncHandler(async (req, res) => {
      const { code, state: memberId } = req.query;

      if (
        !code ||
        !memberId ||
        typeof code !== 'string' ||
        typeof memberId !== 'string'
      ) {
        return res.status(400).send('Invalid request');
      }

      const params = new URLSearchParams();
      params.append('client_id', env.DISCORD_CLIENT_ID);
      params.append('client_secret', env.DISCORD_CLIENT_SECRET);
      params.append('grant_type', 'authorization_code');
      params.append('code', code);
      params.append(
        'redirect_uri',
        `${env.SERVER_BASE_URL}/auth/discord/return`,
      );
      params.append('scope', 'identify');

      const accessTokenResponse = await axios.post<{
        access_token: string;
      }>('https://discord.com/api/v10/oauth2/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (accessTokenResponse.status !== 200) {
        return res.status(400).send('Invalid request');
      }

      const { access_token } = accessTokenResponse.data;

      const discordUserResponse = await axios.get<{
        id: string;
      }>('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      if (discordUserResponse.status !== 200) {
        return res.status(400).send('Invalid request');
      }

      const { id: discordUserId } = discordUserResponse.data;

      const ghostMembers = await ghostAPIClient.members.browse({
        filter: `uuid:${memberId}`,
      });

      if (ghostMembers.length <= 0) {
        return res.status(400).send('Invalid request');
      }

      const ghostMember = ghostMembers[0];

      try {
        console.log('Updating member Discord ID');

        await updateMemberDiscordId(ghostMember, discordUserId, ghostAPIClient);

        console.log(
          `Updated member ${memberId} with Discord ID ${discordUserId}`,
        );
      } catch (error) {
        console.error(error);
        return res.status(500).send('Internal server error');
      }

      try {
        console.log('Updating member role');

        await updateMemberRole(
          bot,
          discordUserId,
          ghostMember.subscriptions.length > 0 ? 'add' : 'remove',
        );

        console.log(
          `Updated member ${memberId} with Discord role ${env.DISCORD_PAID_MEMBER_ROLE_ID}`,
        );
      } catch (error) {
        console.error(error);
        return res.status(500).send('Internal server error');
      }

      return res.send('Discord verified. You may now close this window.');
    }),
  );

  app.post(
    '/webhook/ghost',
    asyncHandler(async (req, res, next) => {
      // Ack webhook
      res.status(200).send('OK');

      const { member } = req.body;

      if (!member || !member.current || !member.current.id) {
        console.error('Invalid webhook payload');
        return;
      }

      const ghostMember = await ghostAPIClient.members.read({
        id: member.current.id,
      });

      const discordUserId = ghostMember.labels
        .find((label) => label.name.startsWith('discordId='))
        ?.name?.split('=')[1];

      if (!discordUserId) {
        console.error('No Discord ID found for member');
        return;
      }

      try {
        console.log('Updating member role');

        await updateMemberRole(
          bot,
          discordUserId,
          ghostMember.subscriptions.length > 0 ? 'add' : 'remove',
        );

        console.log(
          `Updated member ${ghostMember.id} with Discord role ${env.DISCORD_PAID_MEMBER_ROLE_ID}`,
        );
      } catch (error) {
        console.error(`Error updating member role: ${error}`);
      }
    }),
  );

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (axios.isAxiosError(err)) {
      console.error(err.response?.data);
    } else {
      console.error(err);
    }
    res.status(500).send('Internal server error');
  });

  return app;
}

async function updateMemberDiscordId(
  ghostMember: GhostAdminAPI.Member,
  discordUserId: string,
  ghostAPIClient: GhostAdminAPI,
) {
  const labels = ghostMember.labels;

  const discordIdLabelIdx = labels.findIndex((label) =>
    label.name.startsWith('discordId='),
  );

  if (discordIdLabelIdx !== -1) {
    labels.splice(discordIdLabelIdx, 1);
  }

  await ghostAPIClient.members.edit({
    id: ghostMember.id,
    labels: [...labels, { name: `discordId=${discordUserId}` }],
  });
}

async function updateMemberRole(
  bot: Client,
  discordUserId: string,
  op: 'add' | 'remove',
) {
  let guild = bot.guilds.cache.find(
    (guild) => guild.id === env.DISCORD_GUILD_ID,
  );

  if (!guild) {
    guild = await bot.guilds.fetch(env.DISCORD_GUILD_ID);
  }

  let user = guild.members.cache.find((member) => member.id === discordUserId);

  if (!user) {
    user = await guild.members.fetch(discordUserId);
  }

  let role = guild.roles.cache.find(
    (role) => role.id === env.DISCORD_PAID_MEMBER_ROLE_ID,
  );

  if (!role) {
    role = (await guild.roles.fetch(env.DISCORD_PAID_MEMBER_ROLE_ID)) as Role;
  }

  if (op === 'add') {
    await user.roles.add(role);
  } else {
    await user.roles.remove(role);
  }
}
