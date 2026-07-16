CREATE TYPE "public"."doc_type" AS ENUM('REQUEST', 'CONSIGN', 'SALE', 'RETURN');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('SALE', 'PHARMACY');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."return_subtype" AS ENUM('PHARMACY_TO_SALE', 'SALE_TO_COMPANY');--> statement-breakpoint
CREATE TYPE "public"."txn_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('SYSTEM_ADMIN', 'ADMIN', 'SALE');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_code_unique" UNIQUE("code"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"start_date" date,
	"end_date" date,
	"status" "record_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_code_unique" UNIQUE("code"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"assigned_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"location_type" "location_type" NOT NULL,
	"sale_user_id" uuid,
	"store_id" uuid,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inv_qty_nonneg" CHECK ("inventory"."quantity" >= 0),
	CONSTRAINT "inv_loc_consistency" CHECK (("inventory"."location_type" = 'SALE' AND "inventory"."sale_user_id" IS NOT NULL AND "inventory"."store_id" IS NULL)
          OR ("inventory"."location_type" = 'PHARMACY' AND "inventory"."store_id" IS NOT NULL AND "inventory"."sale_user_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transaction_docs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_no" text NOT NULL,
	"doc_type" "doc_type" NOT NULL,
	"return_subtype" "return_subtype",
	"created_by" uuid NOT NULL,
	"store_id" uuid,
	"status" "txn_status" DEFAULT 'PENDING' NOT NULL,
	"evidence_key" text,
	"remark" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transaction_docs_doc_no_unique" UNIQUE("doc_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transaction_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doc_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_type" "location_type" NOT NULL,
	"location_ref_id" uuid NOT NULL,
	"delta" integer NOT NULL,
	"reason" text DEFAULT 'APPROVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stores" ADD CONSTRAINT "stores_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory" ADD CONSTRAINT "inventory_sale_user_id_users_id_fk" FOREIGN KEY ("sale_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory" ADD CONSTRAINT "inventory_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction_docs" ADD CONSTRAINT "transaction_docs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction_docs" ADD CONSTRAINT "transaction_docs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction_docs" ADD CONSTRAINT "transaction_docs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction_lines" ADD CONSTRAINT "transaction_lines_doc_id_transaction_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."transaction_docs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transaction_lines" ADD CONSTRAINT "transaction_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_doc_id_transaction_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."transaction_docs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_inv_sale" ON "inventory" USING btree ("product_id","sale_user_id") WHERE "inventory"."location_type" = 'SALE';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_inv_pharmacy" ON "inventory" USING btree ("product_id","store_id") WHERE "inventory"."location_type" = 'PHARMACY';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_txn_status" ON "transaction_docs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_txn_created_by" ON "transaction_docs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mov_doc" ON "stock_movements" USING btree ("doc_id");