CREATE TABLE "prereq_deficit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pattern_id" uuid NOT NULL,
	"trigger_item_id" uuid,
	"deficit_probability" real NOT NULL,
	"evidence_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prereq_deficit_log" ADD CONSTRAINT "prereq_deficit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prereq_deficit_log" ADD CONSTRAINT "prereq_deficit_log_pattern_id_nodes_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prereq_deficit_log" ADD CONSTRAINT "prereq_deficit_log_trigger_item_id_nodes_id_fk" FOREIGN KEY ("trigger_item_id") REFERENCES "public"."nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pdl_user_pattern_idx" ON "prereq_deficit_log" USING btree ("user_id","pattern_id");--> statement-breakpoint
CREATE INDEX "pdl_user_created_idx" ON "prereq_deficit_log" USING btree ("user_id","created_at");