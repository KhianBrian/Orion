# Orion Video Hosting Options

## Core idea

Renting servers from AWS or Azure may be relatively inexpensive, but Orion would still be responsible for the engineering and operations required to make video reliable, secure, and supportable.

Using JaaS, Daily, or LiveKit Cloud costs more as a recurring service, but the provider operates most of the difficult video infrastructure.

> Terminology: JaaS is a managed video service, not a microservice. Self-hosted Jitsi is open-source video software made up of several server components.

## Self-hosted Jitsi on AWS or Azure

`server rental` → pay for virtual machines, storage, bandwidth, and networking

`engineering work` → deploy Jitsi, connect authentication, configure security, networking, monitoring, testing, and recovery

`ongoing operations` → patch servers, monitor capacity, handle incidents, maintain certificates, test upgrades, and provide on-call support

### One-time engineering work

- Choose server size, region, CPU, memory, bandwidth, and deployment topology.
- Deploy and configure Jitsi Meet, Videobridge, Prosody, Jicofo, and TURN.
- Connect Orion’s meeting authorization to the self-hosted deployment.
- Configure HTTPS, firewalls, private rooms, token expiry, rate limits, and secret storage.
- Configure DNS, load balancing, NAT traversal, TURN, and browser compatibility.
- Set up monitoring and alerts for failed calls, high resource use, disconnected bridges, and certificate expiry.
- Test expired tokens, copied room links, wrong users, server restarts, TURN failures, and provider outages.
- Document backup, restore, and recovery procedures.

### Ongoing operations work

- Apply security updates to Linux, Jitsi, dependencies, TLS, and authentication.
- Watch CPU, memory, bandwidth, concurrent calls, and Videobridge capacity.
- Investigate reports such as “the patient cannot join” or “the call dropped.”
- Maintain certificates, DNS, firewall rules, and credentials.
- Review logs and alerts for abuse, failed authentication, and degraded call quality.
- Run backups and restore tests.
- Test browser and device changes.
- Perform staged upgrades: staging first, production second.
- Add bridges, TURN servers, or redundancy as usage grows.
- Provide on-call coverage when video fails outside normal hours.

### Benefits

- More control over infrastructure and data location.
- Less dependence on a video SaaS vendor.
- Potentially economical at sufficiently high, predictable usage.
- Ability to customize the deployment.
- No JaaS monthly-active-user subscription limit.

### Costs and risks

- Orion owns outages and troubleshooting.
- Infrastructure and security expertise are required.
- Monitoring, backups, patching, and recovery become Orion responsibilities.
- Scaling and redundancy must be designed and funded by Orion.
- Engineering time can become more expensive than the server bill.
- A serious outage can affect clinical appointments.
- Compliance and operational responsibility remain with Orion.

## Managed video services: JaaS, Daily, or LiveKit Cloud

`Orion application` → authorizes the participant and requests a short-lived meeting token

`managed provider` → operates the video infrastructure, media routing, availability, and scaling

### Benefits

- Fastest path to launch.
- Much less infrastructure engineering.
- Provider handles servers, upgrades, and media capacity.
- Easier initial cost and capacity planning.
- Existing Jitsi integration can remain largely similar when using JaaS.
- Easier scaling than operating servers ourselves.

### Costs and tradeoffs

- Recurring subscription or usage-based cost.
- Vendor dependency.
- Pricing increases as monthly active users or participant minutes grow.
- Data location, subprocessors, retention, support, and healthcare terms require review.
- Less control over the underlying infrastructure.
- Orion still owns participant authorization, auditability, privacy controls, and outage communication.

## The financial tradeoff

```text
self-hosted Jitsi
= lower provider subscription cost
+ higher engineering and operations cost

managed video service
= higher recurring provider cost
+ lower engineering and operations cost
```

The important question is not only “Which option has the cheapest server bill?” It is:

> Who is responsible when a patient cannot join a scheduled consultation at 9:00 AM?

With JaaS or another managed service, that responsibility is shared with the provider. With self-hosted Jitsi, it is entirely Orion’s.

## Recommended path for Orion

`current demo` → continue using the JaaS free allowance

`early real pilot` → evaluate upgrading JaaS or using Daily/LiveKit Cloud

`larger predictable scale` → compare managed-service fees against the cost of dedicated infrastructure staff

`self-hosted Jitsi` → choose only when Orion needs stronger infrastructure control and has people responsible for operating it

## Meeting takeaway

Self-hosting is not simply “rent a cheap server and install video.” It is taking ownership of a production communications platform. The server rental is one cost; the larger commitment is building and operating the engineering, security, monitoring, support, and recovery capability around it.
