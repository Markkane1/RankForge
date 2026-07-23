-- REQ-M5-01 / REQ-M5-02: finalized monthly report snapshots are archived append-only records.

CREATE OR REPLACE FUNCTION prevent_monthly_report_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'MonthlyReport is append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS monthly_report_append_only_update ON "MonthlyReport";
CREATE TRIGGER monthly_report_append_only_update
BEFORE UPDATE ON "MonthlyReport"
FOR EACH ROW EXECUTE FUNCTION prevent_monthly_report_mutation();

DROP TRIGGER IF EXISTS monthly_report_append_only_delete ON "MonthlyReport";
CREATE TRIGGER monthly_report_append_only_delete
BEFORE DELETE ON "MonthlyReport"
FOR EACH ROW EXECUTE FUNCTION prevent_monthly_report_mutation();
