# Databases

Most database incidents are not clever: the database was reachable from the internet, a default or leaked credential worked, or the application account could read everything. Check those first.

Ground rules: read-only statements only. Prefer that the user runs each query and pastes the result, or approves it one at a time. Use a least-privilege role, never the owner or superuser for routine checks. Never print row data, password hashes or connection strings into the chat. Never connect to a database the user does not administer.

## The five questions

1. **Who can reach it?** Bound to localhost or a private network, or to `0.0.0.0`? Is 5432 / 3306 / 27017 / 6379 / 1433 forwarded or open in a cloud security group? `inventory` shows local listeners.
2. **Who can log in?** No default, empty or shared passwords; no remote root/superuser; unused accounts removed; modern password hashing.
3. **What can the application account do?** Only the statements it needs on only its schema. Not owner, not superuser, no DDL in production if avoidable.
4. **Is data protected in transit and at rest?** TLS required for remote connections and verified by the client (`sslmode=verify-full`); disk or volume encryption; encrypted backups.
5. **Can you recover and can you tell what happened?** Automated backups, a restore tested recently, point-in-time recovery for important data, connection and privilege-change logging.

Also: the server version is supported (check endoflife.date/postgresql, /mysql, /mongodb, /redis), and connection strings live in a secret store, not in the repository.

## PostgreSQL - read-only checks

```sql
SELECT version();
SHOW listen_addresses;  SHOW ssl;  SHOW password_encryption;  SHOW log_connections;
-- login roles and dangerous attributes
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls, rolvaliduntil
FROM pg_roles WHERE rolcanlogin ORDER BY rolsuper DESC;
-- client authentication rules (needs pg_read_all_settings)
SELECT type, database, user_name, address, auth_method FROM pg_hba_file_rules;
-- tables without row-level security in exposed schemas
SELECT schemaname, tablename, rowsecurity FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY rowsecurity;
-- policies (look for USING (true) and missing WITH CHECK)
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check FROM pg_policies;
-- what broad roles may touch
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee IN ('PUBLIC','anon','authenticated');
-- SECURITY DEFINER functions without a pinned search_path
SELECT n.nspname, p.proname, p.proconfig FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prosecdef AND n.nspname NOT IN ('pg_catalog','information_schema');
SELECT extname, extversion FROM pg_extension;
```

Red flags: `listen_addresses = '*'` with `pg_hba` lines for `0.0.0.0/0`; `trust` or `password` auth methods (want `scram-sha-256`); `ssl = off` for remote access; the application logging in as a superuser or table owner; `PUBLIC` grants on application tables; `SECURITY DEFINER` functions with no `search_path` set.

## Supabase, Firebase and other backend-as-a-service

The browser holds a public key on purpose. **Row-level security is the only wall.**

- Every table in an API-exposed schema has RLS enabled *and* policies that reference the caller (`auth.uid()`), for each of select, insert, update and delete. RLS enabled with a `USING (true)` policy is public.
- The `service_role` key (or any admin key) appears only on servers - never in front-end code, mobile apps or `NEXT_PUBLIC_*`/`VITE_*` variables. If it ever shipped, rotate it.
- Views run with their owner's rights unless `security_invoker` is set; functions exposed over RPC need their own checks.
- Storage buckets are private unless files are meant to be public; signed URLs expire.
- Auth: email confirmation on, leaked-password protection on, MFA for dashboard users, redirect URLs allowlisted.
- If the host offers the platform's own read-only security advisors or linter, run them with the user's consent and triage the output like any scanner import.
- Firebase: Firestore and Storage rules must not be `allow read, write: if true;` and should not rely on a date-based test rule.

## MySQL / MariaDB - read-only checks

```sql
SELECT VERSION();
SELECT user, host, plugin, account_locked, password_expired FROM mysql.user;
SHOW VARIABLES WHERE Variable_name IN
 ('bind_address','require_secure_transport','local_infile','secure_file_priv','general_log');
SHOW GRANTS FOR CURRENT_USER();
```

Red flags: accounts with host `%` (especially root), empty authentication, `mysql_native_password` on new systems, `local_infile = ON`, `require_secure_transport = OFF` for remote clients, application accounts with `ALL PRIVILEGES ON *.*` or `FILE`/`SUPER`.

## MongoDB, Redis, Elasticsearch

These were historically open by default and are the most common "database found on the internet" cases.

- **MongoDB:** `security.authorization: enabled`; `net.bindIp` not `0.0.0.0` unless firewalled; TLS on; application users scoped to one database with `readWrite`, not `root`. Check with `db.adminCommand({getCmdLineOpts: 1})` and `db.getUsers()`.
- **Redis:** never internet-facing. `protected-mode yes`, a bind address, ACL users or `requirepass`, TLS for remote links, dangerous commands restricted. Check with `CONFIG GET protected-mode`, `CONFIG GET bind`, `ACL LIST` (do not paste secrets).
- **Elasticsearch / OpenSearch:** security features enabled, no anonymous access, not published on a public interface.

## Application side

Parameterised queries everywhere; a separate read-only account for reporting; migrations run by a different account than the application; personal data minimised, with sensitive columns encrypted at the application layer where the threat model needs it; database errors never returned to users; an alert on unusual query volume or export size.

## Fix and retest

Give the exact statement (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `REVOKE ... FROM PUBLIC`, `ALTER ROLE ... NOSUPERUSER`) with its rollback, warn about what could break (an app relying on the over-broad grant), suggest staging first, and re-run the same read-only query to confirm.

References: CIS Benchmarks for PostgreSQL/MySQL/MongoDB, the OWASP Database Security Cheat Sheet, vendor security checklists, Supabase's RLS and production-readiness guidance (see `sources.md`).
