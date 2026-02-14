ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user1_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_user2_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_receiver_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "unique_conversation";--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "last_message_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "last_message_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "participant_1" text NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "participant_2" text NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_1_user_id_fk" FOREIGN KEY ("participant_1") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_2_user_id_fk" FOREIGN KEY ("participant_2") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conversations_participants" ON "conversations" USING btree ("participant_1","participant_2");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_unread" ON "messages" USING btree ("conversation_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_conversation" ON "conversations" USING btree ("participant_1","participant_2");--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "user1_id";--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN "user2_id";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "receiver_id";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "is_read";