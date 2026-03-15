# Flow Designer - Code Examples

Examples for workflow automation including incident escalation, notification workflows, and conditional logic.

## Table of Contents

1. [Incident Escalation Flow](#incident-escalation-flow)
2. [Approval Workflow](#approval-workflow)
3. [Notification Workflow](#notification-workflow)
4. [Conditional Logic Patterns](#conditional-logic-patterns)

---

## Incident Escalation Flow

**Scenario:** Automatically escalate high-priority incidents to management

**Flow Definition:**

```typescript
import { Record } from '@servicenow/sdk/core'

/**
 * Incident Escalation Flow Configuration
 *
 * Trigger: When incident is created with priority 1 or 2
 * Actions:
 *   1. Send email to assignment group manager
 *   2. Send SMS to on-call manager
 *   3. Create escalation audit record
 *   4. Update incident escalation status
 */

export const escalationFlow = Record({
    $id: Now.ID['incident_escalation_flow'],
    table: 'sys_flow',
    data: {
        name: 'Incident Escalation Flow',
        description: 'Escalates high-priority incidents to management',
        active: true,
    },
})

// Flow trigger
export const flowTrigger = Record({
    $id: Now.ID['escalation_trigger'],
    table: 'sys_flow_trigger',
    data: {
        flow: escalationFlow,
        trigger_type: 'record.created',
        table: 'incident',
        condition: "priority IN ('1','2')",
        description: 'Trigger on critical incident creation',
    },
})

// Action 1: Send Email
export const sendEmailAction = Record({
    $id: Now.ID['escalation_send_email'],
    table: 'sys_flow_action',
    data: {
        flow: escalationFlow,
        action_type: 'send_notification',
        position: 1,
        send_to_role: 'manager',
        subject: 'HIGH PRIORITY: Incident ${incident_number}',
        body: `
            A critical incident requires immediate attention:

            Incident: \${incident_number}
            Priority: \${priority}
            Assigned Group: \${assignment_group}
            Description: \${short_description}

            Take action immediately.
        `,
    },
})

// Action 2: Send SMS
export const sendSMSAction = Record({
    $id: Now.ID['escalation_send_sms'],
    table: 'sys_flow_action',
    data: {
        flow: escalationFlow,
        action_type: 'send_sms',
        position: 2,
        send_to: 'on_call_manager',
        message: 'CRITICAL: Incident \${incident_number} - Check email',
    },
})

// Action 3: Log Escalation
export const logEscalationAction = Record({
    $id: Now.ID['escalation_log'],
    table: 'sys_flow_action',
    data: {
        flow: escalationFlow,
        action_type: 'insert_record',
        position: 3,
        target_table: 'x_incident_escalation',
        field_mapping: {
            incident_reference: 'incident_id',
            escalation_time: 'now',
            escalation_reason: 'High priority incident',
        },
    },
})

// Action 4: Update Incident
export const updateIncidentAction = Record({
    $id: Now.ID['escalation_update'],
    table: 'sys_flow_action',
    data: {
        flow: escalationFlow,
        action_type: 'update_record',
        position: 4,
        table: 'incident',
        field_updates: {
            escalation_level: '2',
            escalated_on: 'now',
            is_escalated: 'true',
        },
    },
})
```

**Flow Logic:**
```
IF incident.priority == 1 OR incident.priority == 2 THEN
  1. Send email to assignment_group.manager
  2. Send SMS to on_call_manager
  3. Create escalation log record
  4. Update incident.escalation_level = 2
  5. Update incident.escalated_on = now
END IF
```

---

## Approval Workflow

**Scenario:** Route catalog requests through multi-level approval

**Flow Components:**

```typescript
import { Record } from '@servicenow/sdk/core'

export const approvalFlow = Record({
    $id: Now.ID['catalog_approval_flow'],
    table: 'sys_flow',
    data: {
        name: 'Catalog Item Approval Workflow',
        description: 'Multi-level approval for expensive catalog items',
        active: true,
    },
})

// Trigger: Request created for expensive items
export const approvalTrigger = Record({
    $id: Now.ID['approval_trigger'],
    table: 'sys_flow_trigger',
    data: {
        flow: approvalFlow,
        trigger_type: 'record.created',
        table: 'sc_request',
        condition: "total_price > 1000",
    },
})

// Decision: Check if price exceeds budget threshold
export const budgetDecision = Record({
    $id: Now.ID['budget_decision'],
    table: 'sys_flow_decision',
    data: {
        flow: approvalFlow,
        position: 1,
        decision_type: 'if_else',
        condition: "total_price > 5000",
        condition_label: 'Price > $5000?',
    },
})

// Action: Send to Director for high-value requests
export const directorApprovalAction = Record({
    $id: Now.ID['director_approval'],
    table: 'sys_flow_action',
    data: {
        flow: approvalFlow,
        action_type: 'create_approval',
        position: 2,
        approval_type: 'director',
        approver_role: 'budget_director',
        subject: 'Budget Approval Required: \${request_number}',
    },
})

// Action: Send to Manager for standard requests
export const managerApprovalAction = Record({
    $id: Now.ID['manager_approval'],
    table: 'sys_flow_action',
    data: {
        flow: approvalFlow,
        action_type: 'create_approval',
        position: 2,
        approval_type: 'manager',
        approver_field: 'requested_for.manager',
        subject: 'Approval Required: \${request_number}',
    },
})

// Action: Notify on approval
export const notifyApprovedAction = Record({
    $id: Now.ID['notify_approved'],
    table: 'sys_flow_action',
    data: {
        flow: approvalFlow,
        action_type: 'send_notification',
        position: 3,
        send_to_field: 'requested_by',
        subject: 'Your request has been approved',
        body: 'Your request \${request_number} has been approved.',
    },
})

// Action: Notify on rejection
export const notifyRejectedAction = Record({
    $id: Now.ID['notify_rejected'],
    table: 'sys_flow_action',
    data: {
        flow: approvalFlow,
        action_type: 'send_notification',
        position: 3,
        send_to_field: 'requested_by',
        subject: 'Your request has been rejected',
        body: 'Your request \${request_number} was not approved.',
    },
})
```

**Approval Logic:**
```
IF total_price > 5000 THEN
  Create approval for: budget_director
ELSE
  Create approval for: requested_for.manager
END IF

IF approval.state == 'approved' THEN
  Notify requester: Approved
  Update request.state = approved
ELSE IF approval.state == 'rejected' THEN
  Notify requester: Rejected
  Update request.state = rejected
END IF
```

---

## Notification Workflow

**Scenario:** Send targeted notifications based on incident state changes

**Flow Definition:**

```typescript
import { Record } from '@servicenow/sdk/core'

export const notificationFlow = Record({
    $id: Now.ID['incident_notification_flow'],
    table: 'sys_flow',
    data: {
        name: 'Incident Notification Workflow',
        description: 'Send notifications on incident state changes',
        active: true,
    },
})

// Trigger: When incident state changes
export const stateChangeTrigger = Record({
    $id: Now.ID['state_change_trigger'],
    table: 'sys_flow_trigger',
    data: {
        flow: notificationFlow,
        trigger_type: 'record.updated',
        table: 'incident',
        trigger_field: 'state',
    },
})

// Decision: What state changed to?
export const stateDecision = Record({
    $id: Now.ID['state_decision'],
    table: 'sys_flow_decision',
    data: {
        flow: notificationFlow,
        position: 1,
        decision_type: 'switch',
        switch_field: 'state',
    },
})

// Action: Notify when assigned
export const notifyAssignedAction = Record({
    $id: Now.ID['notify_assigned'],
    table: 'sys_flow_action',
    data: {
        flow: notificationFlow,
        action_type: 'send_notification',
        position: 2,
        condition_value: 'in_progress',
        send_to_field: 'assigned_to',
        subject: 'Incident assigned to you: \${number}',
        body: 'You have been assigned incident \${number}. \${short_description}',
    },
})

// Action: Notify when resolved
export const notifyResolvedAction = Record({
    $id: Now.ID['notify_resolved'],
    table: 'sys_flow_action',
    data: {
        flow: notificationFlow,
        action_type: 'send_notification',
        position: 2,
        condition_value: 'resolved',
        send_to_field: 'caller_id',
        subject: 'Your incident has been resolved: \${number}',
        body: 'Your incident \${number} has been resolved. \${close_notes}',
    },
})

// Action: Notify when closed
export const notifyClosedAction = Record({
    $id: Now.ID['notify_closed'],
    table: 'sys_flow_action',
    data: {
        flow: notificationFlow,
        action_type: 'send_notification',
        position: 2,
        condition_value: 'closed',
        send_to_field: 'caller_id',
        subject: 'Incident closed: \${number}',
        body: 'Your incident \${number} has been closed.',
    },
})
```

---

## Conditional Logic Patterns

### IF-THEN-ELSE Pattern

```
IF incident.priority == 1 THEN
  assignment_group = 'Critical Support'
  escalation_level = 1
  notify_executives = true
ELSE IF incident.priority == 2 THEN
  assignment_group = 'Urgent Support'
  escalation_level = 2
ELSE
  assignment_group = 'Standard Support'
  escalation_level = 0
END IF
```

### SWITCH Pattern

```
SWITCH incident.category:
  CASE 'software':
    assignment_group = 'Software Support'
  CASE 'hardware':
    assignment_group = 'Hardware Support'
  CASE 'network':
    assignment_group = 'Network Support'
  DEFAULT:
    assignment_group = 'General Support'
END SWITCH
```

### Parallel Actions

```
When incident is created:
  IN PARALLEL:
    - Send notification to assignment group
    - Send notification to requester
    - Create audit log
    - Update statistics
  END PARALLEL
```

### Wait and Resume Pattern

```
When request created:
  1. Send approval request
  2. WAIT FOR approval.state != 'waiting'
  3. IF approved:
       Fulfill request
     ELSE:
       Notify rejection
     END IF
```

---

## Best Practices for Flows

✓ **Clear Naming** - Use descriptive names for flows and actions
✓ **Logical Grouping** - Group related actions together
✓ **Error Handling** - Include fallback paths for failures
✓ **Notifications** - Keep users informed of state changes
✓ **Auditing** - Log important workflow steps
✓ **Performance** - Keep flows efficient, avoid loops
✓ **Testing** - Test all conditional branches

---

## Common Patterns

| Pattern | Use Case |
|---------|----------|
| Escalation | High-priority work needs attention |
| Approval | Major changes need authorization |
| Notification | Users need state updates |
| Routing | Work distributed to right team |
| Conditional branching | Different paths based on data |

---

## Triggering Flows Programmatically

```javascript
// In a script include or business rule
var flowApi = new global.FlowAPI();
flowApi.startFlow('flow_name', {
    table: 'incident',
    recordId: current.sys_id,
    context: {
        custom_field: 'value'
    }
});
```

See [BEST_PRACTICES.md](BEST_PRACTICES.md) for advanced flow patterns and troubleshooting.
