CREATE INDEX "hashtags_name_idx" ON "hashtags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "hashtags_usage_count_idx" ON "hashtags" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "sounds_title_idx" ON "sounds" USING btree ("title");--> statement-breakpoint
CREATE INDEX "videos_caption_idx" ON "videos" USING btree ("caption");--> statement-breakpoint
CREATE INDEX "videos_created_at_idx" ON "videos" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "videos_user_id_idx" ON "videos" USING btree ("user_id");