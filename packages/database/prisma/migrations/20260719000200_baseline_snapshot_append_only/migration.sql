-- REQ-M5-02: Baseline snapshots are immutable once captured.

CREATE OR REPLACE FUNCTION prevent_baseline_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'BaselineSnapshot is append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS baseline_snapshot_append_only_update ON "BaselineSnapshot";
CREATE TRIGGER baseline_snapshot_append_only_update
BEFORE UPDATE ON "BaselineSnapshot"
FOR EACH ROW EXECUTE FUNCTION prevent_baseline_snapshot_mutation();

DROP TRIGGER IF EXISTS baseline_snapshot_append_only_delete ON "BaselineSnapshot";
CREATE TRIGGER baseline_snapshot_append_only_delete
BEFORE DELETE ON "BaselineSnapshot"
FOR EACH ROW EXECUTE FUNCTION prevent_baseline_snapshot_mutation();
