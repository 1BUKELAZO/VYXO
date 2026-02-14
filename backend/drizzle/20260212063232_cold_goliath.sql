ALTER TABLE "videos" ADD COLUMN "allow_stitches" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "duet_with_id" uuid;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "is_duet" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "is_stitch" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "duet_layout" text DEFAULT 'side';--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "duets_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_duet_with_id_videos_id_fk" FOREIGN KEY ("duet_with_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_videos_duet_with" ON "videos" USING btree ("duet_with_id");