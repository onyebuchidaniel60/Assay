# Deployment — Vultr

## Target topology

CovenantOps is deployed as a Docker Compose modular monolith on Vultr Cloud Compute. Caddy is the public TLS edge. Next.js, worker, PostgreSQL, pg-boss, ClamAV and the isolated parser are private containers. Source documents and exports use a private Vultr Object Storage bucket. Server-side worker/services call Vultr Serverless Inference over HTTPS.

## Provisioning authority

No paid resources may be provisioned until the operator records an explicit numeric cost ceiling, billing period, region and permission in `OPERATOR_INTAKE.md`. The proposed initial VM size (4 vCPU / 8 GB / 160 GB NVMe) is a planning recommendation, not an authorization or guaranteed price. Recheck Vultr pricing, credits, region capacity, quotas and service terms at intake.

## Network exposure

- Public: TCP 80 and 443 to Caddy.
- SSH: TCP 22 restricted to the operator-approved source IP/CIDR or approved secure management path.
- Never expose PostgreSQL, pg-boss, ClamAV or parser ports publicly.
- Docker services run non-root, without privileged mode, with least capabilities and resource limits.
- Parser container has no internet egress.
- Web/worker outbound access is restricted to required DB/internal services, Vultr Object Storage and Vultr Inference as necessary.

## Preview deployment

- Use a dedicated preview DB, bucket and credentials.
- Use only seeded synthetic borrowers, agreements and statements.
- Protect preview via invite-only auth and/or access controls.
- Disable external messages, payments, destructive actions and production integrations.
- Deploy a navigable shell early in Phase 1; record exact URL and deployed commit.
- Validate TLS, firewall exposure, health/readiness and demo reset before use.

## Production release

Production is not authorized by this blueprint. Deploy to production only after explicit operator authorization naming the exact environment/domain, allowed migrations/actions, release window and rollback authority. Otherwise leave the verified preview deployed and provide exact release instructions.

## Operations

- Use pinned image digests and patched dependency versions; never `latest` in production.
- Health checks distinguish liveness and readiness without exposing secrets.
- Encrypted PostgreSQL backups to private storage; initial demo retention 7 days unless operator policy differs.
- Prove restore in a separate test environment before claiming recoverability.
- Configure VM firewall and Vultr firewall consistently.
- Monitor disk, memory, worker queue depth, failed jobs and certificate expiry.
- Rotate secrets using separate environment credentials.
- Document rollback and migration compatibility.
