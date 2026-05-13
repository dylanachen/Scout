"""
Seed realistic data for daniel2@gmail.com so the AI features have something to work on.

Creates:
  - 3 projects owned by daniel2 (freelancer) with real client users
  - Rich chat transcripts per project (including a scope-creep moment for Scope Guardian)
  - Tasks, time entries, invoices w/ line items
  - Notifications, scope decisions, participants

Idempotent: safe to run repeatedly. Re-running won't duplicate messages if the
project already has seeded messages (detected by marker text).

Usage:
    cd backend && python seed_daniel.py
"""
import json as _json
import sqlite3
from datetime import datetime, timedelta, timezone

from database import get_conn, init_db
from auth import hash_password

DANIEL_EMAIL = "daniel2@gmail.com"
DANIEL_NAME = "Daniel"
DANIEL_ROLE = "freelancer"
DANIEL_DEFAULT_PASSWORD = "daniel123"  # only used if the user doesn't already exist

SEED_MARKER = "[seed:daniel2]"  # embedded in one message per project to detect prior seeding


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def date_iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def ensure_user(c, *, email: str, name: str, role: str, password: str = "demo") -> int:
    row = c.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if row:
        return row["id"]
    c.execute(
        "INSERT INTO users (email, name, hashed_pw, role) VALUES (?, ?, ?, ?)",
        (email, name, hash_password(password), role),
    )
    return c.lastrowid


def ensure_profile(c, uid: int, **fields):
    row = c.execute("SELECT user_id FROM user_profiles WHERE user_id = ?", (uid,)).fetchone()
    cols = []
    vals = []
    for k, v in fields.items():
        cols.append(k)
        vals.append(_json.dumps(v) if isinstance(v, list) else v)
    if row:
        set_clause = ", ".join(f"{k} = ?" for k in cols)
        c.execute(f"UPDATE user_profiles SET {set_clause}, updated_at = datetime('now') WHERE user_id = ?", (*vals, uid))
    else:
        cols2 = ["user_id", *cols]
        placeholders = ", ".join("?" for _ in cols2)
        c.execute(
            f"INSERT INTO user_profiles ({', '.join(cols2)}) VALUES ({placeholders})",
            (uid, *vals),
        )


def project_already_seeded(c, project_id: int) -> bool:
    row = c.execute(
        "SELECT 1 FROM messages WHERE project_id = ? AND text LIKE ? LIMIT 1",
        (project_id, f"%{SEED_MARKER}%"),
    ).fetchone()
    return bool(row)


def insert_project(c, *, name: str, client_name: str, owner_id: int,
                   description: str, skills: list, budget_min: int, budget_max: int,
                   timeline_weeks: int) -> int:
    row = c.execute(
        "SELECT id FROM projects WHERE name = ? AND owner_id = ?", (name, owner_id)
    ).fetchone()
    if row:
        return row["id"]
    c.execute(
        """INSERT INTO projects
           (name, client_name, owner_id, description, budget_min, budget_max,
            required_skills, timeline_weeks, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')""",
        (name, client_name, owner_id, description, budget_min, budget_max,
         _json.dumps(skills), timeline_weeks),
    )
    return c.lastrowid


def add_participant(c, project_id: int, name: str, role: str, email: str, color: str):
    existing = c.execute(
        "SELECT 1 FROM participants WHERE project_id = ? AND email = ?",
        (project_id, email),
    ).fetchone()
    if existing:
        return
    c.execute(
        """INSERT INTO participants (project_id, name, role, email, avatar_color)
           VALUES (?, ?, ?, ?, ?)""",
        (project_id, name, role, email, color),
    )


def insert_message(c, project_id: int, sender_id: int, sender_name: str, text: str, when: datetime) -> int:
    c.execute(
        "INSERT INTO messages (project_id, sender_id, sender_name, text, created_at) VALUES (?, ?, ?, ?, ?)",
        (project_id, sender_id, sender_name, text, iso(when)),
    )
    return c.lastrowid


