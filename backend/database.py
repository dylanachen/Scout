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

    CREATE TABLE IF NOT EXISTS freelancer_profiles (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id           INTEGER UNIQUE NOT NULL REFERENCES users(id),
        skills            TEXT,
        hourly_rate       REAL,
        availability      TEXT,
        experience_years  INTEGER,
        bio               TEXT,
        portfolio_url     TEXT,
        location          TEXT,
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS client_profiles (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id             INTEGER UNIQUE NOT NULL REFERENCES users(id),
        company_name        TEXT,
        industry            TEXT,
        project_description TEXT,
        required_skills     TEXT,
        budget_min          REAL,
        budget_max          REAL,
        timeline            TEXT,
        team_size           INTEGER,
        location            TEXT,
        created_at          TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS match_history (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        freelancer_id INTEGER NOT NULL REFERENCES users(id),
        client_id     INTEGER NOT NULL REFERENCES users(id),
        score         REAL,
        status        TEXT NOT NULL DEFAULT 'suggested',
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    """)

    # Seed demo data for demo user
    c.execute("SELECT id FROM users WHERE email = 'demo@freelanceos.local'")
    if not c.fetchone():
        from auth import hash_password
        c.execute(
            "INSERT INTO users (email, name, hashed_pw) VALUES (?, ?, ?)",
            ("demo@freelanceos.local", "Demo Freelancer", hash_password("demo")),
        )
        user_id = c.lastrowid
        c.execute(
            "INSERT INTO projects (name, client_name, owner_id) VALUES (?, ?, ?)",
            ("Website refresh", "Northwind LLC", user_id),
        )
        p1 = c.lastrowid
        c.execute(
            "INSERT INTO projects (name, client_name, owner_id) VALUES (?, ?, ?)",
            ("Pitch deck", "Blue Harbor", user_id),
        )
        c.execute(
            "INSERT INTO invoices (id, project_id, owner_id, amount, status) VALUES (?, ?, ?, ?, ?)",
            ("inv-1", p1, user_id, "$2,400", "sent"),
        )
        c.execute(
            "INSERT INTO invoices (id, project_id, owner_id, amount, status) VALUES (?, ?, ?, ?, ?)",
            ("inv-2", p1, user_id, "$800", "paid"),
        )

    conn.commit()
    conn.close()
