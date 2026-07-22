-- REQ-M6-APPR-02: expired approvals are distinct from cancelled approvals.

ALTER TYPE "ApprovalStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
