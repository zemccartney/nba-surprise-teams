PRAGMA foreign_keys = ON;
CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY) STRICT;
INSERT INTO schema_migrations VALUES (1);
CREATE TABLE teams (
  id TEXT PRIMARY KEY CHECK (id GLOB '[A-Z][A-Z][A-Z]'),
  name TEXT NOT NULL CHECK (length(name) > 0),
  emoji TEXT NOT NULL CHECK (length(emoji) > 0)
) STRICT;
CREATE TABLE team_names (
  team_id TEXT NOT NULL REFERENCES teams(id),
  first_year INTEGER NOT NULL,
  last_year INTEGER NOT NULL CHECK (last_year >= first_year),
  name TEXT NOT NULL,
  logo TEXT NOT NULL,
  PRIMARY KEY (team_id, first_year)
) STRICT;
CREATE TABLE seasons (
  id TEXT PRIMARY KEY CHECK (id GLOB '[0-9][0-9][0-9][0-9]'),
  start_date TEXT NOT NULL CHECK (date(start_date, '+0 days') IS start_date),
  end_date TEXT NOT NULL CHECK (date(end_date, '+0 days') IS end_date AND end_date > start_date),
  episode_date TEXT CHECK (episode_date IS NULL OR date(episode_date, '+0 days') IS episode_date),
  episode_title TEXT,
  episode_url TEXT,
  num_games INTEGER CHECK (num_games BETWEEN 1 AND 82),
  shortened_reason TEXT,
  CHECK ((episode_date IS NULL AND episode_title IS NULL AND episode_url IS NULL) OR
         (episode_date IS NOT NULL AND episode_title IS NOT NULL AND episode_url IS NOT NULL)),
  CHECK ((num_games IS NULL) = (shortened_reason IS NULL))
) STRICT;
CREATE TABLE team_seasons (
  season_id TEXT NOT NULL REFERENCES seasons(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  over_under_twice INTEGER NOT NULL CHECK (over_under_twice BETWEEN 0 AND 164),
  PRIMARY KEY (season_id, team_id)
) STRICT;
CREATE TABLE archived_games (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons(id),
  played_on TEXT NOT NULL CHECK (date(played_on, '+0 days') IS played_on),
  team1_id TEXT NOT NULL REFERENCES teams(id),
  team2_id TEXT NOT NULL REFERENCES teams(id),
  score1 INTEGER NOT NULL CHECK (score1 >= 0),
  score2 INTEGER NOT NULL CHECK (score2 >= 0),
  CHECK (team1_id <> team2_id),
  CHECK (score1 <> score2)
) STRICT;
CREATE INDEX archived_games_season_date ON archived_games(season_id, played_on, id);
