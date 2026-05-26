-- CreateTable
CREATE TABLE "reddit_monitors" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "keywords" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "poll_interval_sec" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reddit_monitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reddit_posts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "monitor_id" TEXT NOT NULL,
    "reddit_id" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "reddit_created_at" TIMESTAMP(3) NOT NULL,
    "matched_keywords" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'new',
    "ai_draft" TEXT,
    "posted_comment" TEXT,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "drafted_at" TIMESTAMP(3),
    "posted_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reddit_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reddit_post_events" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reddit_post_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reddit_monitors_client_id_idx" ON "reddit_monitors"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "reddit_posts_reddit_id_key" ON "reddit_posts"("reddit_id");

-- CreateIndex
CREATE INDEX "reddit_posts_client_id_idx" ON "reddit_posts"("client_id");

-- CreateIndex
CREATE INDEX "reddit_posts_monitor_id_idx" ON "reddit_posts"("monitor_id");

-- CreateIndex
CREATE INDEX "reddit_posts_status_idx" ON "reddit_posts"("status");

-- CreateIndex
CREATE INDEX "reddit_post_events_post_id_idx" ON "reddit_post_events"("post_id");

-- AddForeignKey
ALTER TABLE "reddit_monitors" ADD CONSTRAINT "reddit_monitors_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reddit_posts" ADD CONSTRAINT "reddit_posts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reddit_posts" ADD CONSTRAINT "reddit_posts_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "reddit_monitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reddit_post_events" ADD CONSTRAINT "reddit_post_events_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "reddit_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
