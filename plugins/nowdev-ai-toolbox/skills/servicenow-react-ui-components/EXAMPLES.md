# @servicenow/react-components — Complete Working Examples

All examples use the component APIs documented in the reference files in this skill directory.
For full component API details see the reference files listed in [SKILL.md](./SKILL.md).

---

## Example 1: Incident Form Page

A full `UiPage` incident form using `RecordProvider`, `FormActionBar`, `FormColumnLayout`,
`ActivityStreamCompose`, `ActivityStream`, `Attachments`, and `RelatedLists`.

```tsx
// src/client/pages/IncidentForm.tsx
import React, {useState} from 'react';
import {RecordProvider} from '@servicenow/react-components/RecordContext';
import {FormActionBar} from '@servicenow/react-components/FormActionBar';
import {FormColumnLayout} from '@servicenow/react-components/FormColumnLayout';
import {ActivityStreamCompose} from '@servicenow/react-components/ActivityStreamCompose';
import {ActivityStream} from '@servicenow/react-components/ActivityStream';
import {Attachments} from '@servicenow/react-components/Attachments';
import {RelatedLists} from '@servicenow/react-components/RelatedLists';
import {Alert} from '@servicenow/react-components/Alert';
import {Heading} from '@servicenow/react-components/Heading';

interface IncidentFormPageProps {
  /** sys_id of the incident to edit, or "-1" to create a new record */
  sysId: string;
}

export default function IncidentFormPage({sysId}: IncidentFormPageProps) {
  const [savedAlert, setSavedAlert] = useState(false);

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem'}}>
      <Heading
        label={sysId === '-1' ? 'New Incident' : 'Edit Incident'}
        level={1}
        variant="header-primary"
        hasNoMargin
      />

      {savedAlert && (
        <Alert
          status="positive"
          header="Saved"
          content="Incident updated successfully."
          action={{type: 'dismiss'}}
          autoDismissConfig={{enableAutoDismiss: true, duration: 4000, showTimer: true}}
          onActionClicked={() => setSavedAlert(false)}
          onAutoDismiss={() => setSavedAlert(false)}
        />
      )}

      {/*
        All form components for a single record MUST share one RecordProvider.
        Pass sysId="-1" when creating a new record.
      */}
      <RecordProvider table="incident" sysId={sysId}>
        {/* FormActionBar needs a width-constrained container */}
        <div style={{width: '100%'}}>
          <FormActionBar
            onUiActionBarClicked={e => {
              const {actionSysId} = e.detail.payload;
              if (actionSysId === 'sysverb_update' || actionSysId === 'sysverb_insert') {
                setSavedAlert(true);
              }
            }}
          />
        </div>

        {/* Two-column form layout with default sections */}
        <FormColumnLayout />

        {/* Work notes composer always above the stream */}
        <ActivityStreamCompose />
        <ActivityStream style={{flex: 1, minHeight: '300px'}} />

        <Attachments />

        <RelatedLists limit={5} />
      </RecordProvider>
    </div>
  );
}
```

---

## Example 2: Incident List with Row Navigation

A paginated incident list using `NowRecordListConnected` with click-to-navigate row handling.

```tsx
// src/client/pages/IncidentList.tsx
import React, {useState} from 'react';
import {NowRecordListConnected} from '@servicenow/react-components/NowRecordListConnected';
import {Heading} from '@servicenow/react-components/Heading';
import {Button} from '@servicenow/react-components/Button';
import {TemplateMessage} from '@servicenow/react-components/TemplateMessage';

interface IncidentListProps {
  /** Callback fired when the user clicks a row or "New" */
  onNavigate: (sysId: string | null, table: string) => void;
}

export default function IncidentList({onNavigate}: IncidentListProps) {
  const [hasResults, setHasResults] = useState(true);

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem'}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <Heading label="Incidents" level={1} variant="header-primary" hasNoMargin />
        <Button
          label="New Incident"
          variant="primary"
          size="md"
          icon="plus-fill"
          onClicked={() => onNavigate('-1', 'incident')}
        />
      </div>

      {hasResults ? (
        <NowRecordListConnected
          table="incident"
          listTitle="All Incidents"
          columns="number,short_description,priority,state,assigned_to,sys_updated_on"
          limit={20}
          view="workspace"
          onRowClicked={e => {
            // Payload is at e.detail.payload — NOT e.detail directly
            const {sys_id, table} = e.detail.payload;
            onNavigate(sys_id, table);
          }}
        />
      ) : (
        <TemplateMessage
          illustration="no-results"
          heading="No incidents found"
          content="There are no incidents matching your current filters."
          actions={[{label: 'Create Incident', variant: 'primary'}]}
          onActionClicked={() => onNavigate('-1', 'incident')}
        />
      )}
    </div>
  );
}
```