def insert_task(c, *, project_id: int, title: str, status: str, description: str,
                assignee_id: int, due_date: str, created_by: int):
    c.execute(
        """INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (project_id, title, description, status, assignee_id, due_date, created_by),
    )


def insert_time_entry(c, *, user_id: int, project_id: int, date: str,
                      duration_minutes: int, description: str, billable: int = 1, invoiced: int = 0):
    c.execute(
        """INSERT INTO time_entries
           (user_id, project_id, date, duration_minutes, description, billable, invoiced)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, project_id, date, duration_minutes, description, billable, invoiced),
    )


def insert_invoice(c, *, invoice_id: str, project_id: int, owner_id: int,
                   amount_cents: int, status: str, title: str, description: str,
                   due_date: str, issued_at: str, client_email: str, notes: str = "",
                   paid_at: str = None, line_items: list = None):
    exists = c.execute("SELECT 1 FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
    if exists:
        return
    amount_str = f"${amount_cents / 100:,.2f}"
    c.execute(
        """INSERT INTO invoices
           (id, project_id, owner_id, amount, amount_cents, status, title, description,
            due_date, issued_at, paid_at, client_email, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (invoice_id, project_id, owner_id, amount_str, amount_cents, status, title,
         description, due_date, issued_at, paid_at, client_email, notes),
    )
    for li in (line_items or []):
        c.execute(
            """INSERT INTO invoice_line_items
               (invoice_id, description, quantity, unit_price_cents, total_cents)
               VALUES (?, ?, ?, ?, ?)""",
            (invoice_id, li["description"], li["quantity"], li["unit_price_cents"], li["total_cents"]),
        )


def insert_notification(c, *, user_id: int, kind: str, title: str, body: str,
                        project_id: int, link: str, when: datetime):
    c.execute(
        """INSERT INTO notifications (user_id, kind, title, body, link, project_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, kind, title, body, link, project_id, iso(when)),
    )


def insert_decision(c, project_id: int, message_id: int, decision: str):
    c.execute(
        "INSERT INTO scope_decisions (project_id, message_id, decision) VALUES (?, ?, ?)",
        (project_id, message_id, decision),
    )


# ────────────────────────────────────────────────────────────────────────────
# Content: 3 realistic projects with rich transcripts
# ────────────────────────────────────────────────────────────────────────────

def build_project_1(c, daniel_id: int, client_id: int, client_name: str, client_role_label: str):
    """SaaS onboarding redesign — Summit Analytics.
    Long transcript: kickoff → concepts → feedback → scope creep → resolution → handoff."""
    project_id = insert_project(
        c,
        name="SaaS onboarding redesign",
        client_name="Summit Analytics",
        owner_id=daniel_id,
        description="Redesign the new-user onboarding flow for a B2B analytics SaaS. "
                    "Covers auth, workspace setup, data source connect, and first dashboard.",
        skills=["React", "TypeScript", "Figma", "UX Research"],
        budget_min=9000_00,
        budget_max=14000_00,
        timeline_weeks=6,
    )
    if project_already_seeded(c, project_id):
        return project_id

    add_participant(c, project_id, "Daniel", "Freelancer", DANIEL_EMAIL, "#1d6ecd")
    add_participant(c, project_id, client_name, client_role_label, "pm@summit-analytics.example.com", "#7c3aed")
    add_participant(c, project_id, "Priya Raman", "Head of Product", "priya@summit-analytics.example.com", "#059669")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    t0 = now - timedelta(days=18)

    turns = [
        (client_id, client_name, t0,
         "Hey Daniel — we're ready to kick off the onboarding redesign. I dropped the current flow Loom in the shared folder. Biggest pain: 38% of new signups drop at the 'connect data source' step."),
        (daniel_id, "Daniel", t0 + timedelta(hours=1, minutes=10),
         "Watched it. Agree — the modal sequence is doing too much at once. I'll audit the current flow today and send a one-pager with 2-3 structural directions by EOD Friday."),
        (client_id, client_name, t0 + timedelta(hours=1, minutes=25),
         "Perfect. For scope confirmation — we agreed: auth, workspace setup, data connect, first dashboard. 6 weeks, $11k. Out of scope: admin panel, billing, and the public marketing site."),
        (daniel_id, "Daniel", t0 + timedelta(hours=1, minutes=30),
         f"Confirmed. {SEED_MARKER} I'll keep the scope tight. One question — for 'data connect' do we need to cover all 12 source types in v1 or just the top 3 (Postgres, BigQuery, Stripe)?"),
        (client_id, client_name, t0 + timedelta(hours=3),
         "Top 3 for v1 is fine. The long tail can be a follow-up once we validate the pattern."),

        (daniel_id, "Daniel", t0 + timedelta(days=3, hours=4),
         "Sent the one-pager. TL;DR: three directions — (A) progressive disclosure w/ a checklist sidebar, (B) 'choose your path' split by role, (C) guided setup with inline sample data. My recommendation is (A)."),
        (client_id, client_name, t0 + timedelta(days=3, hours=6),
         "Read it twice. I'm leaning A too — the progressive checklist matches how our PMM team talks about activation. Priya has a few notes, she'll comment in Figma."),
        (daniel_id, "Daniel", t0 + timedelta(days=3, hours=7),
         "Great. I'll start wireframes Monday. Planning a mid-fidelity review on day 8 so we can iterate before visual polish."),

        (client_id, client_name, t0 + timedelta(days=8, hours=2),
         "Wireframes look solid. Two things: (1) the checklist sticking on scroll feels great, (2) the empty-state illustration for 'no data yet' — can we use something warmer? Current one feels clinical."),
        (daniel_id, "Daniel", t0 + timedelta(days=8, hours=3),
         "Noted. I'll commission 3 illustration options from Maria (she did our last brand work). Lead time is ~4 days. Within our illustration budget line."),
        (client_id, client_name, t0 + timedelta(days=8, hours=3, minutes=20),
         "Sounds good."),

        # ── Scope creep moment — client casually asks for admin panel work ──
        (client_id, client_name, t0 + timedelta(days=10, hours=1),
         "Hey while you're in there — our admin panel is also pretty rough. Could you do a similar pass on the team-management screens? Shouldn't be much, same design system right?"),
        (daniel_id, "Daniel", t0 + timedelta(days=10, hours=2),
         "That's outside our current SOW (we flagged admin as out of scope in week 1). Happy to scope it separately — rough estimate would be +2 weeks, $3-4k depending on depth. Want me to write a change order?"),
        (client_id, client_name, t0 + timedelta(days=10, hours=2, minutes=30),
         "Fair. Yes, please send a change order — I'll loop in finance."),

        (daniel_id, "Daniel", t0 + timedelta(days=12, hours=4),
         "High-fi screens of the main onboarding checklist are in Figma, page 'v2-review'. Covered: empty state, in-progress state, completed state, and the first-dashboard moment."),
        (client_id, client_name, t0 + timedelta(days=12, hours=6),
         "These are really strong. Two asks: (1) can the completed state have a lighter celebration — confetti feels heavy for a B2B tool, (2) for Stripe connect specifically, we need an extra 'test mode / live mode' toggle — forgot to mention earlier."),
        (daniel_id, "Daniel", t0 + timedelta(days=12, hours=7),
         "(1) easy — I'll swap confetti for a subtle pulse + checkmark. (2) The test/live toggle is a real new requirement. Small but real. I'll absorb it since it's inside the Stripe flow we already budgeted, but flagging so you know."),

        (client_id, client_name, t0 + timedelta(days=14, hours=3),
         "Appreciate you absorbing it. Priya approved the updated screens today. Clear to build."),
        (daniel_id, "Daniel", t0 + timedelta(days=14, hours=4),
         "Great. Starting React implementation. Will deploy to staging incrementally — I'll ping when there's something to click."),

        (daniel_id, "Daniel", t0 + timedelta(days=16, hours=5),
         "Staging is live: https://onboarding-v2.summit-analytics.staging.example.com — progressive checklist + empty state ship. Postgres/BigQuery/Stripe connectors next."),
        (client_id, client_name, t0 + timedelta(days=16, hours=7),
         "Clicked through 4 times. Feels significantly smoother. Bug: if you skip the workspace-name step, the checklist jumps to step 3 visually but the progress bar says 2. Minor."),
        (daniel_id, "Daniel", t0 + timedelta(days=16, hours=8),
         "Caught it — off-by-one in the skip handler. Fix pushed, should be live in ~5min."),
        (daniel_id, "Daniel", t0 + timedelta(days=17, hours=2),
         "All three connectors done. End-to-end flow works on staging. I'll cut a demo Loom tomorrow AM."),
        (client_id, client_name, t0 + timedelta(days=17, hours=6),
         "Excellent. Deadline check — we're targeting prod ship for the 28th. Still tracking?"),
        (daniel_id, "Daniel", t0 + timedelta(days=17, hours=7),
         "Tracking. Remaining: illustrations integration, analytics events, QA pass. ~3 days of focused work. Should comfortably land the 28th."),
    ]

    msg_ids = []
    for sid, sname, when, text in turns:
        msg_ids.append(insert_message(c, project_id, sid, sname, text, when))

    # Decisions pulled from the chat
    insert_decision(c, project_id, msg_ids[2],
                    "Scope locked: auth + workspace + data-connect (top 3 sources) + first dashboard. 6 weeks, $11k.")
    insert_decision(c, project_id, msg_ids[7],
                    "Going with Direction A (progressive checklist).")
    insert_decision(c, project_id, msg_ids[12],
                    "Admin panel work is out of SOW — handled via change order.")

    # Tasks
    insert_task(c, project_id=project_id, title="Audit current onboarding flow", status="done",
                description="Watch current Loom, list drop-off points, write one-pager.",
                assignee_id=daniel_id, due_date=date_iso(t0 + timedelta(days=3)), created_by=daniel_id)
    insert_task(c, project_id=project_id, title="Wireframes — direction A (progressive checklist)", status="done",
                description="Checklist sidebar + 4 main states.",
                assignee_id=daniel_id, due_date=date_iso(t0 + timedelta(days=8)), created_by=daniel_id)
    insert_task(c, project_id=project_id, title="High-fi screens — hand off to eng", status="done",
                description="Final Figma w/ spec notes + interactive prototype.",
                assignee_id=daniel_id, due_date=date_iso(t0 + timedelta(days=12)), created_by=daniel_id)
    insert_task(c, project_id=project_id, title="Implement Postgres / BigQuery / Stripe connectors", status="in_progress",
                description="React components + data hooks + error handling.",
                assignee_id=daniel_id, due_date=date_iso(t0 + timedelta(days=20)), created_by=daniel_id)
    insert_task(c, project_id=project_id, title="QA pass + analytics events", status="todo",
                description="Instrument activation funnel events; run through 4 device sizes.",
                assignee_id=daniel_id, due_date=date_iso(t0 + timedelta(days=25)), created_by=daniel_id)

    # Time entries (past week, realistic)
    week_base = now - timedelta(days=7)
    time_data = [
        (0, 180, "Wireframe iteration — checklist states"),
        (0, 90, "Sync with Priya re: activation metrics"),
        (1, 240, "High-fi Figma polish"),
        (2, 300, "Stripe connector React implementation"),
        (2, 60, "Staging deploy + bug triage"),
        (3, 270, "BigQuery connector + error states"),
        (4, 210, "Postgres connector + docs"),
        (5, 150, "Illustrations integration"),
    ]
    for days_ago, mins, desc in time_data:
        insert_time_entry(
            c, user_id=daniel_id, project_id=project_id,
            date=date_iso(week_base + timedelta(days=days_ago)),
            duration_minutes=mins, description=desc,
        )

    # Invoices
    insert_invoice(
        c, invoice_id=f"inv_{project_id}_01",
        project_id=project_id, owner_id=daniel_id,
        amount_cents=5500_00, status="paid",
        title=f"INV-2026-0201",
        description="SaaS onboarding redesign — Phase 1 (research + wireframes + high-fi)",
        due_date=date_iso(t0 + timedelta(days=14)),
        issued_at=iso(t0 + timedelta(days=7)),
        paid_at=iso(t0 + timedelta(days=11)),
        client_email="ap@summit-analytics.example.com",
        line_items=[
            {"description": "Research + audit (one-pager)", "quantity": 8, "unit_price_cents": 12500, "total_cents": 100000},
            {"description": "Wireframes (Direction A)", "quantity": 16, "unit_price_cents": 12500, "total_cents": 200000},
            {"description": "High-fi screens + prototype", "quantity": 20, "unit_price_cents": 12500, "total_cents": 250000},
        ],
    )
    insert_invoice(
        c, invoice_id=f"inv_{project_id}_02",
        project_id=project_id, owner_id=daniel_id,
        amount_cents=4800_00, status="sent",
        title=f"INV-2026-0208",
        description="SaaS onboarding redesign — Phase 2 (implementation milestone 1)",
        due_date=date_iso(now + timedelta(days=10)),
        issued_at=iso(now - timedelta(days=2)),
        client_email="ap@summit-analytics.example.com",
        line_items=[
            {"description": "Connector implementation (Postgres, BigQuery, Stripe)", "quantity": 28, "unit_price_cents": 12500, "total_cents": 350000},
            {"description": "Checklist UI + empty / progress / done states", "quantity": 12, "unit_price_cents": 12500, "total_cents": 150000},
        ],
    )

    # Notification for daniel
    insert_notification(
        c, user_id=daniel_id, kind="invoice_paid",
        title="Invoice paid — INV-2026-0201",
        body="Summit Analytics paid $5,500.00 for phase 1.",
        project_id=project_id,
        link=f"/projects/{project_id}/invoice-draft",
        when=t0 + timedelta(days=11),
    )

    return project_id


def build_project_2(c, daniel_id: int, client_id: int, client_name: str):
    """Marketing site rebuild — Harborline Coffee."""
    project_id = insert_project(
        c,
        name="Marketing site rebuild",
        client_name="Harborline Coffee",
        owner_id=daniel_id,
        description="Rebuild harborlinecoffee.com on a modern stack. Tailwind + Framer Motion, "
                    "CMS-driven. 4 weeks.",
        skills=["React", "Tailwind", "Framer Motion", "CMS"],
        budget_min=5000_00,
        budget_max=7500_00,
        timeline_weeks=4,
    )
    if project_already_seeded(c, project_id):
        return project_id

    add_participant(c, project_id, "Daniel", "Freelancer", DANIEL_EMAIL, "#1d6ecd")
    add_participant(c, project_id, client_name, "Client — Owner", "hello@harborline.example.com", "#ea580c")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    t0 = now - timedelta(days=9)

    turns = [
        (client_id, client_name, t0,
         f"Morning Daniel — excited to start. {SEED_MARKER} Here's our current site. Main goal: feel warmer, load faster, and let us update menu + shop hours without calling the agency."),
        (daniel_id, "Daniel", t0 + timedelta(hours=2),
         "Got it. Quick framing: I'll use Next.js + Tailwind for the frontend, and Sanity as the CMS — your team edits in a friendly UI and it deploys automatically. Performance should be solid."),
        (client_id, client_name, t0 + timedelta(hours=3),
         "Sanity sounds fine. Budget-wise we're at $6k all-in. Does that cover everything incl. CMS setup?"),
        (daniel_id, "Daniel", t0 + timedelta(hours=3, minutes=30),
         "$6k covers: design + build + CMS setup + content migration for your current 8 pages + 1 training session for your team. Not covered: ongoing hosting (Vercel free tier is fine for your traffic) and custom illustrations."),
        (client_id, client_name, t0 + timedelta(hours=4),
         "Good. Let's go."),

        (daniel_id, "Daniel", t0 + timedelta(days=3),
         "Homepage concept is in Figma. Kept the typography light and warm — big photography, lots of whitespace, hours + today's featured beans front and center."),
        (client_id, client_name, t0 + timedelta(days=3, hours=2),
         "Love it. Two tweaks: (1) can we show the specific baristas working today? Customers love our team. (2) the menu pdf download — scrap that, make it a real menu page."),
        (daniel_id, "Daniel", t0 + timedelta(days=3, hours=3),
         "(1) Easy if your Sanity schema has a 'staff on today' field — I'll add it. (2) Actual menu page is better anyway. Adding it."),

        (daniel_id, "Daniel", t0 + timedelta(days=6),
         "Shipped to staging: https://harborline-v2.staging.example.com. CMS login sent to your email. Give it a whirl — try editing hours and watching the site update."),
        (client_id, client_name, t0 + timedelta(days=6, hours=3),
         "This is really fun to use. Edited the hours + added 'Single-origin Ethiopian' to the menu — worked instantly. One question though — can we also sell gift cards through the site?"),
        (daniel_id, "Daniel", t0 + timedelta(days=6, hours=4),
         "Gift cards would need a Stripe integration — that's outside what we scoped. I can do it as a phase 2 for $1.2-1.8k depending on whether you want email delivery."),
        (client_id, client_name, t0 + timedelta(days=6, hours=5),
         "Let's table that for now. Just get the main site out the door."),

        (daniel_id, "Daniel", t0 + timedelta(days=8),
         "All 8 pages migrated. Training session ready — sent you 3 time slots this week. After training I'll do a final QA pass and then point the domain."),
    ]
    msg_ids = [insert_message(c, project_id, sid, sname, text, when) for sid, sname, when, text in turns]

    insert_decision(c, project_id, msg_ids[4], "Budget locked at $6k. Gift cards explicitly deferred to phase 2.")
    insert_decision(c, project_id, msg_ids[11], "Phase 2 gift cards: not proceeding now.")

    insert_task(c, project_id=project_id, title="Homepage concept", status="done",
                description="Figma concept + desktop/mobile variants.",
                assignee_id=daniel_id, due_date=date_iso(t0 + timedelta(days=3)), created_by=daniel_id)
    insert_task(c, project_id=project_id, title="Sanity schema + CMS setup", status="done",
                description="Content types for hours, menu, staff, locations.",
                assignee_id=daniel_id, due_date=date_iso(t0 + timedelta(days=5)), created_by=daniel_id)
    insert_task(c, project_id=project_id, title="Migrate all 8 pages", status="done",
                description="Content move + per-page responsive QA.",
                assignee_id=daniel_id, due_date=date_iso(t0 + timedelta(days=8)), created_by=daniel_id)
    insert_task(c, project_id=project_id, title="Client training session", status="todo",
                description="60min call — walk through editing hours, menu, staff, images.",
                assignee_id=daniel_id, due_date=date_iso(now + timedelta(days=2)), created_by=daniel_id)
    insert_task(c, project_id=project_id, title="Domain pointing + final QA", status="todo",
                description="DNS cutover + staging → prod checklist.",
                assignee_id=daniel_id, due_date=date_iso(now + timedelta(days=5)), created_by=daniel_id)

    week_base = now - timedelta(days=6)
    for days_ago, mins, desc in [
        (0, 240, "Homepage Figma concept"),
        (1, 120, "Sanity schema"),
        (2, 300, "Next.js scaffold + homepage build"),
        (3, 180, "Content migration (menu, staff, hours)"),
        (4, 150, "Responsive pass + staging deploy"),
    ]:
        insert_time_entry(c, user_id=daniel_id, project_id=project_id,
                          date=date_iso(week_base + timedelta(days=days_ago)),
                          duration_minutes=mins, description=desc)

    insert_invoice(
        c, invoice_id=f"inv_{project_id}_01",
        project_id=project_id, owner_id=daniel_id,
        amount_cents=3000_00, status="sent",
        title="INV-2026-0210",
        description="Marketing site rebuild — 50% milestone",
        due_date=date_iso(now + timedelta(days=6)),
        issued_at=iso(now - timedelta(days=1)),
        client_email="hello@harborline.example.com",
        line_items=[
            {"description": "Design + CMS scaffold (first 50%)", "quantity": 1, "unit_price_cents": 300000, "total_cents": 300000},
        ],
    )

    return project_id


def build_project_3(c, daniel_id: int, client_id: int, client_name: str):
    """Mobile app MVP — Lumos Health (just kicked off)."""
    project_id = insert_project(
        c,
        name="Mobile app MVP — Lumos Health",
        client_name="Lumos Health",
        owner_id=daniel_id,
        description="Build a React Native MVP for a habit-tracking app targeted at "
                    "patients with chronic conditions. 8-week scope to first TestFlight build.",
        skills=["React Native", "TypeScript", "Node.js", "Healthcare UX"],
        budget_min=15000_00,
        budget_max=22000_00,
        timeline_weeks=8,
    )
    if project_already_seeded(c, project_id):
        return project_id

    add_participant(c, project_id, "Daniel", "Freelancer", DANIEL_EMAIL, "#1d6ecd")
    add_participant(c, project_id, client_name, "CEO / Client", "ceo@lumoshealth.example.com", "#0891b2")
    add_participant(c, project_id, "Dr. Alana Park", "Clinical Advisor", "alana@lumoshealth.example.com", "#be185d")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    t0 = now - timedelta(days=3)

    turns = [
        (client_id, client_name, t0,
         f"Daniel — welcome aboard. {SEED_MARKER} Attaching our clinical research brief from Dr. Park. Core job-to-be-done: help patients with IBD track symptoms + meds + flare triggers, over 90 days, without it feeling like work."),
        (daniel_id, "Daniel", t0 + timedelta(hours=2),
         "Read the brief. 3 things stand out before we scope: (1) HIPAA — are we storing PHI on device only or syncing to a backend? (2) onboarding — patients in a flare have zero patience. (3) adherence — we need a hook that's stronger than streaks."),
        (client_id, client_name, t0 + timedelta(hours=4),
         "(1) Device-only for MVP — no PHI on our servers. (2) Agree. Under 60 seconds to first log. (3) Dr. Park thinks weekly clinician-visible summaries are the hook — patients want their doctor to see it."),
        (daniel_id, "Daniel", t0 + timedelta(hours=5),
         "Got it. Then: PHI on-device via Keychain/Keystore encryption, no backend for symptom data. We CAN have a backend just for anonymous analytics + feature flags. Proposing React Native + Expo for speed. Target: TestFlight build by week 8."),

        (client_id, client_name, t0 + timedelta(days=1),
         "Approved approach. Can we get the first concept by end of week 2?"),
        (daniel_id, "Daniel", t0 + timedelta(days=1, hours=1),
         "Yes. This week I'll finalize the user flow + information architecture. Week 2 is concept screens (hi-fi) and tappable prototype. Dr. Park's review before we build."),

        (daniel_id, "Daniel", t0 + timedelta(days=2),
         "User flow v1 in Figma. Main flows: daily 30-second log, symptom trend view, trigger discovery (pattern-matching 14+ day window), clinician export."),
        (client_id, client_name, t0 + timedelta(days=2, hours=5),
         "Dr. Park loves the trigger discovery — says that's the first mobile app she's seen that respects how IBD actually works. One note: the symptom scale should be 0-10 not 1-5, per published research."),
        (daniel_id, "Daniel", t0 + timedelta(days=2, hours=6),
         "Good catch. Updating to 0-10. That also means our chart axes need rework — minor, will absorb."),
    ]
    msg_ids = [insert_message(c, project_id, sid, sname, text, when) for sid, sname, when, text in turns]

    insert_decision(c, project_id, msg_ids[3],
                    "Architecture: PHI on-device only (Keychain/Keystore). Backend for analytics + feature flags only.")
    insert_decision(c, project_id, msg_ids[7],
                    "Symptom scale: 0-10 (per published IBD research), not 1-5.")

    insert_task(c, project_id=project_id, title="User flow v1 (Figma)", status="done",
                description="Core flows: daily log, trend view, trigger discovery, clinician export.",
                assignee_id=daniel_id, due_date=date_iso(t0 + timedelta(days=2)), created_by=daniel_id)
    insert_task(c, project_id=project_id, title="Hi-fi concept screens + prototype", status="in_progress",
                description="Week 2 deliverable for Dr. Park review.",
                assignee_id=daniel_id, due_date=date_iso(now + timedelta(days=7)), created_by=daniel_id)
    insert_task(c, project_id=project_id, title="React Native + Expo scaffold", status="todo",
                description="Project structure, navigation, storage (Keychain/Keystore), theming.",
                assignee_id=daniel_id, due_date=date_iso(now + timedelta(days=10)), created_by=daniel_id)

    for days_ago, mins, desc in [
        (0, 240, "Kickoff call + brief read"),
        (1, 180, "User flow exploration"),
        (2, 120, "Figma flow v1"),
    ]:
        insert_time_entry(c, user_id=daniel_id, project_id=project_id,
                          date=date_iso(now - timedelta(days=2-days_ago)),
                          duration_minutes=mins, description=desc)

    return project_id


# ────────────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────────────

def main():
    # Make sure schema is up to date before inserting anything
    init_db()

    conn = get_conn()
    c = conn.cursor()

    # Daniel (freelancer)
    daniel_id = ensure_user(c, email=DANIEL_EMAIL, name=DANIEL_NAME, role=DANIEL_ROLE,
                            password=DANIEL_DEFAULT_PASSWORD)
    ensure_profile(
        c, daniel_id,
        skills=["React", "TypeScript", "React Native", "Figma", "Node.js", "Tailwind", "UX Research"],
        hourly_rate=12500,  # $125/hr
        available=1,
        bio="Product designer + frontend engineer. 7 years building SaaS and healthcare apps. "
            "I do end-to-end — research → prototype → ship.",
        specialty="Product Design + Frontend",
        location="Seoul, KR",
    )

    # Three realistic client users (each tied to one of the projects below)
    client_defs = [
        dict(email="mira.chen@summit-analytics.example.com", name="Mira Chen",
             bio="PM at Summit Analytics, a B2B analytics SaaS.",
             specialty="Product Management", location="Seattle, WA",
             required_skills=["React", "TypeScript", "UX Research"],
             budget_min=9000_00, budget_max=14000_00,
             project_title="SaaS onboarding redesign",
             project_summary="Reduce 38% drop at data-connect step in our new-user onboarding."),
        dict(email="ben.harbor@harborline.example.com", name="Ben Harbor",
             bio="Owner at Harborline Coffee, small coffee chain.",
             specialty="Small Business Owner", location="Portland, OR",
             required_skills=["React", "Tailwind", "CMS"],
             budget_min=5000_00, budget_max=7500_00,
             project_title="Marketing site rebuild",
             project_summary="Warmer, faster site with self-serve CMS for hours/menu/staff."),
        dict(email="evan.lumos@lumoshealth.example.com", name="Evan Shah",
             bio="CEO of Lumos Health, an early-stage chronic-condition habit-tracker.",
             specialty="Healthcare Startup", location="Boston, MA",
             required_skills=["React Native", "Healthcare UX", "HIPAA"],
             budget_min=15000_00, budget_max=22000_00,
             project_title="Mobile app MVP",
             project_summary="React Native MVP for IBD symptom tracking. TestFlight by week 8."),
    ]
    client_ids = []
    for cd in client_defs:
        cid = ensure_user(c, email=cd["email"], name=cd["name"], role="client", password="demo")
        ensure_profile(
            c, cid,
            skills=[],
            required_skills=cd["required_skills"],
            budget_min=cd["budget_min"], budget_max=cd["budget_max"],
            project_title=cd["project_title"], project_summary=cd["project_summary"],
            bio=cd["bio"], specialty=cd["specialty"], location=cd["location"],
            available=1,
        )
        client_ids.append((cid, cd["name"]))

    # Build the three projects
    p1_id = build_project_1(c, daniel_id, client_ids[0][0], client_ids[0][1], "Client — Product Manager")
    p2_id = build_project_2(c, daniel_id, client_ids[1][0], client_ids[1][1])
    p3_id = build_project_3(c, daniel_id, client_ids[2][0], client_ids[2][1])

    # A couple standalone notifications for daniel
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    insert_notification(
        c, user_id=daniel_id, kind="scope_alert",
        title="Scope Guardian flagged a message",
        body="Summit Analytics asked about admin-panel work — handled via change order.",
        project_id=p1_id,
        link=f"/projects/{p1_id}/scope-drift",
        when=now - timedelta(days=8),
    )
    insert_notification(
        c, user_id=daniel_id, kind="deadline_reminder",
        title="Training session reminder",
        body="Harborline training call is scheduled in ~2 days.",
        project_id=p2_id,
        link=f"/projects/{p2_id}/tasks",
        when=now - timedelta(hours=3),
    )

    conn.commit()
    conn.close()

    print(f"✓ Seeded daniel2 (id={daniel_id}) with 3 projects:")
    print(f"    - Project #{p1_id}: SaaS onboarding redesign  (Summit Analytics)")
    print(f"    - Project #{p2_id}: Marketing site rebuild    (Harborline Coffee)")
    print(f"    - Project #{p3_id}: Mobile app MVP             (Lumos Health)")
    print()
    print(f"  Login:    {DANIEL_EMAIL} / {DANIEL_DEFAULT_PASSWORD}")
    print(f"  (If daniel2 already existed, password was NOT changed.)")


if __name__ == "__main__":
    main()
