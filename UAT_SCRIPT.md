# UAT Script — Maintenance Task & QC Management System
**Version**: Post-validation (SGT-9000HL + SGT-8000H turbine-aware workflow)
**Tester role**: Engineer (Ahmed Al-Rashidi) unless noted

---

## TC-01 — Login

| Step | Action | Expected |
|------|--------|----------|
| 1.1 | Open the app root URL | Login screen appears: "Turbine QC — Select your account to continue" |
| 1.2 | Observe user list | At least 5 users shown with name, role badge, avatar initials |
| 1.3 | Click **Ahmed Al-Rashidi** (Engineer) | Spinner appears on card; app loads immediately after |
| 1.4 | Confirm app shell | Sidebar shows Dashboard / Task List / Create Task / Asset History; header shows "Ahmed Al-Rashidi — ENGINEER"; logo reads "SGT-9000HL" |
| 1.5 | Click logout icon (top-right arrow) | Returns to login screen; localStorage is cleared |

---

## TC-02 — Create Task: SGT-9000HL

| Step | Action | Expected |
|------|--------|----------|
| 2.1 | Click **Create Task** in sidebar | Page: "Create Maintenance Task — Select turbine unit, pinpoint location, then define the work order." Step 1 of 2 active |
| 2.2 | Observe turbine unit cards | Two cards: **SGT-9000HL** (4-stage hot section, TBC-coated blades, Strict clearance tolerances) and **SGT-8000H** (3-stage hot section, Can-annular combustors) |
| 2.3 | Click the **SGT-9000HL** card | Card gets selected state (blue border/ring); Location Selector panel updates to show Step 2: "Select Section" |
| 2.4 | Click **Turbine** section in the location panel | Section highlight; Step 3 "Select Stage" appears |
| 2.5 | Select **Stage 1** | Stage selected; breadcrumb reads "SGT-9000HL Unit 1 › Turbine › Stage 1"; "Continue to Task Details →" button appears |
| 2.6 | Click **Continue to Task Details** | Step 2 header becomes active; form fields appear (Title, Description, Priority, Assigned To, Estimated Hours, Deadline) |
| 2.7 | Confirm section name in form | Section label shows **"Turbine"** (SGT-9000HL naming) |
| 2.8 | Fill in Title: "Stage 1 TBC Coating Inspection" | Title field populated |
| 2.9 | Set Priority to **High**, assign to any technician, set Deadline 7 days out | Fields populate |
| 2.10 | Click **Create Task** | Toast: "Task created"; redirected to Task Detail or Task List |

---

## TC-03 — Create Task: SGT-8000H

| Step | Action | Expected |
|------|--------|----------|
| 3.1 | Click **Create Task** | Fresh form; both turbine cards visible |
| 3.2 | Click the **SGT-8000H** card | Card selected; right panel updates |
| 3.3 | Select **Combustion Chamber** section | Section shown as "Combustion Chamber" (SGT-8000H naming — NOT "Mid Frame") |
| 3.4 | Select any stage | Breadcrumb reads "SGT-8000H Unit 1 › Combustion Chamber › Stage X" |
| 3.5 | Continue to Step 2 | Form renders; section label shows **"Combustion Chamber"** |
| 3.6 | Try selecting **Turbine** section for SGT-8000H | QC panel in Step 2 shows **amber** (non-critical) warnings, not red critical banner |
| 3.7 | Fill minimum fields and create | Task created successfully |

---

## TC-04 — Apply OEM Template

| Step | Action | Expected |
|------|--------|----------|
| 4.1 | Start creating a task on SGT-9000HL › Turbine › Stage 1 | Proceed to Step 2 (Task Details) |
| 4.2 | Click **Templates** sidebar/button in Step 2 | Template picker opens showing relevant templates for model + section |
| 4.3 | Expand a template (e.g. "Stage 1 TBC Blade Inspection") | Checklist items, measurements, tolerances, and OEM reference are visible |
| 4.4 | Click **Apply** on that template | Title and Description fields auto-fill from template content |
| 4.5 | Confirm OEM note appears | Note reads: "OEM Siemens procedures are MANDATORY and override all template defaults." |