---

## Example 3: Dashboard with Tabs and Cards

A tabbed dashboard layout using `Tabs`, `Card`, `CardHeader`, `Heading`, `Badge`,
`LabelValueStacked`, and `Alert`.

```tsx
// src/client/pages/Dashboard.tsx
import React, {useState} from 'react';
import {Tabs} from '@servicenow/react-components/Tabs';
import {Card} from '@servicenow/react-components/Card';
import {CardHeader} from '@servicenow/react-components/CardHeader';
import {Heading} from '@servicenow/react-components/Heading';
import {Badge} from '@servicenow/react-components/Badge';
import {LabelValueStacked} from '@servicenow/react-components/LabelValueStacked';
import {Alert} from '@servicenow/react-components/Alert';
import {HighlightedValue} from '@servicenow/react-components/HighlightedValue';
import {Loader} from '@servicenow/react-components/Loader';

// ---- Mock data (replace with real REST API calls) ----
const SUMMARY_STATS = [
  {label: 'Open', value: '142', color: 'info' as const},
  {label: 'In Progress', value: '58', color: 'warning' as const},
  {label: 'Resolved Today', value: '37', color: 'positive' as const},
  {label: 'Critical P1', value: '7', color: 'critical' as const},
];

const RECENT_P1S = [
  {number: 'INC0012301', description: 'Production DB down', assignee: 'Alice Johnson'},
  {number: 'INC0012298', description: 'VPN gateway unreachable', assignee: 'Bob Smith'},
  {number: 'INC0012295', description: 'Email relay failure', assignee: 'Carol White'},
];

const TAB_ITEMS = [
  {id: 'overview', label: 'Overview'},
  {id: 'critical', label: 'Critical', count: 7},
  {id: 'assignments', label: 'My Assignments', count: 14},
  {id: 'reports', label: 'Reports'},
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading] = useState(false);
  const [dismissedAlert, setDismissedAlert] = useState(false);

  if (loading) return <Loader label="Loading dashboard..." />;

  return (
    <div style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <Heading label="Service Desk Dashboard" level={1} variant="header-primary" hasNoMargin />

      {!dismissedAlert && (
        <Alert
          status="warning"
          header="Maintenance Window"
          content="Scheduled maintenance on Saturday 02:00–04:00 UTC. Some services may be unavailable."
          action={{type: 'dismiss'}}
          onActionClicked={() => setDismissedAlert(true)}
        />
      )}

      {/* Summary stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {SUMMARY_STATS.map(stat => (
          <Card key={stat.label} size="md" sidebar={{color: stat.color, variant: 'primary'}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
              <span
                style={{
                  fontSize: 'var(--now-font-size--sm)',
                  color: 'var(--now-color_text--secondary, #6b778c)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {stat.label}
              </span>
              <span
                style={{
                  fontSize: 'var(--now-font-size--xl)',
                  fontWeight: 'var(--now-font-weight--bold)',
                  color: 'var(--now-color_text--primary, #1c1f23)',
                }}
              >
                {stat.value}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabbed content area */}
      <div>
        <Tabs
          items={TAB_ITEMS}
          selectedItem={activeTab}
          size="md"
          onSelectedItemSet={e => setActiveTab(e.detail.payload.value)}
        />

        <div style={{marginTop: '1rem'}}>
          {activeTab === 'overview' && (
            <div
              style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem'}}
            >
              {/* Recent critical incidents */}
              <Card size="md">
                <Heading
                  label="Recent Critical Incidents"
                  level={2}
                  variant="title-secondary"
                  hasNoMargin
                />
                <div
                  style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem'}}
                >
                  {RECENT_P1S.map(inc => (
                    <div
                      key={inc.number}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 'var(--now-space--4)',
                        borderBottom: '1px solid var(--now-color_divider--primary, #e0e0e0)',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 'var(--now-font-weight--semi-bold)',
                            color: 'var(--now-color_text--primary, #1c1f23)',
                          }}
                        >
                          {inc.number}
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--now-font-size--sm)',
                            color: 'var(--now-color_text--secondary, #6b778c)',
                          }}
                        >
                          {inc.description}
                        </div>
                      </div>
                      <HighlightedValue label="P1" color="critical" size="sm" />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quick stats */}
              <Card size="md">
                <Heading
                  label="Today at a Glance"
                  level={2}
                  variant="title-secondary"
                  hasNoMargin
                />
                <div style={{marginTop: '1rem'}}>
                  <LabelValueStacked
                    items={[
                      {label: 'SLA Breaches', value: '3'},
                      {label: 'Avg Resolution Time', value: '4h 12m'},
                      {label: 'Customer Satisfaction', value: '4.2 / 5'},
                      {label: 'Unassigned', value: '17'},
                    ]}
                  />
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'critical' && (
            <Card size="md">
              <Heading label="Critical Incidents" level={2} variant="title-secondary" />
              <p style={{color: 'var(--now-color_text--secondary, #6b778c)'}}>
                {/* Wire up NowRecordListConnected for the real list */}
                Critical incidents list — replace with{' '}
                <code>NowRecordListConnected</code> filtered to priority=1.
              </p>
            </Card>
          )}

          {activeTab === 'assignments' && (
            <Card size="md">
              <Heading label="My Assignments" level={2} variant="title-secondary" />
              <p style={{color: 'var(--now-color_text--secondary, #6b778c)'}}>
                Assignments — replace with <code>NowRecordListConnected</code> filtered to
                assigned_to=current user.
              </p>
            </Card>
          )}

          {activeTab === 'reports' && (
            <Card size="md">
              <Heading label="Reports" level={2} variant="title-secondary" />
              <Badge value={0} color="info" />
              <p style={{color: 'var(--now-color_text--secondary, #6b778c)', marginTop: '0.5rem'}}>
                No reports configured.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Example 4: Styled MetricCard Component (CSS Modules + Horizon Tokens)

A complete custom component that uses a `.module.css` file with Horizon design tokens
alongside `Card` from `@servicenow/react-components`.

For full styling guidance see [STYLING.md](./STYLING.md).

### `global.d.ts` — required declaration

```ts
// src/client/global.d.ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

