# Test artifacts

This directory is the single local destination for generated test output. Its generated contents are
ignored by Git because traces, screenshots, videos, and HTML reports can contain sensitive test data.

```text
test-artifacts/
└── playwright/
    ├── report/   HTML report opened by `npm run test:e2e:report`
    └── results/  traces, screenshots, videos, and per-test result files
```

Run tests from `Orion_React_App`. Do not commit generated files from this directory, authentication
state, credentials, or real client data. Preserve a failed artifact only as long as needed to
diagnose the failure, then remove it before cleanup.