---

## TC-05 — Task Lifecycle: Start / Pause / Resume / Submit

*Prerequisites: An existing task in **Assigned** status (e.g. TSK-0002)*

| Step | Action | Expected |
|------|--------|----------|
| 5.1 | Open TSK-0002 from Task List | Status badge: **Assigned**; "Start Work" button visible |
| 5.2 | Click **Start Work** | Status changes to **In Progress**; Time Tracking panel shows running timer or start time |
| 5.3 | Click **Pause** | Pause reason dialog/prompt appears |
| 5.4 | Enter pause reason and confirm | Status: **Paused**; time entry logged with pause reason |
| 5.5 | Click **Resume** | Status returns to **In Progress**; timer resumes |
| 5.6 | Click **Submit for QC Review** | Status: **Submitted**; QC Review section becomes active |

---

## TC-06 — QC Flow: Reject → Revision → Resubmit

*Prerequisites: Task in **Submitted** status*

| Step | Action | Expected |
|------|--------|----------|
| 6.1 | Log in as **Khalid Hamdan** (QC Engineer) or any user with QC access | Switch user via logout |
| 6.2 | Open a Submitted task | "Approve" and "Reject" buttons visible in QC section |
| 6.3 | Click **Reject** without entering a comment | Button remains inactive or validation error: comment is required for rejection |
| 6.4 | Enter rejection comment and click **Reject** | Status: **Rejected**; QC history entry shows reviewer name, timestamp, and comment |
| 6.5 | Log back in as original engineer (Ahmed Al-Rashidi) | |
| 6.6 | Open the rejected task | Status: **Rejected**; rejection comment visible; "Resubmit" button available |
| 6.7 | Click **Resubmit** | Status: **Submitted** again; QC history now shows 2 entries |

---

## TC-07 — QC Flow: Approve → Locked State

*Prerequisites: Task in **Submitted** status*

| Step | Action | Expected |
|------|--------|----------|
| 7.1 | Open a Submitted task as QC-authorized user | "Approve" button visible |
| 7.2 | Click **Approve** | Status: **Approved**; success confirmation |
| 7.3 | Attempt to edit any field on the approved task | All edit controls are hidden or disabled; task shows read-only locked state |
| 7.4 | Confirm QC history entry | Shows approver name, timestamp, "Approved" badge |
| 7.5 | Verify no Start/Pause/Resume/Submit buttons remain | Page shows only metadata and history |

---

## TC-08 — QC Warnings & Requirements by Turbine Type

| Step | Action | Expected |
|------|--------|----------|
| 8.1 | Open Task Detail for **TSK-0001** (SGT-9000HL, Turbine, Stage 1) | **Red critical zone banner**: "CRITICAL ZONE — SGT-9000HL — HIGH TEMPERATURE ZONE — Stage 1 blades marked CRITICAL. Engineer sign-off mandatory before close-up." |
| 8.2 | Confirm OEM procedure reference in banner | Shows "OEM Procedure: SI-2241-HL — mandatory, overrides all templates" |
| 8.3 | Expand the **SGT-9000HL QC Requirements** collapsible | Shows 6 mandatory rules (e.g. borescope inspection required, tip clearance measurement, blade erosion documentation) and 1 recommended rule |
| 8.4 | Open any SGT-8000H task (Turbine section) | **Amber** (non-critical) warning banner, not red. Lower mandatory rule count |
| 8.5 | Open a Compressor section task (either model) | Different set of QC rules; no critical zone banner |
| 8.6 | In **Create Task**, select SGT-9000HL → Turbine in Step 2 | QC warning banner and rule count preview visible inline before submitting |
| 8.7 | In **Create Task**, switch to SGT-8000H → Turbine | QC panel updates to SGT-8000H rules (different counts/severity) |

---

## Known Technical Debt (out of scope for UAT)

- `useListUsers`, `useListAssets`, `useGetComponentHistory` — TS2305 "not exported" errors from the generated API client. Runtime works (esbuild strips types). Scheduled for client codegen cleanup.
- Implicit `any` parameters throughout `LoginGate.tsx` and `AssetHistory.tsx` — pre-existing, non-blocking.
