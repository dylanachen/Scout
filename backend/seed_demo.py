"""
Demonstration seed.

Wipes the existing DB file, recreates the schema, and seeds:
  - daniel@gmail.com    (client,     "Daniel Lee")
  - daniel2@gmail.com   (freelancer, "Daniel Park")
  - daniel3@gmail.com   (freelancer, "Daniel Choi")
  - daniel4@gmail.com   (freelancer, "Daniel Han")
  Password for all four: dbswndud123

Plus a handful of other client users so the freelancers see a varied project list.

Each project gets a realistic chat transcript between the client and freelancer.

Usage:
    cd backend && python seed_demo.py
"""
from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone

from database import DB_PATH, get_conn, init_db
from auth import hash_password


# ── Constants ────────────────────────────────────────────────────────────────

PASSWORD = "dbswndud123"

ACCOUNTS = {
    "daniel":  dict(email="daniel@gmail.com",  name="Daniel Lee",  role="client"),
    "daniel2": dict(email="daniel2@gmail.com", name="Daniel Park", role="freelancer"),
    "daniel3": dict(email="daniel3@gmail.com", name="Daniel Choi", role="freelancer"),
    "daniel4": dict(email="daniel4@gmail.com", name="Daniel Han",  role="freelancer"),
}

EXTRA_CLIENTS = [
    dict(key="mira",  email="mira@summit.example",      name="Mira Chen",
         bio="PM at Summit Analytics, a B2B analytics SaaS.",
         specialty="Product Management", location="Seattle, WA"),
    dict(key="ben",   email="ben@harborline.example",   name="Ben Harbor",
         bio="Owner at Harborline Coffee, small coffee chain.",
         specialty="Small Business Owner", location="Portland, OR"),
    dict(key="evan",  email="evan@lumoshealth.example", name="Evan Shah",
         bio="CEO of Lumos Health, an early-stage chronic-condition tracker.",
         specialty="Healthcare Startup",  location="Boston, MA"),
    dict(key="aria",  email="aria@drift.example",       name="Aria Wong",
         bio="Head of Growth at Drift Commerce.",
         specialty="E-commerce",          location="Toronto, ON"),
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def date_iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def wipe_db():
    """Delete the existing DB file so init_db() rebuilds from scratch."""
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"[wipe] removed {DB_PATH}")
    # WAL/SHM siblings, just in case
    for ext in ("-wal", "-shm"):
        path = DB_PATH + ext
        if os.path.exists(path):
            os.remove(path)
            print(f"[wipe] removed {path}")


def clear_all_rows(c):
    """init_db() seeds a default demo user + 3 clients + matching pool. We want a
    pristine DB for this demo, so wipe every table after the schema is created."""
    rows = c.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).fetchall()
    c.execute("PRAGMA foreign_keys = OFF")
    for r in rows:
        c.execute(f"DELETE FROM {r[0]}")
    # Reset autoincrement sequences so ids start from 1 again
    try:
        c.execute("DELETE FROM sqlite_sequence")
    except sqlite3.OperationalError:
        pass
    c.execute("PRAGMA foreign_keys = ON")
    print(f"[wipe] cleared rows from {len(rows)} tables")


def insert_user(c, *, email: str, name: str, role: str, password: str) -> int:
    c.execute(
        "INSERT INTO users (email, name, hashed_pw, role) VALUES (?, ?, ?, ?)",
        (email, name, hash_password(password), role),
    )
    return c.lastrowid


def upsert_profile(c, uid: int, **fields):
    cols = []
    vals = []
    for k, v in fields.items():
        cols.append(k)
        vals.append(json.dumps(v) if isinstance(v, list) else v)
    cols2 = ["user_id", *cols]
    placeholders = ", ".join("?" for _ in cols2)
    c.execute(
        f"INSERT OR REPLACE INTO user_profiles ({', '.join(cols2)}) VALUES ({placeholders})",
        (uid, *vals),
    )


