# Orion Knowledge Base

This is the authoritative foundation for Orion. Orion is being prepared for a controlled real-market pilot with real clients and psychiatrists; it is not documented as a public-Jitsi showcase. Code does not override these policies.

## Documents

| Document | Purpose | Read it when |
| --- | --- | --- |
| [Product](product/) | Scope, service boundary, appointment rules, clinical safety, and the company-owner decision register. | Planning any user-facing capability or workflow. |
| [Architecture](architecture/) | System design, data/RBAC, threats, video, and access auditing. | Changing data, auth, video, APIs, security, or integrations. |
| [Governance](governance/) | Privacy, data classification, consent, retention, and approval ownership. | Handling real client/clinician data, vendors, notices, or requests. |
| [Engineering](engineering/) | Code conventions, QA, test-data policy, and ordered delivery plan. | Coding, reviewing, testing, releasing, or choosing next work. |
| [Operations](operations/) | Environments, secrets, deployment, monitoring, incidents, and recovery. | Deploying, configuring vendors, or operating the pilot. |
| [Audit trail](audit-trail/README.md) | Contains dated records of prior UX, architecture, and implementation audits. | Understanding historical changes, decisions, or known limitations. |

## Authority order

1. Governance and clinical policy define whether Orion may process data or provide a workflow.
2. Product documents define the approved service boundary.
3. Architecture defines secure technical boundaries.
4. Engineering and operations documents define implementation, verification, and release discipline.
5. Audit entries explain history; they never authorise a current change.

When documents conflict, stop and update the knowledge base deliberately before coding.
