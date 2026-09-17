ALTER TABLE archived_games ADD COLUMN nba_game_id TEXT CHECK (nba_game_id IS NULL OR length(nba_game_id) > 0);
-- Preserve source ordering for existing stable chart/table ties. New entries
-- receive the next ordinal; dump ordering remains the relational primary key.
ALTER TABLE team_seasons ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
INSERT INTO schema_migrations VALUES (2);