def insert_project(c, *, name: str, owner_id: int, client_name: str,
                   description: str, skills: list, budget_min: int, budget_max: int,
                   timeline_weeks: int, status: str = "active") -> int:
    c.execute(
        """INSERT INTO projects
           (name, client_name, owner_id, description, budget_min, budget_max,
            required_skills, timeline_weeks, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (name, client_name, owner_id, description, budget_min, budget_max,
         json.dumps(skills), timeline_weeks, status),
    )
    return c.lastrowid


def invite_accepted(c, *, project_id: int, inviter_id: int, invitee_id: int):
    """Create an accepted invitation so the invitee shows the project in their list."""
    c.execute(
        """INSERT OR IGNORE INTO project_invitations
           (project_id, inviter_id, invitee_id, status, message, responded_at)
           VALUES (?, ?, ?, 'accepted', ?, datetime('now'))""",
        (project_id, inviter_id, invitee_id,
         "Welcome aboard — let's get this kicked off."),
    )


def add_participant(c, project_id: int, name: str, role: str, email: str, color: str):
    c.execute(
        "SELECT 1 FROM participants WHERE project_id = ? AND email = ?",
        (project_id, email),
    )
    if c.fetchone():
        return
    c.execute(
        """INSERT INTO participants (project_id, name, role, email, avatar_color)
           VALUES (?, ?, ?, ?, ?)""",
        (project_id, name, role, email, color),
    )


def insert_message(c, project_id: int, sender_id: int, sender_name: str,
                   text: str, when: datetime) -> int:
    c.execute(
        "INSERT INTO messages (project_id, sender_id, sender_name, text, created_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (project_id, sender_id, sender_name, text, iso(when)),
    )
    return c.lastrowid


def insert_task(c, *, project_id: int, title: str, status: str, description: str,
                assignee_id: int, due_date: str, created_by: int):
    c.execute(
        """INSERT INTO tasks (project_id, title, description, status, assignee_id,
                              due_date, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (project_id, title, description, status, assignee_id, due_date, created_by),
    )


def insert_time(c, *, user_id: int, project_id: int, date: str,
                duration_minutes: int, description: str):
    c.execute(
        """INSERT INTO time_entries (user_id, project_id, date, duration_minutes,
                                     description, billable, invoiced)
           VALUES (?, ?, ?, ?, ?, 1, 0)""",
        (user_id, project_id, date, duration_minutes, description),
    )


def insert_invoice(c, *, invoice_id: str, project_id: int, owner_id: int,
                   amount_cents: int, status: str, title: str, description: str,
                   due_date: str, issued_at: str, client_email: str,
                   line_items: list):
    amount_str = f"${amount_cents / 100:,.2f}"
    c.execute(
        """INSERT INTO invoices
           (id, project_id, owner_id, amount, amount_cents, status, title, description,
            due_date, issued_at, client_email, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')""",
        (invoice_id, project_id, owner_id, amount_str, amount_cents, status, title,
         description, due_date, issued_at, client_email),
    )
    for li in line_items:
        c.execute(
            """INSERT INTO invoice_line_items
               (invoice_id, description, quantity, unit_price_cents, total_cents)
               VALUES (?, ?, ?, ?, ?)""",
            (invoice_id, li["description"], li["quantity"],
             li["unit_price_cents"], li["total_cents"]),
        )


def insert_notification(c, *, user_id: int, kind: str, title: str, body: str,
                        project_id: int, link: str, when: datetime):
    c.execute(
        """INSERT INTO notifications (user_id, kind, title, body, link, project_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (user_id, kind, title, body, link, project_id, iso(when)),
    )


# ── Project transcripts ──────────────────────────────────────────────────────

def seed_chat(c, *, project_id: int, client_id: int, client_name: str,
              freelancer_id: int, freelancer_name: str, t0: datetime, turns: list):
    """`turns` is a list of (who, hours_offset, text) tuples.
    `who` is 'client' or 'freelancer'."""
    for who, hours, text in turns:
        sid, sname = (
            (client_id, client_name) if who == "client" else (freelancer_id, freelancer_name)
        )
        when = t0 + timedelta(hours=hours)
        insert_message(c, project_id, sid, sname, text, when)


# ── Main seed ────────────────────────────────────────────────────────────────

def main():
    wipe_db()
    init_db()

    conn = get_conn()
    c = conn.cursor()
    clear_all_rows(c)
    conn.commit()

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # ── Users ────────────────────────────────────────────────────────────────

    user_ids = {}
    for key, info in ACCOUNTS.items():
        uid = insert_user(c, email=info["email"], name=info["name"],
                          role=info["role"], password=PASSWORD)
        user_ids[key] = uid

    # Profiles for the four daniels
    upsert_profile(c, user_ids["daniel"],
        skills=[],
        required_skills=["React", "TypeScript", "Figma"],
        budget_min=8000_00, budget_max=18000_00,
        project_title="Multiple ongoing engagements",
        project_summary="Building a small portfolio of design + dev hires.",
        bio="Operations lead at a small consultancy. I commission a mix of design + frontend work.",
        specialty="Engagement Management", location="Seoul, KR",
        available=1,
    )
    upsert_profile(c, user_ids["daniel2"],
        skills=["React", "TypeScript", "Figma", "Node.js", "Tailwind"],
        hourly_rate=12500,
        bio="Product designer + frontend engineer. 7 yrs in SaaS.",
        specialty="Product Design + Frontend", location="Seoul, KR",
        available=1,
    )
    upsert_profile(c, user_ids["daniel3"],
        skills=["React", "Next.js", "CMS", "Tailwind", "Webflow"],
        hourly_rate=9500,
        bio="Marketing-site specialist. Webflow / Next.js / a touch of design.",
        specialty="Marketing Sites", location="Busan, KR",
        available=1,
    )
    upsert_profile(c, user_ids["daniel4"],
        skills=["React Native", "Expo", "Swift", "Kotlin", "HIPAA"],
        hourly_rate=14500,
        bio="Mobile app engineer. Healthcare and consumer apps.",
        specialty="Mobile Engineering", location="Incheon, KR",
        available=1,
    )

    # Extra clients
    extra_ids = {}
    for cd in EXTRA_CLIENTS:
        uid = insert_user(c, email=cd["email"], name=cd["name"],
                          role="client", password=PASSWORD)
        extra_ids[cd["key"]] = uid
        upsert_profile(c, uid,
            skills=[],
            required_skills=[], budget_min=0, budget_max=0,
            project_title="", project_summary="",
            bio=cd["bio"], specialty=cd["specialty"], location=cd["location"],
            available=1,
        )

    # ── Projects ─────────────────────────────────────────────────────────────
    # daniel (client) owns 3 projects, each with a different freelancer
    # Other clients own 4 more so freelancers see a busy thread list.

    projects: list[tuple[int, str, str, int, str, str, int, datetime, list]] = []

    # ────────── 1) daniel ↔ daniel2 — Brand redesign ──────────
    p1 = insert_project(c,
        name="Brand redesign — landing + identity",
        owner_id=user_ids["daniel"],
        client_name=ACCOUNTS["daniel"]["name"],
        description="Refresh brand mark, palette, type system, and rebuild the marketing landing.",
        skills=["Figma", "React", "Tailwind"],
        budget_min=8000_00, budget_max=12000_00,
        timeline_weeks=5,
    )
    invite_accepted(c, project_id=p1,
                    inviter_id=user_ids["daniel"], invitee_id=user_ids["daniel2"])
    add_participant(c, p1, ACCOUNTS["daniel"]["name"],   "Client",
                    ACCOUNTS["daniel"]["email"],  "#1d6ecd")
    add_participant(c, p1, ACCOUNTS["daniel2"]["name"], "Freelancer",
                    ACCOUNTS["daniel2"]["email"], "#7c3aed")
    p1_t0 = now - timedelta(days=12)
    seed_chat(c,
        project_id=p1,
        client_id=user_ids["daniel"], client_name=ACCOUNTS["daniel"]["name"],
        freelancer_id=user_ids["daniel2"], freelancer_name=ACCOUNTS["daniel2"]["name"],
        t0=p1_t0,
        turns=[
            ("client",     0,    "Hey, kicking us off here. I shared the Figma library + brand brief in the drive. The big swing this round is the wordmark — current one feels too 2018."),
            ("freelancer", 0.5,  "Got it. Skimmed the brief. Two questions before I go heads-down: (1) any mark you want me to actively avoid, (2) is the palette locked or part of this engagement?"),
            ("client",     1,    "(1) avoid the all-caps geometric look — Vercel/Linear-ish — too crowded. (2) palette is open, treat it as part of scope."),
            ("freelancer", 1.5,  "Perfect. I'll send 3 directional concepts on day 4. Will pair each wordmark with a starter palette so we can react to them together."),
            ("client",     24,   "Quick add: marketing wants the new mark on a blog post by the 25th. Aggressive but doable?"),
            ("freelancer", 25,   "Tight but doable IF we can lock the direction by day 6 and skip the third round of polish. I'd recommend that tradeoff — copy can pick up the slack."),
            ("client",     27,   "Agreed. Lock by day 6."),
            ("freelancer", 96,   "3 directions are in the Figma — page 'r1-concepts'. Quick read: A is structured + serif accent, B is lowercase + softer, C is monoline + geometric (closer to what you said avoid, included for contrast)."),
            ("client",     100,  "Strong ranking from us: B > A > C. B has the warmth we wanted. Can we explore B with a slightly more confident weight?"),
            ("freelancer", 102,  "Yes. I'll push 3 weight variants of B by tomorrow evening. Also tightening kerning on the lowercase 'd-a' pair — it's the one wonky spot."),
            ("client",     150,  "Let's also see how B looks as a favicon — that always reveals issues."),
            ("freelancer", 168,  "Weight variants + favicon explorations are up. My pick is B-medium for the wordmark, B-bold extracted as the favicon glyph."),
            ("client",     170,  "Approved. Move to landing page application."),
            ("freelancer", 240,  "Landing rebuild started. Mobile-first this time — I noticed the current site's mobile hero is broken on small Android. Fix is free. 😅"),
            ("client",     245,  "🙏"),
        ],
    )

    # ────────── 2) daniel ↔ daniel3 — Marketing site ──────────
    p2 = insert_project(c,
        name="Marketing site v2",
        owner_id=user_ids["daniel"],
        client_name=ACCOUNTS["daniel"]["name"],
        description="Rebuild marketing site on Next.js + a self-serve CMS so the team can update copy.",
        skills=["Next.js", "Tailwind", "CMS"],
        budget_min=6000_00, budget_max=9000_00,
        timeline_weeks=4,
    )
    invite_accepted(c, project_id=p2,
                    inviter_id=user_ids["daniel"], invitee_id=user_ids["daniel3"])
    add_participant(c, p2, ACCOUNTS["daniel"]["name"],   "Client",
                    ACCOUNTS["daniel"]["email"],  "#1d6ecd")
    add_participant(c, p2, ACCOUNTS["daniel3"]["name"], "Freelancer",
                    ACCOUNTS["daniel3"]["email"], "#059669")
    p2_t0 = now - timedelta(days=9)
    seed_chat(c,
        project_id=p2,
        client_id=user_ids["daniel"], client_name=ACCOUNTS["daniel"]["name"],
        freelancer_id=user_ids["daniel3"], freelancer_name=ACCOUNTS["daniel3"]["name"],
        t0=p2_t0,
        turns=[
            ("client",     0,    "Quick context — old site is on Wordpress, our marketing folks can't update anything without engineering. We want Next.js + a headless CMS the team can actually use."),
            ("freelancer", 0.4,  "Sanity, Contentful, or Payload? I'd push Sanity for non-technical writers — but if you have an existing license for one of the others, easier to use what's there."),
            ("client",     1,    "No license. Sanity is fine if the editor UX is good."),
            ("freelancer", 2,    "Sanity it is. I'll set up the schema for: pages, blog posts, team members, case studies. Will share an editor walkthrough on day 5 so your marketing folks can sign off."),
            ("client",     22,   "Good. One ask — keep image alt text required at the schema level. Their last site had terrible accessibility."),
            ("freelancer", 23,   "Will do. Required fields: alt text on every image, h1 per page, OG image."),
            ("client",     72,   "Editor walkthrough went well. Two pieces of feedback: (1) the 'team member' card needs a 'pronouns' field, (2) blog post category is a free-text right now — make it a reference to a categories doc so we don't get typo'd duplicates."),
            ("freelancer", 73,   "(1) added. (2) Refactoring to a category reference now. Will migrate any existing entries."),
            ("client",     120,  "Page builder is sweet. Quick question — can we get a 'last edited by + when' indicator on the published site? Helpful for our trust page."),
            ("freelancer", 122,  "Easy. Pulling Sanity's _updatedAt + the editor's display name. 30 min of work, no charge."),
            ("client",     168,  "Staging looks great. We're ready to test the migration script for 38 existing blog posts."),
            ("freelancer", 170,  "Migration script pass 1 ran clean on a copy. 38/38 posts imported, 4 had broken inline images (bad URLs in the old DB). I logged them — easy fix once your team replaces."),
            ("client",     192,  "Replaced the 4 images. Run again?"),
            ("freelancer", 193,  "Done. All clean. Cutover this Friday at 6pm KST?"),
        ],
    )

    # ────────── 3) daniel ↔ daniel4 — Mobile app MVP ──────────
    p3 = insert_project(c,
        name="Mobile companion app — MVP",
        owner_id=user_ids["daniel"],
        client_name=ACCOUNTS["daniel"]["name"],
        description="React Native MVP — login, dashboard sync, push notifications. TestFlight by week 6.",
        skills=["React Native", "Expo", "Push notifications"],
        budget_min=14000_00, budget_max=20000_00,
        timeline_weeks=6,
    )
    invite_accepted(c, project_id=p3,
                    inviter_id=user_ids["daniel"], invitee_id=user_ids["daniel4"])
    add_participant(c, p3, ACCOUNTS["daniel"]["name"],   "Client",
                    ACCOUNTS["daniel"]["email"],  "#1d6ecd")
    add_participant(c, p3, ACCOUNTS["daniel4"]["name"], "Freelancer",
                    ACCOUNTS["daniel4"]["email"], "#ec4899")
    p3_t0 = now - timedelta(days=15)
    seed_chat(c,
        project_id=p3,
        client_id=user_ids["daniel"], client_name=ACCOUNTS["daniel"]["name"],
        freelancer_id=user_ids["daniel4"], freelancer_name=ACCOUNTS["daniel4"]["name"],
        t0=p3_t0,
        turns=[
            ("client",     0,   "Welcome. Goal is a TestFlight build by week 6. MVP scope: auth, home dashboard, push notifications. Native modules only if absolutely necessary."),
            ("freelancer", 0.3, "Sounds good. Expo SDK should cover all three without ejecting. I'll set up a base project today and push to a TestFlight track so we have CI from day 1."),
            ("client",     1,   "Love it. Side note — we use Auth0 on web. You good with the React Native SDK there?"),
            ("freelancer", 1.5, "Yep. Will use auth0-react-native + secure store for tokens. Biometrics for re-auth too — that's a small win for healthcare-adjacent UX."),
            ("client",     48,  "Nice touch on biometrics. Forgot to ask — universal links so deep-linking from emails works?"),
            ("freelancer", 49,  "Yes — apple-app-site-association + Android assetlinks. I'll need your DNS access for the .well-known files; can we do that today?"),
            ("client",     50,  "DM'd you Cloudflare access."),
            ("freelancer", 54,  "Got it. Both files are live. Universal links verified on TestFlight build 1."),
            ("client",     120, "Auth flow looks great. One thing — on Android, the keyboard pushes the password field off-screen. iOS is fine."),
            ("freelancer", 121, "Classic — KeyboardAvoidingView behavior differs per platform. Patching with platform-specific behavior + ScrollView wrap. Build 4 will fix."),
            ("client",     168, "Build 4 confirmed. Push notifications next?"),
            ("freelancer", 170, "Yes. APNs + FCM both wired. I'll send a test ping in 30 min."),
            ("client",     171, "Got the ping. 👍"),
            ("freelancer", 240, "Dashboard sync working. We're 2 days ahead — I'm going to spend a day polishing the empty states. Got opinions on those?"),
            ("client",     242, "Empty states are usually the place we lose users on day 1. Spend the day. Make them inviting, not apologetic."),
            ("freelancer", 264, "Polished. Pushed build 7 to TestFlight. Ahead of schedule — TestFlight done in week 5 instead of 6."),
        ],
    )

    # ────────── 4) Mira (Summit) ↔ daniel2 — SaaS onboarding ──────────
    p4 = insert_project(c,
        name="SaaS onboarding redesign",
        owner_id=extra_ids["mira"],
        client_name="Summit Analytics",
        description="Reduce 38% drop at the data-connect step in our new-user onboarding.",
        skills=["React", "TypeScript", "UX Research"],
        budget_min=9000_00, budget_max=14000_00,
        timeline_weeks=6,
    )
    invite_accepted(c, project_id=p4,
                    inviter_id=extra_ids["mira"], invitee_id=user_ids["daniel2"])
    add_participant(c, p4, "Mira Chen", "Client", "mira@summit.example", "#7c3aed")
    add_participant(c, p4, ACCOUNTS["daniel2"]["name"], "Freelancer",
                    ACCOUNTS["daniel2"]["email"], "#1d6ecd")
    p4_t0 = now - timedelta(days=20)
    seed_chat(c,
        project_id=p4,
        client_id=extra_ids["mira"], client_name="Mira Chen",
        freelancer_id=user_ids["daniel2"], freelancer_name=ACCOUNTS["daniel2"]["name"],
        t0=p4_t0,
        turns=[
            ("client",     0,   "Hey Daniel — kicking off the onboarding redesign. Biggest pain: 38% drop at 'connect data source'. I shared the funnel + a Loom of the current flow."),
            ("freelancer", 1,   "Watched the Loom. The modal sequence is doing too much. I'll send a one-pager Friday w/ 2-3 structural directions."),
            ("client",     1.5, "Scope confirm — auth, workspace setup, data connect, first dashboard. Out of scope: admin panel, billing, marketing site."),
            ("freelancer", 2,   "Confirmed. For data connect — top 3 sources only (Postgres, BigQuery, Stripe) or all 12?"),
            ("client",     3,   "Top 3 for v1. Long tail is a follow-up."),
            ("freelancer", 76,  "One-pager sent. Three directions: A) progressive checklist sidebar, B) split-by-role 'choose your path', C) guided setup w/ inline sample data. My rec: A."),
            ("client",     78,  "Leaning A too. Priya has Figma comments coming."),
            ("freelancer", 100, "Wireframes done. Mid-fi review on day 8."),
            ("client",     192, "Wireframes look solid. Empty-state illustration feels too clinical though — anything warmer?"),
            ("freelancer", 195, "Will commission 3 illustration options from Maria. ~4 day lead, in budget."),
            # ── Scope creep moment ──
            ("client",     232, "Btw — admin panel is also pretty rough. Could you do a similar pass on team-management screens? Same design system, shouldn't be much."),
            ("freelancer", 234, "That's outside the SOW (we flagged admin as out-of-scope week 1). Happy to scope as a change order — rough +2 weeks, $3-4k. Want me to write it up?"),
            ("client",     235, "Fair — please send a change order, I'll loop in finance."),
            ("freelancer", 290, "High-fi screens up: empty / in-progress / completed / first-dashboard. Page 'v2-review' in Figma."),
            ("client",     294, "Strong. Two asks: (1) lighter celebration on completion (confetti is too much for B2B), (2) Stripe needs a test/live toggle."),
            ("freelancer", 296, "(1) easy — pulse + checkmark instead. (2) absorbing the toggle since it's inside the Stripe flow we already budgeted."),
            ("client",     338, "Approved. Clear to build."),
            ("freelancer", 408, "Staging is up. Postgres / BigQuery / Stripe connectors all done. Demo Loom incoming."),
        ],
    )

    # ────────── 5) Aria (Drift) ↔ daniel2 + daniel3 — Checkout overhaul ──────────
    p5 = insert_project(c,
        name="Checkout overhaul",
        owner_id=extra_ids["aria"],
        client_name="Drift Commerce",
        description="Single-page checkout, address autocomplete, Apple/Google Pay, A/B-friendly events.",
        skills=["React", "Stripe", "Analytics"],
        budget_min=11000_00, budget_max=16000_00,
        timeline_weeks=5,
    )
    invite_accepted(c, project_id=p5,
                    inviter_id=extra_ids["aria"], invitee_id=user_ids["daniel2"])
    invite_accepted(c, project_id=p5,
                    inviter_id=extra_ids["aria"], invitee_id=user_ids["daniel3"])
    add_participant(c, p5, "Aria Wong", "Client", "aria@drift.example", "#f97316")
    add_participant(c, p5, ACCOUNTS["daniel2"]["name"], "Freelancer",
                    ACCOUNTS["daniel2"]["email"], "#1d6ecd")
    add_participant(c, p5, ACCOUNTS["daniel3"]["name"], "Freelancer",
                    ACCOUNTS["daniel3"]["email"], "#059669")
    p5_t0 = now - timedelta(days=6)
    seed_chat(c,
        project_id=p5,
        client_id=extra_ids["aria"], client_name="Aria Wong",
        freelancer_id=user_ids["daniel2"], freelancer_name=ACCOUNTS["daniel2"]["name"],
        t0=p5_t0,
        turns=[
            ("client",     0,   "Welcome both. Daniel2 leads UX/frontend, Daniel3 owns the page rebuild + CMS hookups. Goal: cart-to-paid conversion +1.5pp by end of Q2."),
            ("freelancer", 0.5, "Got it. First open question — keep multi-step or go single-page?"),
            ("client",     1,   "Single-page. Multi-step is a known killer for our segment."),
            ("freelancer", 1.5, "Address autocomplete provider — Google Places, Loqate, or Smarty? Cost differs a lot at scale."),
            ("client",     2,   "We have Loqate already. Use it."),
            ("freelancer", 24,  "First wireframe up. Sticky summary on the right at >=768px, collapsed accordion below 768px."),
            ("client",     30,  "Looks good. Apple Pay placement — top of fields or bottom?"),
            ("freelancer", 31,  "Top, with 'or pay with card' divider. Studies skew strongly that way for mobile."),
            ("client",     48,  "Approved. Daniel3 — when can the new page template land in the CMS?"),
            ("freelancer", 50,  "I'll have the template + Storybook stories by Friday. Need analytics events list to wire `dataLayer` properly — can you share?"),
            ("client",     54,  "Sent. 14 events total. 12 are existing, 2 are new (apple_pay_attempted, address_autocomplete_used)."),
            ("freelancer", 73,  "Stripe Element setup complete. Test cards working in sandbox. Apple Pay merchant-id provisioned for staging."),
            ("client",     96,  "Tested on iPhone — checkout to confirmation in 22 seconds. Old flow takes 90+. Huge."),
            ("freelancer", 98,  "🎉 Last big chunk: error states. Working through declined card / address validation fail / network drop scenarios."),
        ],
    )

    # ────────── 6) Mira (Summit) ↔ daniel3 — Internal tools ──────────
    p6 = insert_project(c,
        name="Internal admin tools",
        owner_id=extra_ids["mira"],
        client_name="Summit Analytics",
        description="Admin dashboard for support — user lookup, refund flow, impersonation. React + tRPC.",
        skills=["React", "tRPC", "Tailwind"],
        budget_min=7000_00, budget_max=10000_00,
        timeline_weeks=4,
    )
    invite_accepted(c, project_id=p6,
                    inviter_id=extra_ids["mira"], invitee_id=user_ids["daniel3"])
    add_participant(c, p6, "Mira Chen", "Client", "mira@summit.example", "#7c3aed")
    add_participant(c, p6, ACCOUNTS["daniel3"]["name"], "Freelancer",
                    ACCOUNTS["daniel3"]["email"], "#059669")
    p6_t0 = now - timedelta(days=4)
    seed_chat(c,
        project_id=p6,
        client_id=extra_ids["mira"], client_name="Mira Chen",
        freelancer_id=user_ids["daniel3"], freelancer_name=ACCOUNTS["daniel3"]["name"],
        t0=p6_t0,
        turns=[
            ("client",     0,   "Hey, kicking off the admin tools project. Support is currently using SQL + Retool — both painful. We want a real internal app."),
            ("freelancer", 0.5, "Got the brief. Which surfaces are highest priority — user lookup, refund, impersonation?"),
            ("client",     1,   "User lookup first. If support can find a user in 3 clicks instead of writing SQL, that alone is a win."),
            ("freelancer", 2,   "Done deal. I'll set up tRPC + a search endpoint with Postgres trigram. Should match emails, names, and partial workspace names."),
            ("client",     22,  "Sounds great. Permissions matter here — only support team should reach this. SSO?"),
            ("freelancer", 23,  "Yes. Same Auth0 tenant + a 'support' role check on every tRPC procedure. Will document."),
            ("client",     49,  "Search is fast and good. Refund flow next? It needs an audit log — every refund tied to the support agent."),
            ("freelancer", 50,  "Yep. Adding `audit_events` table — actor, action, target, before/after, timestamp. Refund flow writes to it transactionally."),
            ("client",     72,  "Perfect. Test it with a $0 refund first?"),
            ("freelancer", 73,  "Already done in staging — refund flow + audit row + email confirmation all firing."),
        ],
    )

    # ────────── 7) Evan (Lumos) ↔ daniel4 — Symptom tracker ──────────
    p7 = insert_project(c,
        name="Symptom tracker — patient-facing app",
        owner_id=extra_ids["evan"],
        client_name="Lumos Health",
        description="React Native app for IBD symptom tracking. Daily log, reminders, weekly summary.",
        skills=["React Native", "Healthcare UX", "HIPAA"],
        budget_min=15000_00, budget_max=22000_00,
        timeline_weeks=8,
    )
    invite_accepted(c, project_id=p7,
                    inviter_id=extra_ids["evan"], invitee_id=user_ids["daniel4"])
    add_participant(c, p7, "Evan Shah", "Client", "evan@lumoshealth.example", "#0891b2")
    add_participant(c, p7, ACCOUNTS["daniel4"]["name"], "Freelancer",
                    ACCOUNTS["daniel4"]["email"], "#ec4899")
    p7_t0 = now - timedelta(days=8)
    seed_chat(c,
        project_id=p7,
        client_id=extra_ids["evan"], client_name="Evan Shah",
        freelancer_id=user_ids["daniel4"], freelancer_name=ACCOUNTS["daniel4"]["name"],
        t0=p7_t0,
        turns=[
            ("client",     0,   "Welcome. Quick context — we're early stage, IRB not yet done. So MVP is for closed beta with 30 patients, not public."),
            ("freelancer", 0.5, "Understood. Means we can use Expo managed for now, no need for native modules until we go production."),
            ("client",     1,   "Right. Daily symptom log is the core loop — 4 questions, takes <60 seconds."),
            ("freelancer", 2,   "Will design as a vertically-paged scrollview, one question per page, big tap targets. Patients in flare often have low energy — need to keep cognitive load minimal."),
            ("client",     2.5, "Yes. That insight matters."),
            ("freelancer", 24,  "Daily log flow shipped to internal TestFlight. Average completion in my own testing: 42 seconds."),
            ("client",     30,  "Patients beta tested. Avg 38s, 100% completion rate over 5 days."),
            ("freelancer", 49,  "Excellent. Reminders next — local notifications at user-chosen time, no server needed for v1."),
            ("client",     50,  "Add a 'gentle' option that doesn't use red badge counts. Some patients find badges anxiety-inducing."),
            ("freelancer", 51,  "Adding it. Three modes: Off / Standard / Gentle (no badge, no sound, just a banner)."),
            ("client",     72,  "Weekly summary view? We're talking pattern detection — 'your worst symptom day was Thursday' kind of thing."),
            ("freelancer", 74,  "Yep. Server-side aggregation since we can't do it on-device reliably (background tasks on iOS are unreliable). Endpoint + a SwiftUI-style chart on the device."),
            ("client",     96,  "Beta testers love the weekly summary. One feedback — they want to share it with their GI doctor. Export to PDF?"),
            ("freelancer", 98,  "Doable. expo-print → PDF, share sheet to email/messaging. ~1.5 days of work, fits in current budget."),
            ("client",     120, "Push that out. Doctor-shareable PDF is a real differentiator for us."),
        ],
    )

    # ── Tasks (a small set per project so the Tasks page isn't empty) ────────

    insert_task(c, project_id=p1, title="Wordmark concepts (3 directions)", status="done",
                description="A: serif accent. B: lowercase soft. C: monoline.",
                assignee_id=user_ids["daniel2"], due_date=date_iso(now - timedelta(days=8)),
                created_by=user_ids["daniel"])
    insert_task(c, project_id=p1, title="Landing page rebuild", status="in_progress",
                description="Next.js + Tailwind, mobile-first.",
                assignee_id=user_ids["daniel2"], due_date=date_iso(now + timedelta(days=4)),
                created_by=user_ids["daniel"])
    insert_task(c, project_id=p1, title="Brand guidelines PDF", status="todo",
                description="Type/color/usage rules. Hand-off doc.",
                assignee_id=user_ids["daniel2"], due_date=date_iso(now + timedelta(days=10)),
                created_by=user_ids["daniel"])

    insert_task(c, project_id=p2, title="Sanity schema setup", status="done",
                description="pages, blog, team, case studies. Required alt text.",
                assignee_id=user_ids["daniel3"], due_date=date_iso(now - timedelta(days=4)),
                created_by=user_ids["daniel"])
    insert_task(c, project_id=p2, title="Migrate 38 existing posts", status="in_progress",
                description="Cleanup pass + image fix + import.",
                assignee_id=user_ids["daniel3"], due_date=date_iso(now + timedelta(days=2)),
                created_by=user_ids["daniel"])
    insert_task(c, project_id=p2, title="Cutover + DNS swap", status="todo",
                description="Friday 6pm KST. Rollback plan ready.",
                assignee_id=user_ids["daniel3"], due_date=date_iso(now + timedelta(days=3)),
                created_by=user_ids["daniel"])

    insert_task(c, project_id=p3, title="Auth0 RN integration", status="done",
                description="Token storage + biometrics re-auth.",
                assignee_id=user_ids["daniel4"], due_date=date_iso(now - timedelta(days=10)),
                created_by=user_ids["daniel"])
    insert_task(c, project_id=p3, title="Push notifications (APNs + FCM)", status="done",
                description="Test pings working both platforms.",
                assignee_id=user_ids["daniel4"], due_date=date_iso(now - timedelta(days=4)),
                created_by=user_ids["daniel"])
    insert_task(c, project_id=p3, title="TestFlight build 7 polish", status="in_progress",
                description="Empty states + dashboard sync edge cases.",
                assignee_id=user_ids["daniel4"], due_date=date_iso(now + timedelta(days=5)),
                created_by=user_ids["daniel"])

    insert_task(c, project_id=p4, title="High-fi screens — review pass", status="done",
                description="empty / in-progress / completed / dashboard.",
                assignee_id=user_ids["daniel2"], due_date=date_iso(now - timedelta(days=12)),
                created_by=extra_ids["mira"])
    insert_task(c, project_id=p4, title="Implement Postgres / BigQuery / Stripe connectors", status="done",
                description="React components + data hooks + error handling.",
                assignee_id=user_ids["daniel2"], due_date=date_iso(now - timedelta(days=2)),
                created_by=extra_ids["mira"])
    insert_task(c, project_id=p4, title="QA + analytics events", status="todo",
                description="Activation funnel events; 4 device sizes.",
                assignee_id=user_ids["daniel2"], due_date=date_iso(now + timedelta(days=4)),
                created_by=extra_ids["mira"])

    insert_task(c, project_id=p5, title="Single-page checkout — Stripe Element", status="done",
                description="Test cards + Apple Pay sandbox.",
                assignee_id=user_ids["daniel2"], due_date=date_iso(now - timedelta(days=2)),
                created_by=extra_ids["aria"])
    insert_task(c, project_id=p5, title="Page template + CMS hookups", status="in_progress",
                description="Next.js template + Storybook.",
                assignee_id=user_ids["daniel3"], due_date=date_iso(now + timedelta(days=3)),
                created_by=extra_ids["aria"])
    insert_task(c, project_id=p5, title="Error states polish", status="todo",
                description="Declined / address fail / network drop.",
                assignee_id=user_ids["daniel2"], due_date=date_iso(now + timedelta(days=6)),
                created_by=extra_ids["aria"])

    insert_task(c, project_id=p6, title="User search (tRPC + trigram)", status="done",
                description="3-click lookup. Support role gate.",
                assignee_id=user_ids["daniel3"], due_date=date_iso(now - timedelta(days=2)),
                created_by=extra_ids["mira"])
    insert_task(c, project_id=p6, title="Refund flow + audit log", status="in_progress",
                description="Transactional. Email confirmation.",
                assignee_id=user_ids["daniel3"], due_date=date_iso(now + timedelta(days=2)),
                created_by=extra_ids["mira"])

    insert_task(c, project_id=p7, title="Daily symptom log", status="done",
                description="4 questions, vertical scroll, large targets.",
                assignee_id=user_ids["daniel4"], due_date=date_iso(now - timedelta(days=6)),
                created_by=extra_ids["evan"])
    insert_task(c, project_id=p7, title="Local reminders (3 modes)", status="done",
                description="Off / Standard / Gentle.",
                assignee_id=user_ids["daniel4"], due_date=date_iso(now - timedelta(days=4)),
                created_by=extra_ids["evan"])
    insert_task(c, project_id=p7, title="Weekly summary + PDF export", status="in_progress",
                description="Server aggregation + share sheet.",
                assignee_id=user_ids["daniel4"], due_date=date_iso(now + timedelta(days=7)),
                created_by=extra_ids["evan"])

    # ── Time entries (a few per freelancer for the Time pages) ───────────────

    week_base = now - timedelta(days=7)
    time_grid = [
        # (user_key, project_id, days_ago, mins, desc)
        ("daniel2", p1, 0, 240, "Brand wordmark weight variants"),
        ("daniel2", p1, 1, 180, "Landing page hero rebuild"),
        ("daniel2", p4, 2, 270, "Stripe connector React + tests"),
        ("daniel2", p5, 0, 180, "Stripe Element error states"),
        ("daniel3", p2, 0, 200, "Sanity migration script + cleanup"),
        ("daniel3", p2, 1, 150, "Editor walkthrough notes"),
        ("daniel3", p5, 0, 120, "CMS template + Storybook"),
        ("daniel3", p6, 1, 240, "User search tRPC procedures"),
        ("daniel4", p3, 0, 210, "Push notifications wiring"),
        ("daniel4", p3, 1, 240, "Empty states + microcopy"),
        ("daniel4", p7, 2, 180, "Weekly summary endpoint"),
        ("daniel4", p7, 3, 150, "PDF export via expo-print"),
    ]
    for ukey, pid, days_ago, mins, desc in time_grid:
        insert_time(c,
            user_id=user_ids[ukey], project_id=pid,
            date=date_iso(week_base + timedelta(days=days_ago)),
            duration_minutes=mins, description=desc,
        )

    # ── Invoices (one per project to give the Invoices page life) ────────────

    invoices_data = [
        # daniel-owned — invoices are issued by the freelancer working on it
        dict(invoice_id="INV-1001", project_id=p1, owner_id=user_ids["daniel2"],
             amount_cents=4800_00, status="sent", title="Brand redesign — milestone 1",
             description="Concepts + wordmark direction lock.",
             due=now + timedelta(days=10), issued=now - timedelta(days=2),
             client_email=ACCOUNTS["daniel"]["email"],
             items=[("Concept rounds (3)", 3, 800_00),
                    ("Wordmark + favicon polish", 1, 1200_00),
                    ("Brand palette + type system", 1, 1200_00)]),
        dict(invoice_id="INV-1002", project_id=p2, owner_id=user_ids["daniel3"],
             amount_cents=3200_00, status="paid", title="Marketing site v2 — milestone 1",
             description="Sanity schema + editor walkthrough.",
             due=now - timedelta(days=4), issued=now - timedelta(days=14),
             client_email=ACCOUNTS["daniel"]["email"],
             items=[("Schema design", 1, 1400_00),
                    ("Editor configuration + training session", 1, 1800_00)]),
        dict(invoice_id="INV-1003", project_id=p3, owner_id=user_ids["daniel4"],
             amount_cents=6500_00, status="sent", title="Mobile app MVP — milestone 2",
             description="Auth + push + dashboard sync.",
             due=now + timedelta(days=6), issued=now - timedelta(days=3),
             client_email=ACCOUNTS["daniel"]["email"],
             items=[("Auth0 RN integration", 1, 2200_00),
                    ("APNs + FCM wiring", 1, 1800_00),
                    ("Dashboard sync + offline cache", 1, 2500_00)]),
        dict(invoice_id="INV-1004", project_id=p4, owner_id=user_ids["daniel2"],
             amount_cents=5500_00, status="overdue", title="SaaS onboarding — milestone 2",
             description="High-fi screens + first connector.",
             due=now - timedelta(days=5), issued=now - timedelta(days=20),
             client_email="mira@summit.example",
             items=[("High-fi design pass", 1, 2800_00),
                    ("Postgres connector", 1, 2700_00)]),
        dict(invoice_id="INV-1005", project_id=p5, owner_id=user_ids["daniel2"],
             amount_cents=3800_00, status="draft", title="Checkout overhaul — kickoff",
             description="Wireframes + Stripe sandbox setup.",
             due=now + timedelta(days=14), issued=now - timedelta(days=1),
             client_email="aria@drift.example",
             items=[("Wireframes + sticky summary", 1, 1800_00),
                    ("Stripe Element + Apple Pay sandbox", 1, 2000_00)]),
        dict(invoice_id="INV-1006", project_id=p7, owner_id=user_ids["daniel4"],
             amount_cents=4200_00, status="paid", title="Symptom tracker — milestone 1",
             description="Daily log flow.",
             due=now - timedelta(days=2), issued=now - timedelta(days=8),
             client_email="evan@lumoshealth.example",
             items=[("Daily log UX + 4 questions", 1, 2400_00),
                    ("Local reminders (3 modes)", 1, 1800_00)]),
    ]
    for inv in invoices_data:
        insert_invoice(c,
            invoice_id=inv["invoice_id"], project_id=inv["project_id"],
            owner_id=inv["owner_id"], amount_cents=inv["amount_cents"],
            status=inv["status"], title=inv["title"], description=inv["description"],
            due_date=date_iso(inv["due"]), issued_at=iso(inv["issued"]),
            client_email=inv["client_email"],
            line_items=[
                dict(description=desc, quantity=qty,
                     unit_price_cents=unit, total_cents=unit * qty)
                for desc, qty, unit in inv["items"]
            ],
        )

    # ── Notifications (a couple per user) ────────────────────────────────────

    insert_notification(c, user_id=user_ids["daniel2"], kind="scope_alert",
        title="Scope Guardian flagged a message",
        body="Summit Analytics asked about admin-panel work — handled via change order.",
        project_id=p4, link=f"/projects/{p4}/scope-drift",
        when=now - timedelta(days=10),
    )
    insert_notification(c, user_id=user_ids["daniel2"], kind="invoice",
        title="Invoice overdue",
        body="INV-1004 is 5 days overdue.",
        project_id=p4, link="/invoices",
        when=now - timedelta(hours=2),
    )
    insert_notification(c, user_id=user_ids["daniel3"], kind="deadline_reminder",
        title="Migration cutover Friday",
        body="Marketing site v2 cutover scheduled Friday 6pm KST.",
        project_id=p2, link=f"/projects/{p2}/tasks",
        when=now - timedelta(hours=6),
    )
    insert_notification(c, user_id=user_ids["daniel4"], kind="match",
        title="TestFlight ready",
        body="Mobile app build 7 is ahead of schedule.",
        project_id=p3, link=f"/projects/{p3}/tasks",
        when=now - timedelta(hours=4),
    )
    insert_notification(c, user_id=user_ids["daniel"], kind="invoice",
        title="3 invoices waiting on review",
        body="INV-1001, INV-1003 are sent; INV-1004 is overdue.",
        project_id=p1, link="/invoices",
        when=now - timedelta(hours=1),
    )

    conn.commit()
    conn.close()

    print()
    print("✓ Demo seed complete.")
    print()
    print("Accounts (password: dbswndud123):")
    for key, info in ACCOUNTS.items():
        print(f"  - {info['email']:<22} {info['role']:<11} ({info['name']})")
    print()
    print("Plus extra clients (same password) for variety:")
    for cd in EXTRA_CLIENTS:
        print(f"  - {cd['email']:<32} client      ({cd['name']})")
    print()
    print("Projects seeded:")
    print("  daniel (client)    — owns: Brand redesign, Marketing site v2, Mobile app MVP")
    print("  daniel2 (freelancer) — sees: Brand redesign, SaaS onboarding, Checkout overhaul")
    print("  daniel3 (freelancer) — sees: Marketing site v2, Checkout overhaul, Internal tools")
    print("  daniel4 (freelancer) — sees: Mobile app MVP, Symptom tracker")


if __name__ == "__main__":
    main()
