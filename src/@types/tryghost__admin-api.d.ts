declare module '@tryghost/admin-api' {
  declare class GhostAdminAPI {
    constructor(options: GhostAdminAPI.Options);

    members: GhostAdminAPI.Members;
  }

  declare namespace GhostAdminAPI {
    export interface Options {
      url: string;
      key: string;
      version?: string;
    }

    export interface Members {
      browse(options?: BrowseOptions): Promise<Member[]>;
      read(options: GhostAdminAPI.ReadOptions): Promise<GhostAdminAPI.Member>;
      edit(options: GhostAdminAPI.EditOptions): Promise<GhostAdminAPI.Member>;
    }

    export interface BrowseOptions {
      filter?: string;
      limit?: number;
    }

    export interface ReadOptions {
      id: string;
    }

    export interface EditOptions {
      id: string;
      labels: GhostAdminAPI.Label[];
    }

    export interface Member {
      id: string;
      labels: GhostAdminAPI.Label[];
      subscriptions: GhostAdminAPI.Subscription[];
    }

    export interface Label {
      name: string;
    }

    export interface Subscription {
      id: string;
      name: string;
      status: string;
      tier: GhostAdminAPI.Tier;
    }

    export interface Tier {
      id: string;
    }
  }

  export = GhostAdminAPI;
}
