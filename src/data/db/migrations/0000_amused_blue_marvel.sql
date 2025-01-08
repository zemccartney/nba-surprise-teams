CREATE TABLE `Games` (
	`id` integer PRIMARY KEY NOT NULL,
	`season` integer,
	`homeTeam` text,
	`awayTeam` text,
	`homeScore` integer,
	`awayScore` integer,
	`playedOn` text,
	`playedAt` integer,
	FOREIGN KEY (`season`) REFERENCES `SeasonCaches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `SeasonCaches` (
	`id` integer PRIMARY KEY NOT NULL,
	`expiresAt` integer,
	`updatedAt` integer
);