### CSS Module

```css
/* src/client/components/MetricCard.module.css */
.body {
  display: flex;
  flex-direction: column;
  gap: var(--now-space--4);
  /* Card already supplies outer padding; body adds inner rhythm only */
}

.label {
  font-family: var(--now-font-family--primary);
  font-size: var(--now-font-size--sm);
  font-weight: var(--now-font-weight--normal);
  color: var(--now-color_text--secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.value {
  font-family: var(--now-font-family--primary);
  font-size: var(--now-font-size--xl);
  font-weight: var(--now-font-weight--bold);
  color: var(--now-color_text--primary);
  line-height: 1.2;
}

.trend {
  display: inline-flex;
  align-items: center;
  gap: var(--now-space--2);
  font-family: var(--now-font-family--primary);
  font-size: var(--now-font-size--sm);
  font-weight: var(--now-font-weight--semi-bold);
}

.trendUp {
  color: var(--now-color--positive-6);
}

.trendDown {
  color: var(--now-color--critical-6);
}

.trendNeutral {
  color: var(--now-color_text--secondary);
}

.footer {
  margin-top: var(--now-space--4);
  padding-top: var(--now-space--4);
  border-top: 1px solid var(--now-color_divider--primary);
  font-family: var(--now-font-family--primary);
  font-size: var(--now-font-size--xs);
  color: var(--now-color_text--secondary);
}
```

