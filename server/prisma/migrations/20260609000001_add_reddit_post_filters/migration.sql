-- CreateTable
CREATE TABLE "reddit_post_filters" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[],
    "date_preset" TEXT,
    "date_from" TIMESTAMP(3),
    "date_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reddit_post_filters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reddit_post_filters_client_id_idx" ON "reddit_post_filters"("client_id");

-- AddForeignKey
ALTER TABLE "reddit_post_filters" ADD CONSTRAINT "reddit_post_filters_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
