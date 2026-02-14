CREATE TABLE "video_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "score_trending" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "video_views" ADD CONSTRAINT "video_views_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_views" ADD CONSTRAINT "video_views_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_video_user_view" ON "video_views" USING btree ("video_id","user_id");--> statement-breakpoint
CREATE INDEX "video_views_video_id_idx" ON "video_views" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "video_views_user_id_idx" ON "video_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_views_viewed_at_idx" ON "video_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "likes_created_at_idx" ON "likes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "videos_views_count_idx" ON "videos" USING btree ("views_count");--> statement-breakpoint
CREATE INDEX "videos_score_trending_idx" ON "videos" USING btree ("score_trending");