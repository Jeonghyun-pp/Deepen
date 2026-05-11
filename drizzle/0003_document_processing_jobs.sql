CREATE TYPE "public"."document_job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."processing_event_level" AS ENUM('info', 'warn', 'error');--> statement-breakpoint
CREATE TABLE "document_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"type" text DEFAULT 'process_document' NOT NULL,
	"status" "document_job_status" DEFAULT 'queued' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_processing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"step" text NOT NULL,
	"level" "processing_event_level" DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_jobs" ADD CONSTRAINT "document_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_jobs" ADD CONSTRAINT "document_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_processing_events" ADD CONSTRAINT "document_processing_events_job_id_document_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."document_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_processing_events" ADD CONSTRAINT "document_processing_events_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_processing_events" ADD CONSTRAINT "document_processing_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_jobs_user_idx" ON "document_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "document_jobs_document_idx" ON "document_jobs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_jobs_status_next_run_idx" ON "document_jobs" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE INDEX "document_processing_events_job_idx" ON "document_processing_events" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "document_processing_events_document_idx" ON "document_processing_events" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_processing_events_user_idx" ON "document_processing_events" USING btree ("user_id");
