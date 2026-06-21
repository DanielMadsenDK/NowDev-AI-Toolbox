# ServiceNow Debugging Best Practices

Use these patterns when diagnosing ServiceNow issues before proposing fixes. The goal is to isolate the failing layer, gather evidence, and hand a narrow root-cause hypothesis to the right implementation agent.

## Diagnostic Order

1. Reproduce the issue with the exact user, role, record, table, view, and steps.
2. Classify the layer: client script/UI policy, server script/business rule, Flow/automation, ACL/security, integration, SDK build/install, or platform configuration.
3. Gather evidence from the closest source:
   - Browser console and form state for client issues.
   - System Logs, transaction logs, and script logs for server issues.
   - Flow execution details for Flow/automation issues.
   - `now-sdk build` output for Fluent compile/schema issues.
   - `now-sdk query` for live table, role, choice, ACL, and record facts.
4. Form one falsifiable root-cause hypothesis.
5. Recommend the smallest fix path and route to the correct developer agent.

## Tool-First Clarification

✅ Prefer environment facts over user questions:

```bash
now-sdk query sys_dictionary -q 'name=incident^elementISNOTEMPTY' -f 'element,column_label,internal_type,reference' -o json
now-sdk query sys_security_acl -q 'name=incident^ORnameSTARTSWITHincident.' -f 'name,operation,active' -o json
now-sdk query sys_user_role -q 'name=itil' -f 'sys_id,name' -o json
```

Ask the user only when the missing information is intent, expected behavior, credentials, or business policy.

## Logging

✅ Scoped server-side logging:

```javascript
gs.info('[MyFeature] Starting assignment evaluation for ' + current.getUniqueValue());
```

✅ Guard verbose debug logs with a system property:

```javascript
if (gs.getProperty('x_app.debug.assignment', 'false') === 'true') {
    gs.debug('[MyFeature] Candidate group: ' + groupName);
}
```

❌ Avoid user-impacting or legacy patterns:

```javascript
alert('debug');
gs.log('debug');
```

## Server-Side Triage

Check these first:

- Does the rule/script run in the expected scope?
- Is the condition true for the specific record?
- Is execution order correct relative to other business rules?
- Is recursion possible through `current.update()` or record updates in after rules?
- Are ACLs or cross-scope privileges blocking access?
- Are queries selective and indexed enough for the target table size?

## Client-Side Triage

Check these first:

- Does the client script load on the right table/view/UI type?
- Is the script type correct (`onLoad`, `onChange`, `onSubmit`, `onCellEdit`)?
- For `onChange`, is the field name exact?
- Is the field hidden/read-only/mandatory due to a UI Policy?
- Is GlideAjax asynchronous and returning expected data?
- Are browser console errors stopping later scripts?

## Performance Triage

Look for:

- Unbounded GlideRecord queries.
- Queries in loops.
- Client scripts making repeated GlideAjax calls on every keystroke.
- Business rules updating the same table recursively.
- Flow/subflow loops with excessive record operations.
- Large reference lookups without filters.

## Handoff Format

When returning diagnostics to a developer agent, include:

```text
Observed symptom:
Evidence gathered:
Likely layer:
Root-cause hypothesis:
Files/artifacts involved:
Recommended fix path:
Validation after fix:
```

Keep the fix path narrow. Do not route unrelated improvements with the bug fix.
