import sqlite3
import os

DB_PATH = os.environ.get("DB_PATH", "freelanceos.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


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
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT    NOT NULL,
        client_name  TEXT,
        owner_id     INTEGER NOT NULL REFERENCES users(id),
        status       TEXT    NOT NULL DEFAULT 'active',
        created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
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

    conn.commit()
    conn.close()