### React component

```tsx
// src/client/components/MetricCard.tsx
import React from 'react';
import {Card} from '@servicenow/react-components/Card';
import {Icon} from '@servicenow/react-components/Icon';
import styles from './MetricCard.module.css';

type TrendDirection = 'up' | 'down' | 'neutral';
type StatusColor = 'positive' | 'critical' | 'warning' | 'info';

interface MetricCardProps {
  /** Short uppercase label shown above the value (e.g. "Open Incidents") */
  label: string;
  /** The primary metric value displayed large (e.g. 142 or "4.2 / 5") */
  value: string | number;
  /** Arrow direction for the trend indicator */
  trend?: TrendDirection;
  /** Text shown next to the trend arrow (e.g. "12% vs last week") */
  trendLabel?: string;
  /** Small muted text shown at the bottom of the card */
  footer?: string;
  /**
   * Coloured left-side sidebar (uses Card's sidebar prop).
   * Omit or set to undefined for no sidebar.
   */
  status?: StatusColor;
}

const TREND_ICONS: Record<TrendDirection, string> = {
  up: 'arrow-up-outline',
  down: 'arrow-down-outline',
  neutral: 'subtract-outline',
};

export function MetricCard({
  label,
  value,
  trend = 'neutral',
  trendLabel,
  footer,
  status,
}: MetricCardProps) {
  const trendClass =
    trend === 'up'
      ? styles.trendUp
      : trend === 'down'
      ? styles.trendDown
      : styles.trendNeutral;

  return (
    <Card
      size="md"
      sidebar={status ? {color: status, variant: 'primary'} : undefined}
    >
      <div className={styles.body}>
        <span className={styles.label}>{label}</span>

        <span className={styles.value}>{value}</span>

        {(trend !== 'neutral' || trendLabel) && (
          <span className={`${styles.trend} ${trendClass}`}>
            <Icon icon={TREND_ICONS[trend]} size="sm" />
            {trendLabel}
          </span>
        )}

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </Card>
  );
}
```

### Usage in a dashboard grid

```tsx
// src/client/pages/MetricsDashboard.tsx
import React from 'react';
import {Heading} from '@servicenow/react-components/Heading';
import {MetricCard} from '../components/MetricCard';

export default function MetricsDashboard() {
  return (
    <div style={{padding: '1.5rem'}}>
      <Heading label="Operational Metrics" level={1} variant="header-primary" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        <MetricCard
          label="Open Incidents"
          value={142}
          trend="down"
          trendLabel="12% vs last week"
          status="info"
          footer="Updated 5 min ago"
        />
        <MetricCard
          label="Critical P1s"
          value={7}
          trend="up"
          trendLabel="3 new today"
          status="critical"
        />
        <MetricCard
          label="Resolved Today"
          value={38}
          trend="up"
          trendLabel="Above target"
          status="positive"
          footer="Target: 30"
        />
        <MetricCard
          label="SLA at Risk"
          value={11}
          trend="down"
          trendLabel="Improving"
          status="warning"
        />
      </div>
    </div>
  );
}
```

---

## Example 5: Confirmation Modal with Form

A `Modal` containing form inputs (`Input`, `Select`) with Cancel / Confirm buttons.
The confirm action is disabled while required fields are empty.

