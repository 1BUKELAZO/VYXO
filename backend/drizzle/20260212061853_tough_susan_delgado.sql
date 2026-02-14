ALTER TABLE "videos" ADD COLUMN "parent_video_id" uuid;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "is_reply" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "video_replies_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_parent_video_id_videos_id_fk" FOREIGN KEY ("parent_video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_videos_parent" ON "videos" USING btree ("parent_video_id");