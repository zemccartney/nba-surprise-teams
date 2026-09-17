declare module "virtual:tracker/catalog" {
  export const catalog: import("./catalog").Catalog;
  export const backend: string;
}
declare module "virtual:tracker/archive" {
  export function getArchivedGames(
    seasonId: string,
    teamId: string,
  ): import("./catalog").Game[];
}
