declare module "virtual:tracker/catalog" {
  export const catalog: import("../src/data/catalog").Catalog;
  export const metadataHash: string;
}
declare module "virtual:tracker/archive" {
  export function getArchivedGames(
    seasonId?: string,
  ): import("../src/data/model").Game[];
  export function getArchivedSeasons(): import("../src/data/model").Season[];
  export function getSeasonArchive(
    seasonId: string,
  ): import("../src/data/model").Game[] | undefined;
}
