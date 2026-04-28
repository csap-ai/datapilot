# GitHub Setup

Repository: `csap-ai/datapilot`

Description:

```text
AI-native database workspace for developers, analysts, and teams.
```

## Repository Settings

Recommended settings:

- Visibility: Public.
- Default branch: `main`.
- License: Apache-2.0.
- Issues: Enabled.
- Discussions: Optional, enable when community activity starts.
- Wiki: Enabled after first public README is stable.
- Projects: Optional, use GitHub Projects if roadmap tracking moves from docs.
- Sponsorship: Later.

## Branch Protection

Enable for `main` after the first push:

- Require pull request before merging.
- Require status checks to pass.
- Require CI workflow `Go` and `Web`.
- Require branches to be up to date before merging.
- Do not allow force pushes.
- Do not allow deletion.

## Labels

Recommended labels:

- `area:desktop`
- `area:web`
- `area:api`
- `area:ai`
- `area:database`
- `area:admin`
- `area:audit`
- `area:security`
- `area:docs`
- `area:mobile`
- `type:bug`
- `type:feature`
- `type:task`
- `type:decision`
- `priority:p0`
- `priority:p1`
- `priority:p2`
- `good first issue`

## GitHub Actions

Current CI:

- Go API tests.
- Web build.

Future CI:

- Go lint.
- TypeScript lint.
- Wails build smoke test.
- Secret scanning.
- Dependency review.
- Release packaging.

## Pull Requests

Every PR should include:

- Summary.
- Validation evidence.
- Whether progress docs changed.
- Whether decisions changed.
- Secret handling confirmation when relevant.

## Releases

Release channels planned:

- `nightly`: unstable development builds.
- `preview`: public preview.
- `stable`: production-ready releases.

Desktop packaging will be added after Wails build validation.
