# Partitioning Plan — high-volume tables

As Mela scales to millions of shops and daily orders, three tables grow without
bound and are almost always queried by recency or tenant:

| Table          | Growth driver            | Dominant access pattern                         |
|----------------|--------------------------|-------------------------------------------------|
| `Order`        | every purchase           | by `shopId` + recent `createdAt`; by zone/window |
| `Notification` | every shop event         | by `shopId`, recent first                       |
| `AuditLog`     | every mutation           | by `entity`/`entityId`, time-ranged             |

## Strategy: range partitioning by month on `createdAt`

PostgreSQL declarative partitioning (`PARTITION BY RANGE (createdAt)`), one
partition per month, with a rolling window:

- **Hot** partitions (current + last 2 months) stay on fast storage.
- **Warm** partitions are retained for reporting.
- **Cold** partitions (> 18 months) are detached and archived to object storage,
  then dropped — `DROP PARTITION` is instant vs a giant `DELETE`.

Indative DDL (applied via a dedicated migration, not the ORM):

```sql
-- Example for AuditLog; same shape for Order / Notification.
CREATE TABLE "AuditLog_part" (LIKE "AuditLog" INCLUDING ALL) PARTITION BY RANGE ("createdAt");
CREATE TABLE "AuditLog_2026_06" PARTITION OF "AuditLog_part"
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
-- backfill, swap, then automate monthly partition creation with pg_partman.
```

### Why not now
Prisma does not manage partitioned tables, and partitioning an existing populated
table requires a create-swap-backfill migration with downtime risk. It is **not**
worth doing pre-launch at low volume. The trigger to execute this plan:

- any of the three tables exceeds ~10M rows, **or**
- p95 latency on recency queries degrades despite the `createdAt` indexes
  (already added in `add_indexes`).

### Operational automation
Adopt **pg_partman** to auto-create future partitions and run retention, plus a
nightly job to detach + archive cold partitions. Keep the Prisma schema pointed
at the partitioned parent table (transparent to application code).

## Read replicas (companion scaling lever)
Before partitioning bites, route read-heavy traffic (analytics, catalog, admin
lists) to a Postgres **read replica** via a separate `DATABASE_REPLICA_URL` and a
read-only Prisma client. Writes stay on the primary. This is the cheaper first
step and is independent of partitioning.
