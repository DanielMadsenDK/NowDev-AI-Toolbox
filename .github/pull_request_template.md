## Summary

Describe what changed and why.

## Change Type

- [ ] Feature
- [ ] Bug fix
- [ ] Hotfix
- [ ] Refactor
- [ ] Documentation

## ServiceNow Scope

- [ ] Fluent/source-code artifacts
- [ ] Update Set exception lane
- [ ] Both (explain why)

If Update Set lane is used, provide naming pattern and intent:

App Name - Story ID - Brief Description

## Branching

- [ ] This PR targets the correct branch for the chosen strategy.
- [ ] No direct push was used for protected branches.
- [ ] For shared features, changes were integrated from the feature branch flow.

## Validation

- [ ] npm ci
- [ ] npx @servicenow/sdk build --frozenKeys
- [ ] Additional tests/scans completed (if applicable)

## Deployment Intent

- [ ] Merge should auto-deploy to dev integration
- [ ] Manual promotion to test will be requested after validation
- [ ] Production promotion follows governed flow (App Repository/AEMC/ReleaseOps)

## Update Set Parity (Only if Update Set lane was used)

- [ ] Update Set preview completed without unresolved errors
- [ ] Matching Git back-port commit created or linked
- [ ] Parent/child ordering documented (if batching used)

## References

- Story / ticket:
- Related PRs:
- Release notes impact:
