ALTER TABLE "videos" ADD COLUMN "mux_asset_id" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "mux_playback_id" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "mux_upload_id" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "status" text DEFAULT 'uploading' NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "aspect_ratio" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "max_resolution" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "master_playlist_url" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "mux_thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "gif_url" text;