CREATE TABLE archived_game_venues (
  game_id TEXT PRIMARY KEY REFERENCES archived_games(id) ON DELETE CASCADE,
  away_team_id TEXT NOT NULL REFERENCES teams(id),
  home_team_id TEXT NOT NULL REFERENCES teams(id),
  CHECK (away_team_id <> home_team_id)
) STRICT;
INSERT INTO schema_migrations VALUES (3);
