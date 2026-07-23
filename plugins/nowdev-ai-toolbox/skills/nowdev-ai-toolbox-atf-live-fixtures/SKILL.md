---
name: nowdev-ai-toolbox-atf-live-fixtures
context: fork
user-invocable: false
description: Formulate realistic, anonymized ServiceNow Automated Test Framework (ATF) test fixture/sample data grounded by live instance structures. Use this skill whenever an ATF test needs example, mock, or fixture data for specific ServiceNow tables, when a user asks to generate realistic test data from the live instance, or when reference sys_ids/choices are required for testing. This skill delegates read-only `now-sdk` retrieval to `nowdev-ai-toolbox-servicenow-sdk`, then meticulously redacts PII before generating mock fixture shapes.
---

# ServiceNow ATF Live Fixture Data Generator

This skill is designed to guide the generation of realistic, context-grounded Automated Test Framework (ATF) mock data and fixtures for testing ServiceNow applications. Instead of inventing fabricated placeholder records or guess-working reference identifiers, it guides you to fetch real examples from the live ServiceNow instance as structural templates, then scrub and redact any sensitive/personally identifiable information (PII) before delivering pristine development fixtures.

---

## 1. Trigger Conditions & Pushiness

You must actively apply this skill in the following scenarios:
- The developer references creating or updating Automated Test Framework (ATF) tests, step definitions, or custom test suites that require mock/fixture data.
- The developer requests sample data, test records, or test fixtures for specific ServiceNow tables (e.g., `incident`, `change_request`, `sys_user`, or custom tables).
- The developer asks to inspect a live ServiceNow instance to ensure the generated test data matches choice lists, valid reference `sys_id` values, and realistic field lengths/shapes.
- **Do not wait for the developer to explicitly say "use the live fixtures skill".** If any request asks for test/sample data templates that involve standard tables, trigger this skill to grounding-query the instance first, ensuring correct structure.

---

## 2. Safe & Read-Only Live Data Grounding

To understand the real data shape and prevent fictitious reference values, query the connected ServiceNow instance.

### A. Retrieval Specification
Load `nowdev-ai-toolbox-servicenow-sdk` before using `now-sdk`; it is the sole authority for command construction, flags, authentication aliases, output handling, pagination, and CLI troubleshooting. Ask it to perform strictly read-only retrievals using this intent:

| Table | Filter intent | Fields | Limit intent |
|---|---|---|---|
| Target fixture table | Match a representative, non-sensitive record shape relevant to the requested test | Only fixture-relevant fields such as `sys_id`, `short_description`, `assignment_group`, `caller_id`, `category`, and `state` | At most three records; fewer when one record establishes the shape |
| `sys_choice` | Match target table and element; exclude inactive choices | `name,element,value,label,inactive` | Only choices needed by the fixture |
| `sys_dictionary` | Match target table and requested elements | `name,element,column_label,internal_type,reference,max_length` | Only fields used by the fixture |
| Referenced table | Match active or otherwise valid records suitable for the reference field | `sys_id` plus the minimum fields needed to validate suitability | At most three candidates per reference |

### B. Discovering Field Metadata
If choice-list options, target schemas, or dictionary choices are needed to build realistic data, query the system tables:
- **Choices:** `sys_choice` (e.g., `name=incident^element=state^inactive=false`)
- **Metadata:** `sys_dictionary` (e.g., `name=incident^element=category`)
- **Reference Integrity:** Obtain valid reference `sys_id` values for target fields (e.g., query a standard user from `sys_user` or active assignment group from `sys_user_group` with `active=true` to get genuine `sys_id` values for `caller_id` or `assignment_group`).

---

## 3. Mandatory PII Redaction & Data Masking

**CRITICAL POLICY:** Real personally identifiable information (PII), confidential information, or business secrets must NEVER be written into committed test fixtures or code. You must meticulously identify any sensitive values in the query outputs and replace them before presenting them in code files.

### A. Non-Negotiable Redaction Categories
- **Full Names / User Titles:** Replace with fake, descriptive names (e.g. `Fred Luddy` -> `Mock Employee`, `Abel Tuter` -> `Test Requester`).
- **Emails:** Replace with standard `@example.com` or `@example.org` dummy addresses (e.g. `john.doe@company.com` -> `john.doe@example.com`).
- **Phone / Fax Numbers:** Swap with dummy ranges (e.g. `555-0100` to `555-0199`).
- **Addresses / Locations:** Erase actual street addresses; replace with mock city/zip codes or standard generic locations.
- **Passwords / Secrets / Access Keys:** If any freeform fields contain text looking like a password, cryptographic key, hash, or auth token, erase it entirely or replace with a string like `[REDACTED_MOCK_SECRET]`.
- **IP / Server Addresses:** Replace with standard mock IPs (e.g. `192.0.2.1` or `127.0.0.1` subnet block) and domain names like `mockhost.example.com`.

### B. Preserving Technical Realism
While scrubbing PII, preserve the technical form:
- Kept the same **string length limits** and overall formats.
- Retain valid **`sys_id` formats** (32-character hexadecimal strings) so reference fields do not cause platform reference errors during test execution.
- Maintain correct choice values (e.g., check `state` or `priority` against retrieved integer or string choice keys).

---

## 4. Structuring the Deliverable

When outputting mock data, structure it clearly as a Javascript object or JSON template suitable for inclusion in your Automated Test Framework (ATF) steps or test files. 

### Output Template Structure
Always present the data with:
1. **Source Table context** and target query used.
2. **Structural Schema Summary** (fields mapped, choices, reference fields).
3. **Scrubbed Mock Code Output:** Well-commented, formatted JSON or Fluent/Javascript code ready to copy-paste.

Example fixture output structure:
```javascript
// Generated Test Fixture for sys_user table (GROUNDED & SCRUBBED)
// Grounding intent: one active sys_user record with an employee number
const mockUserFixture = {
  sys_id: "0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d", // Real valid sys_id from instance to pass references
  first_name: "Mocked",                       // Scrubbed from real name
  last_name: "User",                          // Scrubbed from real name
  email: "mocked.user@example.com",          // Scrubbed from real email
  user_name: "mock.user",                    // Scrubbed ID
  employee_number: "EMP0004921",             // Retained pattern
  active: "true"
};
```
