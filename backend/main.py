import os
import uuid
import json
import asyncio
from typing import Optional
from contextlib import asynccontextmanager

import aiofiles
from fastapi import (
    FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect,
    UploadFile, File, status,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from database import get_conn, init_db
from auth import (
    hash_password, verify_password, create_token,
    decode_token, get_current_user_id,
)

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="FreelanceOS API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic schemas ─────────────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = None

class ProfilePatch(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class OnboardingMessage(BaseModel):
    message: str

class InvoicePatch(BaseModel):
    status: Optional[str] = None
    amount: Optional[str] = None

class MeetingEndRequest(BaseModel):
    startedAt: Optional[int] = None  # epoch ms from frontend

class ParticipantCreate(BaseModel):
    name: str
    role: Optional[str] = "Stakeholder"
    email: Optional[str] = None
    avatar_color: Optional[str] = "#64748b"

class UserProfilePatch(BaseModel):
    # freelancer fields
    skills: Optional[list] = None       # e.g. ["React", "Figma"]
    hourly_rate: Optional[int] = None   # cents (e.g. 9500 = $95/hr)
    available: Optional[bool] = None
    available_from: Optional[str] = None
    bio: Optional[str] = None
    specialty: Optional[str] = None
    location: Optional[str] = None
    # client fields
    required_skills: Optional[list] = None
    budget_min: Optional[int] = None    # cents
    budget_max: Optional[int] = None    # cents
    project_title: Optional[str] = None
    project_summary: Optional[str] = None

# ── WebSocket connection manager ─────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # project_id -> list of (websocket, user_id, user_name)
        self.rooms: dict[str, list[tuple]] = {}

    def join(self, project_id: str, ws: WebSocket, user_id: int, user_name: str):
        self.rooms.setdefault(project_id, []).append((ws, user_id, user_name))

    def leave(self, project_id: str, ws: WebSocket):
        if project_id in self.rooms:
            self.rooms[project_id] = [
                c for c in self.rooms[project_id] if c[0] is not ws
            ]

    async def broadcast(self, project_id: str, payload: dict, exclude: WebSocket = None):
        for ws, _, _ in self.rooms.get(project_id, []):
            if ws is not exclude:
                try:
                    await ws.send_text(json.dumps(payload))
                except Exception:
                    pass

manager = ConnectionManager()

# ── Helper ────────────────────────────────────────────────────────────────────

def row_to_dict(row) -> dict:
    return dict(row) if row else None

def get_user_by_id(user_id: int) -> dict:
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row_to_dict(row)

# ── Auth routes ───────────────────────────────────────────────────────────────

@app.post("/auth/register", status_code=201)
def register(body: RegisterRequest):
    conn = get_conn()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(body.password) < 8:
        conn.close()
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    name = (body.full_name or "").strip() or None
    role = body.role if body.role in ("freelancer", "client") else "freelancer"
    conn.execute(
        "INSERT INTO users (email, name, hashed_pw, role) VALUES (?, ?, ?, ?)",
        (body.email, name, hash_password(body.password), role),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@app.post("/auth/login")
def login(body: AuthRequest):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    conn.close()
    if not row or not verify_password(body.password, row["hashed_pw"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(row["id"], row["email"])
    return {"access_token": token}


@app.get("/auth/me")
def me(user_id: int = Depends(get_current_user_id)):
    user = get_user_by_id(user_id)
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"] or user["email"],
        "role": user["role"],
    }


@app.patch("/auth/me")
def update_me(body: ProfilePatch, user_id: int = Depends(get_current_user_id)):
    updates = {}
    if body.name is not None:
        updates["name"] = body.name.strip() or None
    if body.email is not None:
        updates["email"] = body.email.strip()
    if body.role is not None and body.role in ("freelancer", "client"):
        updates["role"] = body.role
    # avatar_url is accepted but we don't store it in the current schema; ignore silently

    conn = get_conn()
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(
            f"UPDATE users SET {set_clause} WHERE id = ?",
            (*updates.values(), user_id),
        )
        conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    user = row_to_dict(row)
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"] or user["email"],
        "role": user["role"],
    }


@app.post("/auth/forgot-password")
def forgot_password(body: ForgotPasswordRequest):
    conn = get_conn()
    row = conn.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="No account found for this email.")
    # In production, send a reset email here. For now just confirm the email exists.
    return {"ok": True}


@app.post("/auth/change-password")
def change_password(body: ChangePasswordRequest, user_id: int = Depends(get_current_user_id)):
    if len(body.new_password) < 8:
        raise HTTPException(status_code=422, detail="New password must be at least 8 characters")
    conn = get_conn()
    row = conn.execute("SELECT hashed_pw FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row or not verify_password(body.current_password, row["hashed_pw"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    conn.execute(
        "UPDATE users SET hashed_pw = ? WHERE id = ?",
        (hash_password(body.new_password), user_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@app.delete("/auth/me")
def delete_account(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"ok": True}

# ── Projects ──────────────────────────────────────────────────────────────────

@app.get("/projects")
def list_projects(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, name, client_name, status, created_at FROM projects WHERE owner_id = ?",
        (user_id,),
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.post("/projects", status_code=201)
def create_project(body: dict, user_id: int = Depends(get_current_user_id)):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    conn = get_conn()
    conn.execute(
        "INSERT INTO projects (name, client_name, owner_id) VALUES (?, ?, ?)",
        (name, body.get("client_name"), user_id),
    )
    conn.commit()
    project_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return {"id": project_id, "name": name}

# ── Participants ──────────────────────────────────────────────────────────────

@app.get("/projects/{project_id}/participants")
def list_participants(project_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    project = conn.execute(
        "SELECT id, name, client_name, owner_id FROM projects WHERE id = ? AND owner_id = ?",
        (project_id, user_id),
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    owner = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    owner_name = owner["name"] or owner["email"] if owner else "You"
    initials = "".join(w[0] for w in owner_name.split()[:2]).upper() or "YO"

    result = [
        {
            "id": f"owner_{user_id}",
            "name": owner_name,
            "role": "Host",
            "initials": initials,
            "avatarColor": "var(--color-primary)",
            "removable": False,
        }
    ]

    rows = conn.execute(
        "SELECT id, name, role, email, avatar_color FROM participants WHERE project_id = ?",
        (project_id,),
    ).fetchall()
    conn.close()

    for r in rows:
        p = row_to_dict(r)
        name = p["name"]
        result.append({
            "id": p["id"],
            "name": name,
            "role": p["role"],
            "initials": "".join(w[0] for w in name.split()[:2]).upper() or "??",
            "avatarColor": p["avatar_color"],
            "removable": True,
            "email": p["email"],
        })

    return result


@app.post("/projects/{project_id}/participants", status_code=201)
def add_participant(
    project_id: int,
    body: ParticipantCreate,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    project = conn.execute(
        "SELECT id FROM projects WHERE id = ? AND owner_id = ?", (project_id, user_id)
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    conn.execute(
        "INSERT INTO participants (project_id, name, role, email, avatar_color) VALUES (?, ?, ?, ?, ?)",
        (project_id, body.name.strip(), body.role, body.email, body.avatar_color or "#64748b"),
    )
    conn.commit()
    participant_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return {"id": participant_id, "name": body.name, "role": body.role}


@app.delete("/projects/{project_id}/participants/{participant_id}")
def remove_participant(
    project_id: int,
    participant_id: int,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    project = conn.execute(
        "SELECT id FROM projects WHERE id = ? AND owner_id = ?", (project_id, user_id)
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    conn.execute(
        "DELETE FROM participants WHERE id = ? AND project_id = ?",
        (participant_id, project_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Meeting ───────────────────────────────────────────────────────────────────

@app.post("/projects/{project_id}/meeting/end")
async def end_meeting(
    project_id: int,
    body: MeetingEndRequest,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    project = conn.execute(
        "SELECT id, name, client_name FROM projects WHERE id = ? AND owner_id = ?",
        (project_id, user_id),
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch last N messages for context
    rows = conn.execute(
        """SELECT sender_name, text FROM messages
           WHERE project_id = ?
           ORDER BY created_at DESC LIMIT 30""",
        (project_id,),
    ).fetchall()
    conn.close()

    messages_text = "\n".join(
        f"{r['sender_name']}: {r['text']}" for r in reversed(rows)
    ) or "(no chat history)"

    import time
    ended_at = int(time.time() * 1000)
    started_at = body.startedAt or (ended_at - 30 * 60 * 1000)
    duration_ms = max(0, ended_at - started_at)
    duration_min = round(duration_ms / 60000)

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            from openai import AsyncOpenAI
            oai = AsyncOpenAI(api_key=openai_key)
            prompt = f"""You are an AI assistant summarizing a project meeting for a freelancer-client call.

Project: {project['name']} | Client: {project['client_name'] or 'Unknown'}
Duration: ~{duration_min} min

Recent chat context:
{messages_text}

Generate a JSON meeting summary with these fields:
- title: string (short descriptive title)
- duration_minutes: number
- key_points: array of strings (3-5 bullet points)
- action_items: array of objects with "text" and "owner" (who is responsible)
- decisions: array of strings
- next_steps: string

Respond with valid JSON only."""
            resp = await oai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=512,
                response_format={"type": "json_object"},
            )
            summary = json.loads(resp.choices[0].message.content)
            summary["duration_minutes"] = duration_min
            return summary
        except Exception as e:
            print(f"[Meeting] LLM error: {e}")

    # Fallback summary
    return {
        "title": f"Meeting — {project['name']}",
        "duration_minutes": duration_min,
        "key_points": ["Meeting completed successfully."],
        "action_items": [],
        "decisions": [],
        "next_steps": "Follow up on discussed items.",
    }


# ── Contract upload → triggers RAG pipeline ───────────────────────────────────

@app.post("/projects/{project_id}/contract")
async def upload_contract(
    project_id: int,
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    project = conn.execute(
        "SELECT id FROM projects WHERE id = ? AND owner_id = ?", (project_id, user_id)
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    filename = f"{project_id}_{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    conn.execute(
        "INSERT INTO contracts (project_id, filename, filepath) VALUES (?, ?, ?)",
        (project_id, file.filename, filepath),
    )
    conn.commit()
    conn.close()

    # Kick off RAG ingestion in background (non-blocking)
    asyncio.create_task(ingest_contract(project_id, filepath))

    return {"ok": True, "filename": file.filename}


async def ingest_contract(project_id: int, filepath: str):
    """Extract text from PDF and store embeddings in ChromaDB."""
    try:
        import pdfplumber
        import chromadb
        from chromadb.utils import embedding_functions

        chunks = []
        with pdfplumber.open(filepath) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                # Simple chunking: ~500 char chunks with 50 char overlap
                chunk_size, overlap = 500, 50
                for i in range(0, max(1, len(text)), chunk_size - overlap):
                    chunk = text[i : i + chunk_size].strip()
                    if chunk:
                        chunks.append({
                            "text": chunk,
                            "page": page_num + 1,
                            "chunk_index": i,
                        })

        if not chunks:
            return

        client = chromadb.PersistentClient(path="./chroma_db")
        ef = embedding_functions.DefaultEmbeddingFunction()
        collection = client.get_or_create_collection(
            f"project_{project_id}_contract", embedding_function=ef
        )
        collection.upsert(
            ids=[f"p{project_id}_chunk_{c['chunk_index']}" for c in chunks],
            documents=[c["text"] for c in chunks],
            metadatas=[{"page": c["page"]} for c in chunks],
        )
        print(f"[RAG] Ingested {len(chunks)} chunks for project {project_id}")
    except Exception as e:
        print(f"[RAG] Ingestion failed: {e}")

# ── Invoices ──────────────────────────────────────────────────────────────────

@app.get("/invoices")
def list_invoices(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, amount, status, project_id, created_at FROM invoices WHERE owner_id = ?",
        (user_id,),
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.patch("/invoices/{invoice_id}")
def patch_invoice(
    invoice_id: str,
    body: InvoicePatch,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    row = conn.execute(
        "SELECT id FROM invoices WHERE id = ? AND owner_id = ?", (invoice_id, user_id)
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(
            f"UPDATE invoices SET {set_clause} WHERE id = ?",
            (*updates.values(), invoice_id),
        )
        conn.commit()
    conn.close()
    return {"ok": True}

# ── User profile ─────────────────────────────────────────────────────────────

def _get_profile(conn, uid: int) -> dict:
    """Return user_profiles row for uid, or a zeroed default dict."""
    row = conn.execute(
        "SELECT * FROM user_profiles WHERE user_id = ?", (uid,)
    ).fetchone()
    if row:
        p = row_to_dict(row)
        p["skills"] = json.loads(p.get("skills") or "[]")
        p["required_skills"] = json.loads(p.get("required_skills") or "[]")
        return p
    return {
        "user_id": uid, "skills": [], "hourly_rate": 0,
        "available": 1, "available_from": None, "bio": None,
        "specialty": None, "location": None, "required_skills": [],
        "budget_min": 0, "budget_max": 0,
        "project_title": None, "project_summary": None,
    }


@app.get("/profile")
def get_profile(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    user = row_to_dict(conn.execute(
        "SELECT id, email, name, role FROM users WHERE id = ?", (user_id,)
    ).fetchone())
    profile = _get_profile(conn, user_id)
    conn.close()
    return {**user, **profile}


@app.patch("/profile")
def update_profile(body: UserProfilePatch, user_id: int = Depends(get_current_user_id)):
    data = body.model_dump(exclude_none=True)
    if not data:
        return {"ok": True}

    # Serialize list fields to JSON strings
    for key in ("skills", "required_skills"):
        if key in data:
            data[key] = json.dumps(data[key])
    if "available" in data:
        data["available"] = int(data["available"])

    conn = get_conn()
    existing = conn.execute(
        "SELECT user_id FROM user_profiles WHERE user_id = ?", (user_id,)
    ).fetchone()

    if existing:
        set_clause = ", ".join(f"{k} = ?" for k in data)
        set_clause += ", updated_at = datetime('now')"
        conn.execute(
            f"UPDATE user_profiles SET {set_clause} WHERE user_id = ?",
            (*data.values(), user_id),
        )
    else:
        cols = ", ".join(["user_id"] + list(data.keys()))
        placeholders = ", ".join(["?"] * (1 + len(data)))
        conn.execute(
            f"INSERT INTO user_profiles ({cols}) VALUES ({placeholders})",
            (user_id, *data.values()),
        )

    conn.commit()
    profile = _get_profile(conn, user_id)
    conn.close()
    return profile


# ── Matching algorithm ────────────────────────────────────────────────────────

def _score_match(freelancer: dict, client: dict) -> dict:
    """
    Rule-based scoring between a freelancer profile and a client profile.
    Returns scores dict with keys: skillFit, budget, timeline, communication, overall.
    All scores 0-100.
    """
    # ── 1. Skill Fit (40 %) ───────────────────────────────────────────────────
    f_skills = {s.lower().strip() for s in (freelancer.get("skills") or [])}
    c_skills = {s.lower().strip() for s in (client.get("required_skills") or [])}

    if c_skills:
        overlap = len(f_skills & c_skills)
        skill_fit = round(overlap / len(c_skills) * 100)
        # Partial credit: each unmatched skill costs less if freelancer has many skills
        if skill_fit < 100 and f_skills:
            bonus = min(20, round(len(f_skills) / max(len(c_skills), 1) * 10))
            skill_fit = min(100, skill_fit + bonus)
    else:
        skill_fit = 60  # no requirements stated → neutral

    # ── 2. Budget Fit (30 %) ──────────────────────────────────────────────────
    rate = freelancer.get("hourly_rate") or 0          # cents / hr
    bmin = client.get("budget_min") or 0               # cents (total budget)
    bmax = client.get("budget_max") or 0

    if bmax > 0 and rate > 0:
        # Estimate project hours from total budget ÷ rate (assume 40-hr week, 4 weeks)
        # Simpler: compare rate to budget band treated as $/hr range / 100
        bmin_hr = bmin / 160   # 160 hr project assumption
        bmax_hr = bmax / 160
        if bmin_hr <= rate <= bmax_hr:
            budget_score = 100
        elif rate < bmin_hr:
            # Freelancer is cheaper than client expects → great for client
            budget_score = 90
        else:
            overage = (rate - bmax_hr) / bmax_hr if bmax_hr else 1
            budget_score = max(0, round(100 - overage * 120))
    elif bmax == 0 and rate == 0:
        budget_score = 50
    else:
        budget_score = 50

    # ── 3. Timeline / Availability (15 %) ────────────────────────────────────
    timeline_score = 100 if freelancer.get("available", 1) else 20

    # ── 4. Communication proxy: profile completeness (15 %) ──────────────────
    fields = [freelancer.get("bio"), freelancer.get("specialty"),
              freelancer.get("location"), freelancer.get("hourly_rate")]
    filled = sum(1 for f in fields if f)
    comm_score = round(40 + (filled / len(fields)) * 60)

    overall = round(
        skill_fit   * 0.40 +
        budget_score * 0.30 +
        timeline_score * 0.15 +
        comm_score  * 0.15
    )

    # Tight timeline warning: available but no available_from means "now" — fine
    tight = (not freelancer.get("available", 1)) and bool(freelancer.get("available_from"))

    return {
        "skillFit":      skill_fit,
        "budget":        budget_score,
        "timeline":      timeline_score,
        "communication": comm_score,
        "overall":       overall,
        "timelineTightWarning": tight,
    }


def _fmt_budget(bmin: int, bmax: int) -> str:
    """Format cents budget range to human-readable string."""
    def fmt(c):
        d = c // 100
        return f"${d // 1000}k" if d >= 1000 else f"${d}"
    if bmin and bmax:
        return f"{fmt(bmin)}–{fmt(bmax)}"
    if bmax:
        return f"Up to {fmt(bmax)}"
    if bmin:
        return f"From {fmt(bmin)}"
    return "Negotiable"


def _build_explanation(f: dict, c: dict, scores: dict) -> str:
    f_skills = {s.lower().strip() for s in (f.get("skills") or [])}
    c_skills = {s.lower().strip() for s in (c.get("required_skills") or [])}
    matched = list(f_skills & c_skills)

    parts = []
    if matched:
        parts.append(f"Your skills in {', '.join(matched[:3])} align with the project requirements.")
    if scores["budget"] >= 80:
        parts.append("Your rate fits well within their budget range.")
    elif scores["budget"] >= 50:
        parts.append("Your rate is close to their budget range.")
    if scores["skillFit"] >= 80:
        parts.append("Strong skill overlap with what this client needs.")
    if not parts:
        parts.append("Potential match based on your profile and their project scope.")
    return " ".join(parts)


# ── Matches ───────────────────────────────────────────────────────────────────

@app.get("/matches")
def list_matches(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()

    me = row_to_dict(conn.execute(
        "SELECT id, role FROM users WHERE id = ?", (user_id,)
    ).fetchone())
    my_profile = _get_profile(conn, user_id)
    my_role = me.get("role", "freelancer")

    # Find counterpart users (opposite role)
    opposite_role = "client" if my_role == "freelancer" else "freelancer"
    others = conn.execute(
        "SELECT id, name, email, role FROM users WHERE role = ? AND id != ?",
        (opposite_role, user_id),
    ).fetchall()

    results = []
    for other_row in others:
        other = row_to_dict(other_row)
        other_profile = _get_profile(conn, other["id"])

        if my_role == "freelancer":
            freelancer_p = my_profile
            client_p     = other_profile
        else:
            freelancer_p = other_profile
            client_p     = my_profile

        scores = _score_match(freelancer_p, client_p)

        # Skip very poor matches (overall < 20)
        if scores["overall"] < 20:
            continue

        results.append({
            "id":            f"match_{user_id}_{other['id']}",
            "clientId":      str(other["id"]),
            "name":          other["name"] or other["email"],
            "role":          other_profile.get("specialty") or other["role"].capitalize(),
            "specialty":     other_profile.get("specialty"),
            "location":      other_profile.get("location"),
            "avatarUrl":     None,
            "available":     bool(other_profile.get("available", 1)),
            "availableFrom": other_profile.get("available_from"),
            "overallScore":  scores["overall"],
            "scores": {
                "skillFit":      scores["skillFit"],
                "communication": scores["communication"],
                "timeline":      scores["timeline"],
                "budget":        scores["budget"],
            },
            "explanation":        _build_explanation(freelancer_p, client_p, scores),
            "timelineTightWarning": scores["timelineTightWarning"],
            "projectName":    client_p.get("project_title") or "Untitled Project",
            "projectSummary": client_p.get("project_summary"),
            "budget":         _fmt_budget(
                                  client_p.get("budget_min") or 0,
                                  client_p.get("budget_max") or 0,
                              ),
            "portfolio":      [],
        })

    conn.close()

    # Sort by overall score descending
    results.sort(key=lambda x: x["overallScore"], reverse=True)
    return results


# ── Dashboard Summary ──────────────────────────────────────────────────────────

@app.get("/dashboard/summary")
def dashboard_summary(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()

    # Projects
    proj_rows = conn.execute(
        "SELECT id, name, client_name, status, created_at FROM projects WHERE owner_id = ?",
        (user_id,),
    ).fetchall()
    projects = [row_to_dict(r) for r in proj_rows]

    # Invoices
    inv_rows = conn.execute(
        "SELECT id, amount, status, project_id, created_at FROM invoices WHERE owner_id = ?",
        (user_id,),
    ).fetchall()
    invoices = [row_to_dict(r) for r in inv_rows]

    # Unread messages: messages from others in each project (simple count)
    unread_count = 0
    for p in projects:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM messages WHERE project_id = ? AND sender_id != ?",
            (p["id"], user_id),
        ).fetchone()
        unread_count += (row["cnt"] if row else 0)

    # Pending matches
    match_rows = conn.execute(
        """SELECT id, client_name, project_name, budget, overall_score
           FROM matches WHERE owner_id = ? AND status = 'pending'
           ORDER BY overall_score DESC LIMIT 5""",
        (user_id,),
    ).fetchall()

    conn.close()

    open_invoices = [i for i in invoices if i["status"] != "paid"]

    def parse_cents(amount_str):
        try:
            digits = "".join(c for c in str(amount_str) if c.isdigit() or c == ".")
            return round(float(digits) * 100) if digits else 0
        except Exception:
            return 0

    pending_cents = sum(parse_cents(i["amount"]) for i in open_invoices)

    stats = {
        "active_projects": len(projects),
        "hours_logged_week": None,
        "pending_invoices_count": len(open_invoices),
        "pending_invoices_total_cents": pending_cents,
        "unread_messages": unread_count,
    }

    pending_matches = [
        {
            "id": row_to_dict(r)["id"],
            "title": row_to_dict(r)["project_name"],
            "counterpart_name": row_to_dict(r)["client_name"],
            "counterpart_role": "client",
            "budget": row_to_dict(r)["budget"],
        }
        for r in match_rows
    ]

    # Simple pipeline: active projects with created_at as start dates
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date().isoformat()
    bars = [
        {
            "project_id": p["id"],
            "name": p["name"],
            "start": (p["created_at"] or today)[:10],
            "end": today,
        }
        for p in projects
    ]

    return {
        "stats": stats,
        "projects": projects,
        "pending_matches": pending_matches,
        "notifications": [],
        "pipeline": {
            "window_start": today,
            "window_end": today,
            "revenue_forecast": {
                "from_active_projects_cents": 0,
                "from_pending_invoices_cents": pending_cents,
            },
            "bars": bars,
            "upcoming_deadlines": [],
        },
    }


# ── Onboarding ────────────────────────────────────────────────────────────────

ONBOARDING_SYSTEM = """You are an AI onboarding assistant for FreelanceOS, a platform that connects
freelancers with clients. Your job is to gather information from the user conversationally.
For freelancers: ask about their skills, hourly rate, availability, and past projects.
For clients: ask about their project needs, budget, timeline, and team size.
Keep responses concise and friendly. Ask one question at a time."""

@app.post("/onboarding/message")
async def onboarding_message(
    body: OnboardingMessage,
    user_id: int = Depends(get_current_user_id),
):
    # Try OpenAI; fall back to echo if no key set
    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=openai_key)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": ONBOARDING_SYSTEM},
                    {"role": "user", "content": body.message},
                ],
                max_tokens=256,
            )
            reply = resp.choices[0].message.content
        except Exception as e:
            reply = f"(LLM error: {e}) Echo: {body.message}"
    else:
        reply = (
            f"(No OPENAI_API_KEY set — echo mode) You said: \"{body.message}\". "
            "Set OPENAI_API_KEY in your environment to enable real AI responses."
        )

    conn = get_conn()
    conn.execute(
        "INSERT INTO onboarding_sessions (user_id, message, reply) VALUES (?, ?, ?)",
        (user_id, body.message, reply),
    )
    conn.commit()
    conn.close()
    return {"reply": reply}

# ── WebSocket chat ────────────────────────────────────────────────────────────

@app.websocket("/ws/chat/{project_id}")
async def websocket_chat(websocket: WebSocket, project_id: str, token: str = ""):
    # Auth via query param token
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except Exception:
        await websocket.close(code=4001)
        return

    user = get_user_by_id(user_id)
    user_name = user["name"] or user["email"]

    await websocket.accept()
    manager.join(project_id, websocket, user_id, user_name)

    # Send chat history
    conn = get_conn()
    rows = conn.execute(
        """SELECT m.id, m.text, m.sender_id, m.sender_name, m.created_at
           FROM messages m
           WHERE m.project_id = ?
           ORDER BY m.created_at ASC
           LIMIT 100""",
        (project_id,),
    ).fetchall()
    conn.close()
    await websocket.send_text(json.dumps({
        "type": "history",
        "payload": [row_to_dict(r) for r in rows],
    }))

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            if data.get("type") == "message":
                text = (data.get("text") or "").strip()
                if not text:
                    continue

                # Persist message
                conn = get_conn()
                conn.execute(
                    "INSERT INTO messages (project_id, sender_id, sender_name, text) VALUES (?, ?, ?, ?)",
                    (project_id, user_id, user_name, text),
                )
                conn.commit()
                msg_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                created_at = conn.execute(
                    "SELECT created_at FROM messages WHERE id = ?", (msg_id,)
                ).fetchone()[0]
                conn.close()

                msg_payload = {
                    "id": msg_id,
                    "text": text,
                    "sender_id": user_id,
                    "sender_name": user_name,
                    "created_at": created_at,
                }

                # Broadcast to all in room (including sender)
                await manager.broadcast(project_id, {"type": "message", "payload": msg_payload})

                # Run scope guardian in background
                asyncio.create_task(
                    run_scope_guardian(project_id, msg_id, text, websocket)
                )

    except WebSocketDisconnect:
        manager.leave(project_id, websocket)
    except Exception as e:
        print(f"[WS] Error: {e}")
        manager.leave(project_id, websocket)


async def run_scope_guardian(project_id: str, msg_id: int, text: str, sender_ws: WebSocket):
    """Query ChromaDB for relevant contract clauses, then flag scope creep via LLM."""
    try:
        import chromadb
        from chromadb.utils import embedding_functions

        client = chromadb.PersistentClient(path="./chroma_db")
        ef = embedding_functions.DefaultEmbeddingFunction()
        collection_name = f"project_{project_id}_contract"

        try:
            collection = client.get_collection(collection_name, embedding_function=ef)
        except Exception:
            return  # No contract uploaded yet

        results = collection.query(query_texts=[text], n_results=3)
        if not results["documents"] or not results["documents"][0]:
            return

        top_clauses = results["documents"][0]
        contract_context = "\n---\n".join(top_clauses)

        openai_key = os.environ.get("OPENAI_API_KEY")
        if not openai_key:
            return

        from openai import AsyncOpenAI
        oai = AsyncOpenAI(api_key=openai_key)

        prompt = f"""You are an AI Scope Guardian for a freelancer-client project.
Given this client message and relevant contract clauses, determine if the message requests work outside the original scope.

Client message: "{text}"

Relevant contract clauses:
{contract_context}

If this is a scope creep request, respond with JSON:
{{"is_scope_creep": true, "message": "brief explanation for the freelancer", "suggested_reply": "polite reply to client", "contract_clause": "relevant clause snippet"}}

If it's within scope, respond with:
{{"is_scope_creep": false}}

Respond with JSON only."""

        resp = await oai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            response_format={"type": "json_object"},
        )

        result = json.loads(resp.choices[0].message.content)
        if result.get("is_scope_creep"):
            alert = {
                "id": f"scope_{msg_id}_{uuid.uuid4().hex[:6]}",
                "after_message_id": msg_id,
                "message": result.get("message", "Possible scope creep detected."),
                "suggested_reply": result.get("suggested_reply"),
                "contract_clause": result.get("contract_clause"),
            }
            try:
                await sender_ws.send_text(json.dumps({"type": "scope_alert", "payload": alert}))
            except Exception:
                pass
    except Exception as e:
        print(f"[ScopeGuardian] Error: {e}")
