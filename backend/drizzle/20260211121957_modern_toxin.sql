ALTER TABLE "sounds" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sounds" ADD COLUMN "duration" real NOT NULL;--> statement-breakpoint
ALTER TABLE "sounds" ADD COLUMN "file_url" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sounds" ADD COLUMN "waveform_url" text;--> statement-breakpoint
ALTER TABLE "sounds" ADD COLUMN "trending_score" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sounds" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "sounds" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "sounds" ADD COLUMN "is_original" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "sound_id" uuid;--> statement-breakpoint
ALTER TABLE "sounds" ADD CONSTRAINT "sounds_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_sound_id_sounds_id_fk" FOREIGN KEY ("sound_id") REFERENCES "public"."sounds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sounds_trending_idx" ON "sounds" USING btree ("trending_score");--> statement-breakpoint
CREATE INDEX "sounds_usage_idx" ON "sounds" USING btree ("usage_count");--> statement-breakpoint
CREATE INDEX "sounds_created_by_idx" ON "sounds" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "sounds" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "sounds" DROP COLUMN "audio_url";