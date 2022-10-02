import GhostAdminAPI from '@tryghost/admin-api';
import { env } from './env';

export const ghostAPIClient = new GhostAdminAPI({
  url: env.GHOST_API_URL,
  key: env.GHOST_ADMIN_API_KEY,
  version: 'v5.0',
});
