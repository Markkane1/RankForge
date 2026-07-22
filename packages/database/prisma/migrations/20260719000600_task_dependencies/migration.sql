-- REQ-M6-TASK-02: represent task dependencies for status gating.
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "dependsOnTaskIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
