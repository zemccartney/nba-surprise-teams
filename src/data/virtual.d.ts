declare module "virtual:tracker/catalog" {
  export const catalog: import("./catalog").Catalog;
  export const metadataHash: string;
}
declare module "virtual:tracker/archive" {
  export function getArchivedGames(seasonId?: string): import("./model").Game[];
  export function getArchivedSeasons(): import("./model").Season[];
  export function getSeasonArchive(
    seasonId: string,
  ): import("./model").Game[] | undefined;
}