```tsx
// src/client/components/CreateTaskModal.tsx
import React, {useState} from 'react';
import {Modal} from '@servicenow/react-components/Modal';
import {Input} from '@servicenow/react-components/Input';
import {Select} from '@servicenow/react-components/Select';
import {Textarea} from '@servicenow/react-components/Textarea';
import {Alert} from '@servicenow/react-components/Alert';

interface CreateTaskModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (task: {title: string; priority: string; description: string}) => void;
}

const PRIORITY_OPTIONS = [
  {id: '1', label: 'Critical'},
  {id: '2', label: 'High'},
  {id: '3', label: 'Moderate'},
  {id: '4', label: 'Low'},
  {id: '5', label: 'Planning'},
];

export function CreateTaskModal({opened, onClose, onConfirm}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isValid = title.trim().length > 0 && priority.length > 0;

  function handleConfirm() {
    if (!isValid) {
      setErrorMsg('Title and Priority are required.');
      return;
    }
    setErrorMsg(null);
    onConfirm({title: title.trim(), priority, description});
    // Reset form state
    setTitle('');
    setPriority('');
    setDescription('');
  }

  function handleClose() {
    setErrorMsg(null);
    setTitle('');
    setPriority('');
    setDescription('');
    onClose();
  }

  return (
    <Modal
      opened={opened}
      size="md"
      headerLabel="Create Task"
      footerActions={[
        {label: 'Cancel', variant: 'secondary'},
        {
          label: 'Create Task',
          variant: 'primary',
          disabled: !isValid,
        },
      ]}
      onOpenedSet={e => {
        if (!e.detail.payload.value) handleClose();
      }}
      onFooterActionClicked={e => {
        const {label} = e.detail.payload.action;
        if (label === 'Create Task') {
          handleConfirm();
        } else {
          handleClose();
        }
      }}
    >
      {/* Children replace the 'content' prop when provided */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--now-space--8)',
          padding: 'var(--now-space--8)',
        }}
      >
        {errorMsg && (
          <Alert
            status="critical"
            header="Validation Error"
            content={errorMsg}
            action={{type: 'dismiss'}}
            onActionClicked={() => setErrorMsg(null)}
          />
        )}

        <Input
          label="Task Title"
          value={title}
          placeholder="Enter a short task description"
          required
          invalid={title.trim().length === 0}
          messages={
            title.trim().length === 0
              ? [{status: 'error', content: 'Title is required'}]
              : undefined
          }
          onValueSet={e => setTitle(e.detail.payload.value)}
        />

        <Select
          label="Priority"
          items={PRIORITY_OPTIONS}
          selectedItem={priority}
          placeholder="Select a priority"
          required
          onSelectedItemSet={e => setPriority(e.detail.payload.value)}
        />

        <Textarea
          label="Description"
          value={description}
          placeholder="Optional — add more context about this task"
          rows={4}
          onValueSet={e => setDescription(e.detail.payload.value)}
        />
      </div>
    </Modal>
  );
}
```

### Usage with the trigger button

```tsx
// src/client/pages/SomeParentPage.tsx
import React, {useState} from 'react';
import {Button} from '@servicenow/react-components/Button';
import {Alert} from '@servicenow/react-components/Alert';
import {CreateTaskModal} from '../components/CreateTaskModal';

export default function SomeParentPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleCreateTask(task: {
    title: string;
    priority: string;
    description: string;
  }) {
    // Replace with your REST API call (e.g. GlideAjax or fetch to Table API)
    console.log('Creating task:', task);
    setSuccessMsg(`Task "${task.title}" created successfully.`);
    setModalOpen(false);
  }

  return (
    <div style={{padding: '1.5rem'}}>
      {successMsg && (
        <Alert
          status="positive"
          header="Task Created"
          content={successMsg}
          action={{type: 'dismiss'}}
          autoDismissConfig={{enableAutoDismiss: true, duration: 4000, showTimer: true}}
          onActionClicked={() => setSuccessMsg(null)}
          onAutoDismiss={() => setSuccessMsg(null)}
        />
      )}

      <Button
        label="Create Task"
        variant="primary"
        icon="plus-fill"
        onClicked={() => setModalOpen(true)}
      />

      <CreateTaskModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleCreateTask}
      />
    </div>
  );
}
```
