ALTER TABLE "videos" ADD COLUMN "allow_comments" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "allow_duets" boolean DEFAULT true NOT NULL;