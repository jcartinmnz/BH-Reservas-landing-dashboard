ALTER TABLE "staff" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "auth_user_id" text;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_auth_user_id_unique" UNIQUE("auth_user_id");