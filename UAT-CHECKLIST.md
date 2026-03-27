# Turbine QC — UAT Checklist

Three testers required: **Engineer**, **Technician**, **Supervisor**.
Execute in order. Mark each box when verified.

---

## ENGINEER — Full Workflow (SGT-9000HL)

### Create Task
- [ ] Login as engineer (Ahmed Al-Rashidi)
- [ ] Navigate to Create Task
- [ ] Confirm SGT-9000HL and SGT-8000H both appear in turbine selector
- [ ] Select SGT-9000HL
- [ ] Select Turbine section on diagram
- [ ] Select Stage 1, then Rotor Blade component
- [ ] Confirm template picker loads templates for this context
- [ ] Fill title: "UAT — Stage 1 Rotor Blade Inspection"
- [ ] Set priority: High
- [ ] Set deadline: tomorrow
- [ ] Assign to technician (Khalid Hamdan)
- [ ] Submit — confirm task created, redirects to task list
- [ ] Note the task ID: `________`

### Verify Notifications
- [ ] Switch to technician (Khalid) — confirm bell badge shows unread count
- [ ] Open notification panel — confirm "New Task Assigned" notification appears
- [ ] Click notification — confirm it navigates to the new task

---

## TECHNICIAN — Work Execution

### Time Tracking
- [ ] Login as technician (Khalid Hamdan)
- [ ] Open the assigned task
- [ ] Click Start Work — confirm timer starts, status shows "in_progress"
- [ ] Click Pause Work — confirm reason modal appears
- [ ] Select or type a pause reason, confirm pause
- [ ] Confirm status shows "paused", time entry logged in Time Log table
- [ ] Click Resume Work — confirm timer restarts
- [ ] Click Stop Work — confirm timer stops, entry closed

### Attachments
- [ ] Click upload area in Attachments section
- [ ] Upload a JPEG or PNG image — confirm it appears in list with filename and uploader name
- [ ] Upload a PDF — confirm it appears
- [ ] Try uploading a .exe or .zip — confirm rejection message
- [ ] Click the file link — confirm it opens/downloads

### Signature + Submit
- [ ] Scroll to Completion Signature section
- [ ] Confirm Submit button is disabled with "Sign above to enable submission" message
- [ ] Draw a signature on the canvas, click Save
- [ ] Confirm signature shows as saved with name, role, timestamp
- [ ] Click Submit for QC Review
- [ ] Confirm task status changes to "submitted"

### Verify Notifications
- [ ] Login as engineer or supervisor — confirm bell shows "Task Ready for QC Review" notification

---

## SUPERVISOR — QC Review (Reject)

### Reject Task
- [ ] Login as supervisor (Sarah Mitchell)
- [ ] Open the submitted task
- [ ] Confirm QC Review panel is visible with signature pad
- [ ] Type rejection comment: "Blade tip clearance measurement missing"
- [ ] Click Reject (do NOT sign yet — confirm approve is disabled without signature)
- [ ] Confirm task status changes to "revision_needed"

### Verify Notification
- [ ] Switch to technician — confirm "Task Rejected" notification with comment

---

## TECHNICIAN — Revision + Resubmit

- [ ] Login as technician (Khalid)
- [ ] Open the rejected task — confirm status is "revision_needed"
- [ ] Click Start Work (or Resume) — confirm status returns to "in_progress"
- [ ] Do work, then Stop
- [ ] Re-sign completion signature (or confirm previous signature persists)
- [ ] Submit for QC again
- [ ] Confirm status is "submitted"

---

## SUPERVISOR — QC Review (Approve)

- [ ] Login as supervisor (Sarah Mitchell)
- [ ] Open the resubmitted task
- [ ] Draw QC approval signature, click Save
- [ ] Confirm approve button becomes enabled
- [ ] Click Approve
- [ ] Confirm task status is "approved"
- [ ] Confirm task shows "QC Approved — Read Only" lock banner
- [ ] Confirm all action buttons are hidden (no start, pause, submit, QC)

### Verify Notification
- [ ] Switch to technician — confirm "Task Approved" notification

---

## ENGINEER — Second Turbine (SGT-8000H)

- [ ] Login as engineer
- [ ] Create Task → select SGT-8000H
- [ ] Confirm sections load (Compressor, Combustion Chamber, Turbine, Exhaust)
- [ ] Select Turbine → confirm stages load (Stage 1–4)
- [ ] Select a stage and component
- [ ] Fill title, assign to a technician, submit
- [ ] Confirm task created successfully with correct asset name in task detail

---

## AUDIT LOG — Verify Trail

- [ ] Open the fully-approved task (from first workflow)
- [ ] Scroll to Activity Log / Audit Timeline section
- [ ] Confirm the following events are recorded with actor name + timestamp:
  - [ ] Task created
  - [ ] Task assigned
  - [ ] Work session started
  - [ ] Work paused (with reason)
  - [ ] Work resumed
  - [ ] Work session completed
  - [ ] Submitted for QC
  - [ ] QC rejected (with comment)
  - [ ] Work session started (revision)
  - [ ] Submitted for QC (resubmit)
  - [ ] QC approved

---

## ROLE RESTRICTIONS — Negative Tests

### Technician Cannot Create Task
- [ ] Login as technician
- [ ] Navigate to /create-task — confirm access denied message shown
- [ ] Confirm Create Task nav item is hidden or disabled

### Technician Cannot QC
- [ ] Login as technician
- [ ] Open a "submitted" or "under_qc" task
- [ ] Confirm QC Review panel is NOT shown (shows "Awaiting QC Review" instead)

### Supervisor/Engineer Can Do Both
- [ ] Login as engineer — confirm Create Task page accessible
- [ ] Login as supervisor — confirm QC Review panel visible on submitted tasks

---

## AUTH STABILITY

- [ ] Login as engineer → logout → login as technician → logout → login as supervisor
- [ ] Confirm no stale data from previous user after each switch
- [ ] Confirm server remains responsive throughout
- [ ] Confirm no "Unable to reach server" errors

---

## Pass / Fail Summary

| Section | Tester | Result |
|---------|--------|--------|
| Create Task (9000HL) | Engineer | |
| Notifications (assign) | Technician | |
| Time Tracking | Technician | |
| Attachments | Technician | |
| Signature + Submit | Technician | |
| QC Reject | Supervisor | |
| Revision + Resubmit | Technician | |
| QC Approve | Supervisor | |
| Second Turbine (8000H) | Engineer | |
| Audit Log | Any | |
| Role Restrictions | All | |
| Auth Stability | All | |

**Tester sign-off:**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineer | | | |
| Technician | | | |
| Supervisor | | | |
