# Containers, Kubernetes and cloud configuration: review the blast radius

Use this playbook for Dockerfiles, Compose files, Kubernetes manifests and Helm values, Terraform/OpenTofu/CloudFormation, and exported cloud configuration. The review is static and read-only. The CLI makes **no cloud API calls**, does not run `docker`, `kubectl`, `terraform plan` or any cloud CLI, and does not pull images. If the user wants live account state, they export it themselves and approve the exported file.

Primary references, checked on **23 November 2026**: [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/) (Privileged / Baseline / Restricted). Background: [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html), [Docker Engine security](https://docs.docker.com/engine/security/), the provider's own well-architected security guidance and CIS Benchmarks by name. Recheck before quoting a version-specific field; Kubernetes adds controls between minor versions.

## Establish the approved evidence

Ask for exact files: `Dockerfile`, `compose.yaml`, the manifests or rendered Helm output for the workloads in question, the Terraform modules that define identity, network and storage, and any policy files (OPA/Kyverno, admission config). A Trivy JSON report can be imported with `import --format trivy`; its misconfiguration and vulnerability results are tool evidence. Everything else here is expert judgment. Never ask for kubeconfig, cloud keys, state files with secrets or `.tfvars` with values; variable **names** are enough.

## Map the blast radius

For each workload describe **what runs → as whom → with which host access → reachable from where → holding which credentials → able to reach which data**. A finding matters when one compromised container, pod or pipeline identity reaches more than it needs.

| Review area | Evidence to seek | What a useful finding establishes |
|---|---|---|
| Image | Base image pinned by digest or tag, `latest`, distroless/minimal base, multi-stage build, `USER` set to non-root, secrets copied or passed as `ARG`/`ENV` | The image runs as root, drifts unpredictably, or bakes a secret into a layer (layers are retrievable even if a later step deletes the file). |
| Container privileges | `privileged`, added capabilities, `hostNetwork`/`hostPID`/`hostIPC`, `hostPath` volumes, Docker socket mounts, `allowPrivilegeEscalation`, `seccompProfile: Unconfined` | The workload is outside the Pod Security **Baseline**, or not at **Restricted** where it could be. A mounted Docker socket or `privileged: true` is effectively host access. |
| Admission policy | `pod-security.kubernetes.io/enforce` namespace labels or an equivalent policy engine | Nothing prevents a future privileged pod; individual manifests are the only line of defence. |
| Identity | Kubernetes ServiceAccount token automount, RBAC `*` verbs/resources, `cluster-admin` bindings; cloud IAM policies with `*` actions or resources; workload identity versus static keys | One workload or pipeline can act far beyond its job. |
| Network exposure | `LoadBalancer`/`NodePort` services, ingress without auth, security groups or firewall rules open to `0.0.0.0/0` / `::/0` on admin or database ports, missing NetworkPolicies | A management or data port is reachable from the internet or from every pod. |
| Metadata and SSRF | Instance metadata access from workloads; on AWS whether IMDSv2 (`http_tokens = "required"`) is enforced; hop limit | A server-side request flaw in any app can be turned into cloud credentials. |
| Storage | Public buckets/containers, public ACLs or policies, unencrypted volumes or snapshots, public database snapshots | Data is readable without authentication, or backups are weaker than the primary. |
| Secrets | Plaintext values in manifests, ConfigMaps, Terraform defaults or state; secret managers versus env literals | A secret is in Git or readable by anyone who can read the namespace or state backend. |
| Logging and recovery | Audit logging enabled, retention, backups outside the same account/blast radius | An incident could not be reconstructed or recovered from. |

## Challenge before raising

- `runAsNonRoot` missing is weaker evidence when the image's `USER` is non-root; check both.
- `hostPath` read-only for a node agent (log shipper, CNI) may be required; ask what the workload is before ranking it.
- An open security group on 443 in front of a public website is intended; on 22, 3389, 5432, 6379 or 9200 it needs a reason.
- IaC shows intended state, not deployed state. Say "configured in Terraform" rather than "your account has".
- A scanner misconfiguration ID without the asset's exposure is a lead, not a priority.

## Priorities

Use [triage and severity](triage-and-severity.md). Typical ordering with established evidence: public data stores, internet-exposed admin/database ports and secrets in Git → P0/P1; privileged or host-mounted workloads, wildcard IAM and missing IMDSv2 on internet-facing hosts → P1; root containers, missing NetworkPolicies, unpinned images and missing admission policy → P2; hardening toward Restricted and digest pinning → P3 or IDEA.

## Recommend and verify

Give the smallest change: a `securityContext` block, a namespace label in `warn`/`audit` first and then `enforce`, a narrowed IAM statement, a security-group CIDR, `http_tokens = "required"`, a multi-stage Dockerfile with `USER`, a secret reference instead of a literal. Mention what could break (a pod that needs a capability, a client that uses IMDSv1). The user applies it and re-runs their own tools; verification here is a fresh scoped re-read of the changed files or a newly imported Trivy report compared with `compare`, never `confirmed_fixed` for expert findings.

Record each issue with `finding --area other` (or `--area network` for exposure), naming the file and resource in the title, labelled model judgment.

## Coverage statement

Close with the files and resources reviewed, which come from IaC versus an export, imported scanner coverage, and what is unseen: live account drift, cluster runtime state, managed-service defaults, organisation policies and the images' contents beyond imported scanner results. No cloud API, cluster or container was contacted.
