---
name: nowdev-ai-toolbox-release-notes
context: fork
user-invocable: false
description: Expert skill for retrieving, navigating, and summarizing ServiceNow release notes directly from the official ServiceNowDocs GitHub repository. Use this skill whenever a user asks about new features, changes, upgrades, deprecation, or bug fixes for any ServiceNow release (e.g., Australia, Yokohama, Xanadu, Zurich), even if they do not explicitly mention "release notes" or the GitHub repository. It must be leveraged when analyzing application updates or comparing platform features across family releases.
---

# ServiceNow Release Notes Retrieval and Navigation Guide

This skill provides precise guidelines and workflows for retrieving, navigating, and extracting ServiceNow release notes from the official `ServiceNow/ServiceNowDocs` repository hosted on GitHub.

## Overview of the ServiceNowDocs Structure

ServiceNow's open-source documentation repo hosts release notes in markdown format. 

- **Subdomain Base URL:** `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs`
- **Release Directory Parameter:** `[RELEASE]` (e.g., `australia`, `xanadu`, `yokohama`, `zurich`)
  - *Case Sensitivity Note:* Always convert the release name to **lowercase** (e.g., "australia", not "Australia") when formatting the URL. The GitHub raw contents endpoint is strictly case-sensitive, and lowercase release names are used on disk.
- **Root Release Notes Page:** `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/[RELEASE]/markdown/release-notes/index.md`

The `index.md` file is a comprehensive Table of Contents (TOC) pointing to hundreds of product-specific release notes files within the same directory. To avoid overloading the context, you should fetch the `index.md` TOC first, locate the relevant sub-file, and then fetch that specific sub-page.

---

## Step-by-Step Retrieval Workflow

When asked for information regarding ServiceNow release notes, follow this workflow:

### Step 1: Query the Root Release Notes Index
Construct the URL for the root index of the target release:
`URL: https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/[RELEASE_NAME_LOWERCASE]/markdown/release-notes/index.md`

Retrieve this root file to discover the layout and locate specific features or products requested by the user.

When the user requests a cross-release comparison, repeat Steps 1–3 for each release independently, then in Step 4 present a side-by-side summary table of additions, changes, and removals for the requested product across those releases.

### Step 2: Search the Root Index for Relevant Sub-pages
Since the root index contains links to specific markdown files, search the fetched index file for the product or category in question. Most files follow this suffix naming pattern:
`https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/[RELEASE]/markdown/release-notes/[product-slug]-rn.md` or `[product-slug]-rn-landing.md`

Examples discovered in the Australia release:
- **Now Assist & Agentic AI:** `now-assist-rn-landing.md`
- **Now Assist for ITSM:** `now-assist-for-itsm-rn.md`
- **SQL API:** `sql-api-rn.md`
- **ServiceNow SDK:** `servicenow-sdk-rn.md`
- **ServiceNow IDE:** `servicenow-ide-rn.md`
- **Portfolio Planning:** `portfolio-planning-rn.md`
- **Incident Management:** `incident-management-rn.md`

### Step 3: Fetch the Specific Target Page
Fetch the deep link webpage associated with the target application to gather detailed feature highlights, changes, deprecation guidelines, and requirements.

### Step 4: Synthesize and Present the Release Notes
When compiling the response for the user:
1. State the release family (e.g. Australia).
2. Detail the exact features added, updated, or deprecated.
3. List the pre-upgrade or post-upgrade requirements or prerequisites if applicable.
4. Provide the exact reference URL from the `ServiceNow/ServiceNowDocs` repository so the user can verify or deep dive further. Format files or links using proper markdown links, adhering to link guidelines.

---

## Technical Link Reference Cheatsheet

Below are common landing points for comprehensive updates across family releases:

- **Root Index:** `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/[release]/markdown/release-notes/index.md`
- **Highlights for all features/products:** `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/[release]/markdown/release-notes/rn-summary-highlights.md`
- **New features and products:** `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/[release]/markdown/release-notes/rn-summary-new-features.md`
- **Changes to features and products:** `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/[release]/markdown/release-notes/rn-summary-changes.md`
- **Removed features and products:** `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/[release]/markdown/release-notes/rn-summary-removed-features.md`
- **Deprecation information:** `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/[release]/markdown/release-notes/rn-summary-deprecated-info.md`
- **Upgrade planning checklist:** `https://raw.githubusercontent.com/ServiceNow/ServiceNowDocs/[release]/markdown/release-notes/upgrades-planning-checklist.md`
