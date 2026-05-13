import sqlite3
import os

DB_PATH = os.environ.get("DB_PATH", "freelanceos.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _col_exists(c, table: str, col: str) -> bool:
    rows = c.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r[1] == col for r in rows)


def _safe_add_column(c, table: str, col: str, ddl: str):
    """ALTER TABLE ADD COLUMN if missing. Non-destructive — never drops data."""
    if not _col_exists(c, table, col):
        try:
            c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")
            print(f"[migration] added {table}.{col}")
        except sqlite3.OperationalError as e:
            print(f"[migration] could not add {table}.{col}: {e}")


def _run_migrations(c):
    """
    Non-destructive migrations for schema drift.
    Add new columns here as the app evolves — existing rows/users are preserved.
    Uses IF-NOT-EXISTS semantics via PRAGMA table_info checks.
    """
    # projects — new fields from proposal
    _safe_add_column(c, "projects", "description",     "TEXT")
    _safe_add_column(c, "projects", "budget_min",      "INTEGER NOT NULL DEFAULT 0")
    _safe_add_column(c, "projects", "budget_max",      "INTEGER NOT NULL DEFAULT 0")
    _safe_add_column(c, "projects", "required_skills", "TEXT NOT NULL DEFAULT '[]'")
    _safe_add_column(c, "projects", "timeline_weeks",  "INTEGER")

    # user_profiles — client-side fields added later
    _safe_add_column(c, "user_profiles", "required_skills", "TEXT NOT NULL DEFAULT '[]'")
    _safe_add_column(c, "user_profiles", "budget_min",      "INTEGER NOT NULL DEFAULT 0")
    _safe_add_column(c, "user_profiles", "budget_max",      "INTEGER NOT NULL DEFAULT 0")
    _safe_add_column(c, "user_profiles", "project_title",   "TEXT")
    _safe_add_column(c, "user_profiles", "project_summary", "TEXT")
    _safe_add_column(c, "user_profiles", "available_from",  "TEXT")
    _safe_add_column(c, "user_profiles", "specialty",       "TEXT")
    _safe_add_column(c, "user_profiles", "location",        "TEXT")
    _safe_add_column(c, "user_profiles", "bio",             "TEXT")

    # time_entries — billable / invoiced flags
    _safe_add_column(c, "time_entries", "billable", "INTEGER NOT NULL DEFAULT 1")
    _safe_add_column(c, "time_entries", "invoiced", "INTEGER NOT NULL DEFAULT 0")

    # messages — file attachment columns
    _safe_add_column(c, "messages", "attachment_url",  "TEXT")
    _safe_add_column(c, "messages", "attachment_name", "TEXT")
    _safe_add_column(c, "messages", "attachment_type", "TEXT")
    _safe_add_column(c, "messages", "attachment_size", "INTEGER")

    # contracts — cached AI summary so repeat opens are instant + free
    _safe_add_column(c, "contracts", "summary_json", "TEXT")
    _safe_add_column(c, "contracts", "summary_at",   "TEXT")

    # message_reads — per-user last-read marker per project (for unread badges)
    c.executescript("""
    CREATE TABLE IF NOT EXISTS message_reads (
        project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_read_at TEXT    NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (project_id, user_id)
    );

    -- AI Scope Guardian: persisted flags (for the Scope Drift Report page)
    CREATE TABLE IF NOT EXISTS scope_flags (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        message_id       INTEGER REFERENCES messages(id) ON DELETE SET NULL,
        severity         TEXT    NOT NULL DEFAULT 'MEDIUM',
        message          TEXT    NOT NULL,
        suggested_reply  TEXT,
        contract_clause  TEXT,
        status           TEXT    NOT NULL DEFAULT 'open',  -- open | dismissed | resolved
        created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Meeting summaries (persistent record of end-meeting LLM summaries)
    CREATE TABLE IF NOT EXISTS meeting_summaries (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_by       INTEGER NOT NULL REFERENCES users(id),
        title            TEXT,
        duration_minutes INTEGER,
        started_at       TEXT,
        ended_at         TEXT    NOT NULL DEFAULT (datetime('now')),
        payload_json     TEXT    NOT NULL,   -- full summary object
        created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Portfolio items (freelancer work showcase)
    CREATE TABLE IF NOT EXISTS portfolio_items (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id       INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        title            TEXT    NOT NULL,
        summary          TEXT,
        thumbnail_url    TEXT,
        tags             TEXT    NOT NULL DEFAULT '[]',
        testimonial      TEXT,
        client_name      TEXT,
        is_public        INTEGER NOT NULL DEFAULT 1,
        created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Ratings (freelancer ↔ client star ratings + dimension scores)
    CREATE TABLE IF NOT EXISTS ratings (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        rater_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ratee_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id       INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        overall          REAL    NOT NULL,   -- 1.0 .. 5.0
        asset_delivery   REAL,
        communication    REAL,
        scope_respect    REAL,
        payment_speed    REAL,
        comment          TEXT,
        created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Change orders (formal scope-change requests attached to a project)
    CREATE TABLE IF NOT EXISTS change_orders (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        created_by       INTEGER NOT NULL REFERENCES users(id),
        title            TEXT    NOT NULL,
        description      TEXT,
        amount_cents     INTEGER NOT NULL DEFAULT 0,
        hours            REAL    NOT NULL DEFAULT 0,
        status           TEXT    NOT NULL DEFAULT 'draft',  -- draft | sent | accepted | declined
        signed_by_client INTEGER NOT NULL DEFAULT 0,
        created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- User settings (rates / notifications / scope guardian / communication)
    CREATE TABLE IF NOT EXISTS user_settings (
        user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        settings_json TEXT    NOT NULL DEFAULT '{}',
        updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Notifications (real backend-driven feed) + per-user read state
    CREATE TABLE IF NOT EXISTS notifications (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind        TEXT    NOT NULL DEFAULT 'generic',
        title       TEXT    NOT NULL,
        body        TEXT,
        link        TEXT,
        project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        read_at     TEXT,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- Invoice line items (so generated invoices have drill-down)
    CREATE TABLE IF NOT EXISTS invoice_line_items (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id   TEXT    NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        description  TEXT    NOT NULL,
        quantity     REAL    NOT NULL DEFAULT 1,
        unit_price_cents INTEGER NOT NULL DEFAULT 0,
        total_cents  INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    """)

    # invoices — extra columns for full CRUD flow
    _safe_add_column(c, "invoices", "title",         "TEXT")
    _safe_add_column(c, "invoices", "description",   "TEXT")
    _safe_add_column(c, "invoices", "amount_cents",  "INTEGER NOT NULL DEFAULT 0")
    _safe_add_column(c, "invoices", "due_date",      "TEXT")
    _safe_add_column(c, "invoices", "issued_at",     "TEXT")
    _safe_add_column(c, "invoices", "paid_at",       "TEXT")
    _safe_add_column(c, "invoices", "client_email",  "TEXT")
    _safe_add_column(c, "invoices", "notes",         "TEXT")
    _safe_add_column(c, "invoices", "attachment_url",  "TEXT")
    _safe_add_column(c, "invoices", "attachment_name", "TEXT")
    _safe_add_column(c, "invoices", "attachment_type", "TEXT")
    _safe_add_column(c, "invoices", "attachment_size", "INTEGER")


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        email       TEXT    UNIQUE NOT NULL,
        name        TEXT,
        hashed_pw   TEXT    NOT NULL,
        role        TEXT    NOT NULL DEFAULT 'freelancer',
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        name            TEXT    NOT NULL,
        client_name     TEXT,
        owner_id        INTEGER NOT NULL REFERENCES users(id),
        description     TEXT,
        budget_min      INTEGER NOT NULL DEFAULT 0,
        budget_max      INTEGER NOT NULL DEFAULT 0,
        required_skills TEXT    NOT NULL DEFAULT '[]',
        timeline_weeks  INTEGER,
        status          TEXT    NOT NULL DEFAULT 'active',
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL REFERENCES projects(id),
        sender_id   INTEGER NOT NULL REFERENCES users(id),
        sender_name TEXT    NOT NULL,
        text        TEXT    NOT NULL,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
        id          TEXT    PRIMARY KEY,
        project_id  INTEGER REFERENCES projects(id),
        owner_id    INTEGER NOT NULL REFERENCES users(id),
        amount      TEXT    NOT NULL,
        status      TEXT    NOT NULL DEFAULT 'sent',
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contracts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL REFERENCES projects(id),
        filename    TEXT    NOT NULL,
        filepath    TEXT    NOT NULL,
        uploaded_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scope_decisions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL REFERENCES projects(id),
        message_id  INTEGER REFERENCES messages(id),
        decision    TEXT    NOT NULL,
        logged_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS onboarding_sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL REFERENCES users(id),
        role        TEXT,
        message     TEXT    NOT NULL,
        reply       TEXT    NOT NULL,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS participants (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name         TEXT    NOT NULL,
        role         TEXT    NOT NULL DEFAULT 'Stakeholder',
        email        TEXT,
        avatar_color TEXT    NOT NULL DEFAULT '#64748b',
        removable    INTEGER NOT NULL DEFAULT 1,
        added_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id        INTEGER NOT NULL REFERENCES users(id),
        client_name     TEXT    NOT NULL,
        client_id       TEXT,
        project_name    TEXT    NOT NULL,
        project_summary TEXT,
        budget          TEXT,
        overall_score   INTEGER NOT NULL DEFAULT 0,
        status          TEXT    NOT NULL DEFAULT 'pending',
        created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_invitations (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        inviter_id    INTEGER NOT NULL REFERENCES users(id),
        invitee_id    INTEGER NOT NULL REFERENCES users(id),
        status        TEXT    NOT NULL DEFAULT 'pending',  -- pending | accepted | declined
        message       TEXT,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        responded_at  TEXT,
        UNIQUE(project_id, invitee_id)
    );

    CREATE TABLE IF NOT EXISTS user_interests (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, target_user_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title       TEXT    NOT NULL,
        description TEXT,
        status      TEXT    NOT NULL DEFAULT 'todo',  -- todo | in_progress | done
        assignee_id INTEGER REFERENCES users(id),
        due_date    TEXT,
        created_by  INTEGER NOT NULL REFERENCES users(id),
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS time_entries (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id       INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        date             TEXT    NOT NULL,                      -- YYYY-MM-DD
        duration_minutes INTEGER NOT NULL,
        description      TEXT,
        billable         INTEGER NOT NULL DEFAULT 1,
        invoiced         INTEGER NOT NULL DEFAULT 0,
        created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
        user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        -- freelancer fields
        skills          TEXT    NOT NULL DEFAULT '[]',
        hourly_rate     INTEGER NOT NULL DEFAULT 0,
        available       INTEGER NOT NULL DEFAULT 1,
        available_from  TEXT,
        bio             TEXT,
        specialty       TEXT,
        location        TEXT,
        -- client fields
        required_skills TEXT    NOT NULL DEFAULT '[]',
        budget_min      INTEGER NOT NULL DEFAULT 0,
        budget_max      INTEGER NOT NULL DEFAULT 0,
        project_title   TEXT,
        project_summary TEXT,
        updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    """)

    # Non-destructive schema migrations for columns added after first deploy
    _run_migrations(c)

    # Seed demo data for demo user
    c.execute("SELECT id FROM users WHERE email = 'demo@freelanceos.local'")
    if not c.fetchone():
        import json as _json
        from auth import hash_password

        # ── Freelancer demo user ──────────────────────────────────────────────
        c.execute(
            "INSERT INTO users (email, name, hashed_pw, role) VALUES (?, ?, ?, ?)",
            ("demo@freelanceos.local", "Demo Freelancer", hash_password("demo"), "freelancer"),
        )
        freelancer_id = c.lastrowid
        c.execute(
            """INSERT INTO user_profiles
               (user_id, skills, hourly_rate, available, bio, specialty, location)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                freelancer_id,
                _json.dumps(["React", "TypeScript", "UI/UX", "Figma", "CSS"]),
                9500,   # $95/hr in cents
                1,
                "Full-stack product designer with 6 years of experience.",
                "Product Design",
                "Austin, TX",
            ),
        )
        c.execute(
            "INSERT INTO projects (name, client_name, owner_id) VALUES (?, ?, ?)",
            ("Website refresh", "Northwind LLC", freelancer_id),
        )
        p1 = c.lastrowid
        c.execute(
            "INSERT INTO projects (name, client_name, owner_id) VALUES (?, ?, ?)",
            ("Pitch deck", "Blue Harbor", freelancer_id),
        )
        c.execute(
            "INSERT INTO invoices (id, project_id, owner_id, amount, status) VALUES (?, ?, ?, ?, ?)",
            ("inv-1", p1, freelancer_id, "$2,400", "sent"),
        )
        c.execute(
            "INSERT INTO invoices (id, project_id, owner_id, amount, status) VALUES (?, ?, ?, ?, ?)",
            ("inv-2", p1, freelancer_id, "$800", "paid"),
        )

        # ── Client demo users (seed pool for matching) ────────────────────────
        demo_clients = [
            {
                "email": "jordan.kim@demo.local",
                "name": "Jordan Kim",
                "specialty": "Brand & campaigns",
                "location": "Los Angeles, CA",
                "bio": "Marketing Director looking for a brand identity refresh.",
                "required_skills": ["React", "Figma", "UI/UX"],
                "budget_min": 8000_00,   # $8,000 in cents
                "budget_max": 12000_00,
                "project_title": "Q2 brand refresh",
                "project_summary": "Logo refinement, component library, and landing page updates.",
            },
            {
                "email": "sam.okonkwo@demo.local",
                "name": "Sam Okonkwo",
                "specialty": "B2B SaaS",
                "location": "New York, NY",
                "bio": "Product Lead scaling a B2B platform.",
                "required_skills": ["TypeScript", "React", "UX Research"],
                "budget_min": 6000_00,
                "budget_max": 10000_00,
                "project_title": "Onboarding UX audit",
                "project_summary": "Heuristic review, flow maps, and prioritized recommendations.",
            },
            {
                "email": "riley.chen@demo.local",
                "name": "Riley Chen",
                "specialty": "Early-stage startups",
                "location": "San Francisco, CA",
                "bio": "Founder raising pre-seed, needs pitch materials.",
                "required_skills": ["Figma", "CSS", "Presentation Design"],
                "budget_min": 5000_00,
                "budget_max": 9000_00,
                "project_title": "Pitch & one-pager",
                "project_summary": "Investor narrative, slide deck, and a single-page site.",
            },
        ]
        for cl in demo_clients:
            c.execute(
                "INSERT INTO users (email, name, hashed_pw, role) VALUES (?, ?, ?, ?)",
                (cl["email"], cl["name"], hash_password("demo"), "client"),
            )
            client_uid = c.lastrowid
            c.execute(
                """INSERT INTO user_profiles
                   (user_id, skills, required_skills, budget_min, budget_max,
                    project_title, project_summary, bio, specialty, location, available)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    client_uid,
                    _json.dumps([]),
                    _json.dumps(cl["required_skills"]),
                    cl["budget_min"],
                    cl["budget_max"],
                    cl["project_title"],
                    cl["project_summary"],
                    cl["bio"],
                    cl["specialty"],
                    cl["location"],
                    1,
                ),
            )

        # ── More freelancer demo users (invite pool for clients) ──────────────
        demo_freelancers = [
            {
                "email": "alex.park@demo.local",
                "name": "Alex Park",
                "skills": ["React", "TypeScript", "Tailwind", "UI/UX"],
                "hourly_rate": 8500,
                "bio": "Frontend engineer focused on design-systems and SaaS dashboards.",
                "specialty": "Frontend Engineering",
                "location": "Seoul, KR",
            },
            {
                "email": "maria.silva@demo.local",
                "name": "Maria Silva",
                "skills": ["Figma", "UI/UX", "Presentation Design", "Branding"],
                "hourly_rate": 7000,
                "bio": "Visual + brand designer with agency background.",
                "specialty": "Brand Design",
                "location": "Lisbon, PT",
            },
            {
                "email": "kenji.tanaka@demo.local",
                "name": "Kenji Tanaka",
                "skills": ["React", "Node.js", "PostgreSQL", "AWS"],
                "hourly_rate": 11500,
                "bio": "Full-stack dev building product MVPs end-to-end.",
                "specialty": "Full-stack Engineering",
                "location": "Tokyo, JP",
            },
        ]
        for fl in demo_freelancers:
            c.execute(
                "INSERT INTO users (email, name, hashed_pw, role) VALUES (?, ?, ?, ?)",
                (fl["email"], fl["name"], hash_password("demo"), "freelancer"),
            )
            fl_uid = c.lastrowid
            c.execute(
                """INSERT INTO user_profiles
                   (user_id, skills, hourly_rate, available, bio, specialty, location)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    fl_uid,
                    _json.dumps(fl["skills"]),
                    fl["hourly_rate"],
                    1,
                    fl["bio"],
                    fl["specialty"],
                    fl["location"],
                ),
            )

    conn.commit()
    conn.close()
