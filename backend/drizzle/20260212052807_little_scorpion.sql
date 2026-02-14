CREATE TABLE "user_followed_hashtags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"hashtag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_hashtags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" uuid NOT NULL,
	"hashtag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_followed_hashtags" ADD CONSTRAINT "user_followed_hashtags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_followed_hashtags" ADD CONSTRAINT "user_followed_hashtags_hashtag_id_hashtags_id_fk" FOREIGN KEY ("hashtag_id") REFERENCES "public"."hashtags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_hashtags" ADD CONSTRAINT "video_hashtags_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_hashtags" ADD CONSTRAINT "video_hashtags_hashtag_id_hashtags_id_fk" FOREIGN KEY ("hashtag_id") REFERENCES "public"."hashtags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_hashtag" ON "user_followed_hashtags" USING btree ("user_id","hashtag_id");--> statement-breakpoint
CREATE INDEX "user_followed_hashtags_user_id_idx" ON "user_followed_hashtags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_followed_hashtags_hashtag_id_idx" ON "user_followed_hashtags" USING btree ("hashtag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_video_hashtag" ON "video_hashtags" USING btree ("video_id","hashtag_id");--> statement-breakpoint
CREATE INDEX "video_hashtags_video_id_idx" ON "video_hashtags" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "video_hashtags_hashtag_id_idx" ON "video_hashtags" USING btree ("hashtag_id");