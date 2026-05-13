import os
import uuid
import json
import asyncio
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).parent / ".env")
except ImportError:
    pass

import aiofiles
from fastapi import (
    FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect,
    UploadFile, File, Form, status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
    # Best-effort: embed all seed user profiles so /matches works on first launch
    try:
        conn = get_conn()
        ids = [r["id"] for r in conn.execute("SELECT id FROM users").fetchall()]
        conn.close()
        for uid in ids:
            try:
                _upsert_profile_embedding(uid)
            except Exception:
                pass
    except Exception as e:
        print(f"[lifespan] seed-embedding skipped: {e}")
    yield

app = FastAPI(title="FreelanceOS API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (contract PDFs, chat attachments) at /uploads/*
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

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

class ProjectCreate(BaseModel):
    name: str
    client_name: Optional[str] = None
    description: Optional[str] = None
    budget_min: Optional[int] = None     # cents
    budget_max: Optional[int] = None     # cents
    required_skills: Optional[list] = None
    timeline_weeks: Optional[int] = None

class InvitationCreate(BaseModel):
    invitee_id: int
    message: Optional[str] = None

class InvitationPatch(BaseModel):
    status: str  # 'accepted' | 'declined'

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[str] = None
    status: Optional[str] = "todo"

class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[str] = None
    status: Optional[str] = None

class TimeEntryCreate(BaseModel):
    project_id: int
    date: str                         # YYYY-MM-DD
    duration_minutes: int
    description: Optional[str] = None
    billable: Optional[bool] = True

class TimeEntryPatch(BaseModel):
    date: Optional[str] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = None
    billable: Optional[bool] = None

class DecisionCreate(BaseModel):
    decision: str
    message_id: Optional[int] = None
    tag: Optional[str] = "Decision"

class InvoiceGenerate(BaseModel):
    hourly_rate_cents: Optional[int] = None  # if omitted, use freelancer's profile rate
    period_start: Optional[str] = None        # YYYY-MM-DD
    period_end: Optional[str] = None

class InvoiceCreate(BaseModel):
    project_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    amount_cents: int = 0
    due_date: Optional[str] = None
    client_email: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "draft"

class ScopeFlagPatch(BaseModel):
    status: str  # 'dismissed' | 'resolved' | 'open'

class PortfolioItemCreate(BaseModel):
    title: str
    summary: Optional[str] = None
    thumbnail_url: Optional[str] = None
    tags: Optional[list] = None
    testimonial: Optional[str] = None
    client_name: Optional[str] = None
    project_id: Optional[int] = None
    is_public: Optional[bool] = True

class RatingCreate(BaseModel):
    ratee_id: int
    project_id: Optional[int] = None
    overall: float
    asset_delivery: Optional[float] = None
    communication: Optional[float] = None
    scope_respect: Optional[float] = None
    payment_speed: Optional[float] = None
    comment: Optional[str] = None

class ChangeOrderCreate(BaseModel):
    project_id: int
    title: str
    description: Optional[str] = None
    amount_cents: int = 0
    hours: float = 0.0
    status: Optional[str] = "draft"

class ChangeOrderPatch(BaseModel):
    status: Optional[str] = None
    signed_by_client: Optional[bool] = None
    title: Optional[str] = None
    description: Optional[str] = None
    amount_cents: Optional[int] = None
    hours: Optional[float] = None

class UserSettingsPatch(BaseModel):
    settings: dict

class NotificationCreate(BaseModel):
    title: str
    body: Optional[str] = None
    kind: Optional[str] = "generic"
    link: Optional[str] = None
    project_id: Optional[int] = None

class ChatAskRequest(BaseModel):
    question: str

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

def _serialize_project(row) -> dict:
    p = row_to_dict(row)
    if p is None:
        return None
    try:
        p["required_skills"] = json.loads(p.get("required_skills") or "[]")
    except Exception:
        p["required_skills"] = []
    return p


@app.get("/projects")
def list_projects(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    # Owned projects (+ last message preview / timestamp for thread sorting)
    owned = conn.execute(
        """SELECT p.id, p.name, p.client_name, p.description, p.budget_min, p.budget_max,
                  p.required_skills, p.timeline_weeks, p.status, p.created_at, p.owner_id,
                  (SELECT created_at FROM messages WHERE project_id = p.id ORDER BY id DESC LIMIT 1) AS last_message_at,
                  (SELECT text       FROM messages WHERE project_id = p.id ORDER BY id DESC LIMIT 1) AS last_message_text
           FROM projects p WHERE p.owner_id = ?""",
        (user_id,),
    ).fetchall()
    # Projects where I'm an accepted participant
    accepted = conn.execute(
        """SELECT p.id, p.name, p.client_name, p.description, p.budget_min, p.budget_max,
                  p.required_skills, p.timeline_weeks, p.status, p.created_at, p.owner_id,
                  (SELECT created_at FROM messages WHERE project_id = p.id ORDER BY id DESC LIMIT 1) AS last_message_at,
                  (SELECT text       FROM messages WHERE project_id = p.id ORDER BY id DESC LIMIT 1) AS last_message_text
           FROM projects p
           JOIN project_invitations i ON i.project_id = p.id
           WHERE i.invitee_id = ? AND i.status = 'accepted'""",
        (user_id,),
    ).fetchall()
    conn.close()
    rows = list(owned) + list(accepted)
    return [_serialize_project(r) for r in rows]


@app.post("/projects", status_code=201)
def create_project(body: ProjectCreate, user_id: int = Depends(get_current_user_id)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    conn = get_conn()
    me = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
    if not me or me["role"] != "client":
        conn.close()
        raise HTTPException(status_code=403, detail="Only clients can create projects")
    conn.execute(
        """INSERT INTO projects
           (name, client_name, owner_id, description, budget_min, budget_max,
            required_skills, timeline_weeks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            name,
            (body.client_name or "").strip() or None,
            user_id,
            body.description,
            body.budget_min or 0,
            body.budget_max or 0,
            json.dumps(body.required_skills or []),
            body.timeline_weeks,
        ),
    )
    conn.commit()
    project_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    row = conn.execute(
        """SELECT id, name, client_name, description, budget_min, budget_max,
                  required_skills, timeline_weeks, status, created_at, owner_id
           FROM projects WHERE id = ?""",
        (project_id,),
    ).fetchone()
    conn.close()
    return _serialize_project(row)


@app.get("/projects/{project_id}")
def get_project(project_id: int, user_id: int = Depends(get_current_user_id)):
    """Project detail — accessible to owner or accepted invitees (and pending invitees so they can review)."""
    conn = get_conn()
    row = conn.execute(
        """SELECT id, name, client_name, description, budget_min, budget_max,
                  required_skills, timeline_weeks, status, created_at, owner_id
           FROM projects WHERE id = ?""",
        (project_id,),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")
    project = _serialize_project(row)

    if project["owner_id"] != user_id:
        inv = conn.execute(
            "SELECT status FROM project_invitations WHERE project_id = ? AND invitee_id = ?",
            (project_id, user_id),
        ).fetchone()
        if not inv:
            conn.close()
            raise HTTPException(status_code=403, detail="Not authorized for this project")
        project["my_invitation_status"] = inv["status"]

    # Attach owner info
    owner = conn.execute(
        "SELECT id, name, email FROM users WHERE id = ?", (project["owner_id"],)
    ).fetchone()
    if owner:
        o = row_to_dict(owner)
        project["owner"] = {"id": o["id"], "name": o["name"] or o["email"], "email": o["email"]}
    conn.close()
    return project

# ── Participants ──────────────────────────────────────────────────────────────

@app.get("/projects/{project_id}/participants")
def list_participants(project_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    project = conn.execute(
        "SELECT id, name, client_name, owner_id FROM projects WHERE id = ?",
        (project_id,),
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    # Authorized: owner or any invitee (accepted OR pending can see roster)
    if project["owner_id"] != user_id:
        ok = conn.execute(
            "SELECT 1 FROM project_invitations WHERE project_id = ? AND invitee_id = ?",
            (project_id, user_id),
        ).fetchone()
        if not ok:
            conn.close()
            raise HTTPException(status_code=403, detail="Not authorized for this project")

    owner_row = conn.execute(
        "SELECT id, name, email FROM users WHERE id = ?", (project["owner_id"],)
    ).fetchone()
    owner_name = owner_row["name"] or owner_row["email"] if owner_row else "Owner"
    initials = "".join(w[0] for w in owner_name.split()[:2]).upper() or "OW"

    result = [
        {
            "id": f"owner_{project['owner_id']}",
            "user_id": project["owner_id"],
            "name": owner_name,
            "role": "Host",
            "initials": initials,
            "avatarColor": "var(--color-primary)",
            "removable": False,
            "status": "owner",
        }
    ]

    # Invited users (accepted + pending)
    inv_rows = conn.execute(
        """SELECT i.id as inv_id, i.status, i.invitee_id, u.name, u.email
           FROM project_invitations i
           JOIN users u ON u.id = i.invitee_id
           WHERE i.project_id = ? AND i.status IN ('pending','accepted')""",
        (project_id,),
    ).fetchall()
    for r in inv_rows:
        d = row_to_dict(r)
        nm = d["name"] or d["email"]
        result.append({
            "id": f"inv_{d['inv_id']}",
            "invitation_id": d["inv_id"],
            "user_id": d["invitee_id"],
            "name": nm,
            "role": "Freelancer" if d["status"] == "accepted" else "Invited",
            "initials": "".join(w[0] for w in nm.split()[:2]).upper() or "??",
            "avatarColor": "#64748b",
            "removable": True,
            "status": d["status"],  # 'pending' or 'accepted'
            "email": d["email"],
        })

    # Ad-hoc stakeholders (non-user participants)
    rows = conn.execute(
        "SELECT id, name, role, email, avatar_color FROM participants WHERE project_id = ?",
        (project_id,),
    ).fetchall()
    conn.close()
    for r in rows:
        p = row_to_dict(r)
        name = p["name"]
        result.append({
            "id": f"stk_{p['id']}",
            "stakeholder_id": p["id"],
            "name": name,
            "role": p["role"],
            "initials": "".join(w[0] for w in name.split()[:2]).upper() or "??",
            "avatarColor": p["avatar_color"],
            "removable": True,
            "status": "stakeholder",
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
    participant_id: str,
    user_id: int = Depends(get_current_user_id),
):
    """
    Participant IDs have prefixes in GET /participants:
      inv_<id>  → project_invitation
      stk_<id>  → participants (ad-hoc stakeholder)
      owner_<id> → cannot remove
    Plain int is accepted as legacy ad-hoc stakeholder id.
    """
    conn = get_conn()
    project = conn.execute(
        "SELECT id FROM projects WHERE id = ? AND owner_id = ?", (project_id, user_id)
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    pid = str(participant_id)
    if pid.startswith("owner_"):
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot remove project owner")
    if pid.startswith("inv_"):
        try:
            inv_id = int(pid.split("_", 1)[1])
        except (ValueError, IndexError):
            conn.close()
            raise HTTPException(status_code=422, detail="Invalid invitation id")
        conn.execute(
            "DELETE FROM project_invitations WHERE id = ? AND project_id = ?",
            (inv_id, project_id),
        )
    elif pid.startswith("stk_"):
        try:
            stk_id = int(pid.split("_", 1)[1])
        except (ValueError, IndexError):
            conn.close()
            raise HTTPException(status_code=422, detail="Invalid stakeholder id")
        conn.execute(
            "DELETE FROM participants WHERE id = ? AND project_id = ?",
            (stk_id, project_id),
        )
    else:
        # Legacy: treat as raw stakeholder id
        try:
            stk_id = int(pid)
        except ValueError:
            conn.close()
            raise HTTPException(status_code=422, detail="Invalid participant id")
        conn.execute(
            "DELETE FROM participants WHERE id = ? AND project_id = ?",
            (stk_id, project_id),
        )
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Chat attachments (files shared inside a project chat) ────────────────────

@app.post("/projects/{project_id}/messages/attachment", status_code=201)
async def upload_chat_attachment(
    project_id: int,
    file: UploadFile = File(...),
    text: Optional[str] = Form(None),
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    try:
        _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise

    user = conn.execute(
        "SELECT name, email FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    sender_name = (user["name"] or user["email"]) if user else "User"

    # Save file under uploads/chat/<project_id>/
    project_dir = os.path.join(UPLOAD_DIR, "chat", str(project_id))
    os.makedirs(project_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}_{file.filename}"
    filepath = os.path.join(project_dir, safe_name)

    content = await file.read()
    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    size = len(content)
    public_url = f"/uploads/chat/{project_id}/{safe_name}"
    body_text = (text or "").strip() or f"📎 Shared {file.filename}"

    conn.execute(
        """INSERT INTO messages
           (project_id, sender_id, sender_name, text,
            attachment_url, attachment_name, attachment_type, attachment_size)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (project_id, user_id, sender_name, body_text,
         public_url, file.filename, file.content_type, size),
    )
    conn.commit()
    mid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    created_at = conn.execute(
        "SELECT created_at FROM messages WHERE id = ?", (mid,)
    ).fetchone()[0]
    conn.close()

    payload = {
        "id": mid, "text": body_text,
        "sender_id": user_id, "sender_name": sender_name,
        "created_at": created_at,
        "attachment_url": public_url,
        "attachment_name": file.filename,
        "attachment_type": file.content_type,
        "attachment_size": size,
    }

    # Broadcast to the chat room (same format as a normal WS message)
    try:
        await manager.broadcast(str(project_id), {"type": "message", "payload": payload})
    except Exception as e:
        print(f"[Attachment] broadcast failed: {e}")

    return payload


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
        except Exception as e:
            print(f"[Meeting] LLM error: {e}")
            summary = None
    else:
        summary = None

    if summary is None:
        # Fallback summary
        summary = {
            "title": f"Meeting — {project['name']}",
            "duration_minutes": duration_min,
            "key_points": ["Meeting completed successfully."],
            "action_items": [],
            "decisions": [],
            "next_steps": "Follow up on discussed items.",
        }

    # Persist the summary so the MeetingSummary page can pull it from backend later
    try:
        import datetime as _dt
        started_iso = _dt.datetime.fromtimestamp(started_at / 1000, tz=_dt.timezone.utc).isoformat()
        ended_iso   = _dt.datetime.fromtimestamp(ended_at / 1000, tz=_dt.timezone.utc).isoformat()
        c2 = get_conn()
        c2.execute(
            """INSERT INTO meeting_summaries
               (project_id, created_by, title, duration_minutes, started_at, ended_at, payload_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (project_id, user_id, summary.get("title"), duration_min,
             started_iso, ended_iso, json.dumps(summary)),
        )
        c2.commit()
        summary["id"] = c2.execute("SELECT last_insert_rowid()").fetchone()[0]
        c2.close()
    except Exception as e:
        print(f"[Meeting] persist failed: {e}")
    return summary


# ── Contract upload → triggers RAG pipeline ───────────────────────────────────

@app.get("/projects/{project_id}/contracts")
def list_contracts(project_id: int, user_id: int = Depends(get_current_user_id)):
    """List contracts uploaded for a project. Owner + accepted invitees can read."""
    conn = get_conn()
    project = conn.execute(
        "SELECT owner_id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")
    if project["owner_id"] != user_id:
        inv = conn.execute(
            "SELECT 1 FROM project_invitations WHERE project_id = ? AND invitee_id = ? AND status = 'accepted'",
            (project_id, user_id),
        ).fetchone()
        if not inv:
            conn.close()
            raise HTTPException(status_code=403, detail="Not authorized for this project")

    rows = conn.execute(
        """SELECT id, filename, filepath, uploaded_at
           FROM contracts WHERE project_id = ?
           ORDER BY uploaded_at DESC""",
        (project_id,),
    ).fetchall()
    conn.close()
    out = []
    for r in rows:
        d = row_to_dict(r)
        basename = os.path.basename(d.get("filepath") or "")
        d["url"] = f"/uploads/{basename}" if basename else None
        out.append(d)
    return out


@app.delete("/contracts/{contract_id}")
def delete_contract(contract_id: int, user_id: int = Depends(get_current_user_id)):
    """Project owner only — delete contract file + its RAG embeddings."""
    conn = get_conn()
    row = conn.execute(
        """SELECT c.id, c.project_id, c.filepath, p.owner_id
           FROM contracts c JOIN projects p ON p.id = c.project_id
           WHERE c.id = ?""",
        (contract_id,),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Contract not found")
    if row["owner_id"] != user_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Only project owner can delete contracts")

    project_id = row["project_id"]
    filepath = row["filepath"]
    conn.execute("DELETE FROM contracts WHERE id = ?", (contract_id,))
    conn.commit()
    conn.close()

    try:
        if filepath and os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print(f"[delete_contract] failed to remove file: {e}")

    # Drop the ChromaDB collection if no other contracts remain for this project
    remaining = get_conn()
    rest = remaining.execute(
        "SELECT COUNT(*) as n FROM contracts WHERE project_id = ?", (project_id,)
    ).fetchone()["n"]
    remaining.close()
    if rest == 0:
        try:
            import chromadb
            client = chromadb.PersistentClient(path="./chroma_db")
            client.delete_collection(f"project_{project_id}_contract")
        except Exception:
            pass

    return {"ok": True}


def _extract_pdf_text(filepath: str, max_chars: int = 18000) -> str:
    """Pull plain text from a PDF, capped to keep prompt sizes reasonable."""
    try:
        import pdfplumber
        out = []
        total = 0
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                if not t:
                    continue
                out.append(t)
                total += len(t)
                if total >= max_chars:
                    break
        text = "\n\n".join(out)
        return text[:max_chars]
    except Exception as e:
        print(f"[contract summary] PDF extract failed: {e}")
        return ""


@app.get("/contracts/{contract_id}/summary")
async def contract_summary(
    contract_id: int,
    refresh: bool = False,
    user_id: int = Depends(get_current_user_id),
):
    """AI summary for a single contract. Cached on the row; pass ?refresh=true to force re-run."""
    conn = get_conn()
    row = conn.execute(
        """SELECT c.id, c.project_id, c.filename, c.filepath, c.summary_json, c.summary_at,
                  p.owner_id
           FROM contracts c JOIN projects p ON p.id = c.project_id
           WHERE c.id = ?""",
        (contract_id,),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Contract not found")
    project_id = row["project_id"]
    if row["owner_id"] != user_id:
        inv = conn.execute(
            "SELECT 1 FROM project_invitations WHERE project_id = ? AND invitee_id = ? AND status = 'accepted'",
            (project_id, user_id),
        ).fetchone()
        if not inv:
            conn.close()
            raise HTTPException(status_code=403, detail="Not authorized for this contract")

    if not refresh and row["summary_json"]:
        try:
            cached = json.loads(row["summary_json"])
            cached["cached"] = True
            cached["generated_at"] = row["summary_at"]
            conn.close()
            return cached
        except Exception:
            pass  # fall through and regenerate

    filepath = row["filepath"]
    if not filepath or not os.path.exists(filepath):
        conn.close()
        raise HTTPException(status_code=410, detail="Contract file is missing on the server")

    text = _extract_pdf_text(filepath)
    if not text.strip():
        conn.close()
        return {
            "summary": "We couldn't extract text from this PDF (it may be a scanned image).",
            "key_terms": [],
            "deliverables": [],
            "payment_terms": [],
            "deadlines": [],
            "risks": [],
            "cached": False,
        }

    openai_key = os.environ.get("OPENAI_API_KEY")
    summary_obj = None
    if openai_key:
        try:
            from openai import AsyncOpenAI
            oai = AsyncOpenAI(api_key=openai_key)
            prompt = f"""You are summarizing a freelancer-client contract / SOW.

Filename: {row['filename']}

Document text (may be truncated):
\"\"\"
{text}
\"\"\"

Return valid JSON with these fields:
- summary: 3-4 sentence plain-language overview of what this contract covers
- key_terms: array of short bullet strings (max 6) — the most important clauses
- deliverables: array of strings — work products the freelancer must produce
- payment_terms: array of strings — fees, schedule, late-payment penalties, etc.
- deadlines: array of strings — milestones, due dates, expiration
- risks: array of strings — clauses that could bite the freelancer (IP assignment, unlimited revisions, indemnification, etc.)

Be concise. If a field has nothing in the contract, return an empty array. Respond with JSON only."""
            resp = await oai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=900,
                response_format={"type": "json_object"},
            )
            summary_obj = json.loads(resp.choices[0].message.content)
        except Exception as e:
            print(f"[contract summary] LLM error: {e}")

    if summary_obj is None:
        # Fallback when no API key or LLM call fails — give a usable preview, not an error.
        preview = (text[:600] or "").strip().replace("\n", " ")
        summary_obj = {
            "summary": (
                f"AI summary unavailable (set OPENAI_API_KEY). Preview: \"{preview}…\""
                if preview else
                "AI summary unavailable (set OPENAI_API_KEY)."
            ),
            "key_terms": [],
            "deliverables": [],
            "payment_terms": [],
            "deadlines": [],
            "risks": [],
        }

    # Persist cache on the contract row
    try:
        conn.execute(
            "UPDATE contracts SET summary_json = ?, summary_at = datetime('now') WHERE id = ?",
            (json.dumps(summary_obj), contract_id),
        )
        conn.commit()
    except Exception as e:
        print(f"[contract summary] cache write failed: {e}")
    conn.close()

    summary_obj["cached"] = False
    return summary_obj


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
        global_idx = 0  # unique across the entire document
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
                            "chunk_index": global_idx,
                        })
                        global_idx += 1

        if not chunks:
            return

        client = chromadb.PersistentClient(path="./chroma_db")
        ef = embedding_functions.DefaultEmbeddingFunction()
        collection_name = f"project_{project_id}_contract"

        # Fresh ingestion per upload — drop the stale collection so old chunks don't
        # fight with new ones and old IDs can't collide.
        try:
            client.delete_collection(collection_name)
        except Exception:
            pass

        collection = client.get_or_create_collection(
            collection_name, embedding_function=ef
        )
        collection.upsert(
            ids=[f"p{project_id}_c{c['chunk_index']}" for c in chunks],
            documents=[c["text"] for c in chunks],
            metadatas=[{"page": c["page"]} for c in chunks],
        )
        print(f"[RAG] Ingested {len(chunks)} chunks for project {project_id}")
    except Exception as e:
        print(f"[RAG] Ingestion failed: {e}")

# ── Tasks ─────────────────────────────────────────────────────────────────────

def _check_project_access(conn, project_id: int, user_id: int) -> dict:
    """Return project row if user is owner or accepted invitee, else raise 403."""
    proj = conn.execute(
        "SELECT id, owner_id, name FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if proj["owner_id"] == user_id:
        return row_to_dict(proj)
    inv = conn.execute(
        "SELECT 1 FROM project_invitations WHERE project_id = ? AND invitee_id = ? AND status = 'accepted'",
        (project_id, user_id),
    ).fetchone()
    if not inv:
        raise HTTPException(status_code=403, detail="Not authorized for this project")
    return row_to_dict(proj)


@app.get("/projects/{project_id}/tasks")
def list_tasks(project_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    try:
        _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    rows = conn.execute(
        """SELECT t.id, t.title, t.description, t.status, t.assignee_id, t.due_date,
                  t.created_by, t.created_at, t.updated_at,
                  u.name as assignee_name
           FROM tasks t
           LEFT JOIN users u ON u.id = t.assignee_id
           WHERE t.project_id = ?
           ORDER BY
             CASE t.status WHEN 'in_progress' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
             COALESCE(t.due_date, '9999-12-31') ASC""",
        (project_id,),
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.post("/projects/{project_id}/tasks", status_code=201)
def create_task(
    project_id: int,
    body: TaskCreate,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    try:
        _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    if not body.title.strip():
        conn.close()
        raise HTTPException(status_code=422, detail="title is required")
    status_val = body.status if body.status in ("todo", "in_progress", "done") else "todo"
    conn.execute(
        """INSERT INTO tasks (project_id, title, description, status, assignee_id, due_date, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (project_id, body.title.strip(), body.description, status_val,
         body.assignee_id, body.due_date, user_id),
    )
    conn.commit()
    tid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (tid,)).fetchone()
    conn.close()
    return row_to_dict(row)


@app.patch("/tasks/{task_id}")
def patch_task(task_id: int, body: TaskPatch, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    task = conn.execute("SELECT id, project_id FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        _check_project_access(conn, task["project_id"], user_id)
    except HTTPException:
        conn.close(); raise
    updates = {}
    for field in ("title", "description", "status", "assignee_id", "due_date"):
        v = getattr(body, field, None)
        if v is not None:
            if field == "status" and v not in ("todo", "in_progress", "done"):
                continue
            updates[field] = v
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        set_clause += ", updated_at = datetime('now')"
        conn.execute(
            f"UPDATE tasks SET {set_clause} WHERE id = ?",
            (*updates.values(), task_id),
        )
        conn.commit()
    row = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    task = conn.execute("SELECT id, project_id FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        _check_project_access(conn, task["project_id"], user_id)
    except HTTPException:
        conn.close(); raise
    conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Time entries ──────────────────────────────────────────────────────────────

@app.get("/time-entries")
def list_time_entries(
    project_id: Optional[int] = None,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    if project_id is not None:
        try:
            _check_project_access(conn, project_id, user_id)
        except HTTPException:
            conn.close(); raise
        rows = conn.execute(
            """SELECT t.*, p.name as project_name
               FROM time_entries t
               JOIN projects p ON p.id = t.project_id
               WHERE t.project_id = ? AND t.user_id = ?
               ORDER BY t.date DESC, t.created_at DESC""",
            (project_id, user_id),
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT t.*, p.name as project_name
               FROM time_entries t
               JOIN projects p ON p.id = t.project_id
               WHERE t.user_id = ?
               ORDER BY t.date DESC, t.created_at DESC""",
            (user_id,),
        ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.post("/time-entries", status_code=201)
def create_time_entry(body: TimeEntryCreate, user_id: int = Depends(get_current_user_id)):
    if body.duration_minutes <= 0:
        raise HTTPException(status_code=422, detail="duration_minutes must be > 0")
    conn = get_conn()
    try:
        _check_project_access(conn, body.project_id, user_id)
    except HTTPException:
        conn.close(); raise
    conn.execute(
        """INSERT INTO time_entries
           (user_id, project_id, date, duration_minutes, description, billable)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (user_id, body.project_id, body.date, int(body.duration_minutes),
         body.description, int(bool(body.billable if body.billable is not None else True))),
    )
    conn.commit()
    eid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    row = conn.execute(
        """SELECT t.*, p.name as project_name FROM time_entries t
           JOIN projects p ON p.id = t.project_id WHERE t.id = ?""", (eid,),
    ).fetchone()
    conn.close()
    return row_to_dict(row)


@app.patch("/time-entries/{entry_id}")
def patch_time_entry(entry_id: int, body: TimeEntryPatch, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    e = conn.execute("SELECT id, user_id FROM time_entries WHERE id = ?", (entry_id,)).fetchone()
    if not e:
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")
    if e["user_id"] != user_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not your entry")
    updates = {}
    for field in ("date", "duration_minutes", "description"):
        v = getattr(body, field, None)
        if v is not None:
            updates[field] = v
    if body.billable is not None:
        updates["billable"] = int(bool(body.billable))
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        conn.execute(f"UPDATE time_entries SET {set_clause} WHERE id = ?", (*updates.values(), entry_id))
        conn.commit()
    row = conn.execute("SELECT * FROM time_entries WHERE id = ?", (entry_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


@app.delete("/time-entries/{entry_id}")
def delete_time_entry(entry_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    e = conn.execute("SELECT id, user_id FROM time_entries WHERE id = ?", (entry_id,)).fetchone()
    if not e:
        conn.close()
        raise HTTPException(status_code=404, detail="Entry not found")
    if e["user_id"] != user_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not your entry")
    conn.execute("DELETE FROM time_entries WHERE id = ?", (entry_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


@app.get("/time-entries/week")
def time_entries_week(user_id: int = Depends(get_current_user_id)):
    """Sum minutes per day for the trailing 7 days."""
    conn = get_conn()
    rows = conn.execute(
        """SELECT date, SUM(duration_minutes) as total_minutes
           FROM time_entries
           WHERE user_id = ? AND date >= date('now', '-7 days')
           GROUP BY date ORDER BY date DESC""",
        (user_id,),
    ).fetchall()
    total = sum(r["total_minutes"] or 0 for r in rows)
    conn.close()
    return {"days": [row_to_dict(r) for r in rows], "total_minutes": total}


# ── Decisions (chat agreements logger) ────────────────────────────────────────

@app.get("/projects/{project_id}/decisions")
def list_decisions(project_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    try:
        _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    rows = conn.execute(
        """SELECT id, project_id, message_id, decision, logged_at
           FROM scope_decisions WHERE project_id = ?
           ORDER BY logged_at DESC""",
        (project_id,),
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.post("/projects/{project_id}/decisions", status_code=201)
def create_decision(
    project_id: int,
    body: DecisionCreate,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    try:
        _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    if not body.decision.strip():
        conn.close()
        raise HTTPException(status_code=422, detail="decision is required")
    conn.execute(
        "INSERT INTO scope_decisions (project_id, message_id, decision) VALUES (?, ?, ?)",
        (project_id, body.message_id, body.decision.strip()),
    )
    conn.commit()
    did = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    row = conn.execute("SELECT * FROM scope_decisions WHERE id = ?", (did,)).fetchone()
    conn.close()
    return row_to_dict(row)


@app.delete("/decisions/{decision_id}")
def delete_decision(decision_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    row = conn.execute(
        """SELECT d.id, d.project_id FROM scope_decisions d WHERE d.id = ?""",
        (decision_id,),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Decision not found")
    try:
        _check_project_access(conn, row["project_id"], user_id)
    except HTTPException:
        conn.close(); raise
    conn.execute("DELETE FROM scope_decisions WHERE id = ?", (decision_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Invoices ──────────────────────────────────────────────────────────────────

@app.get("/invoices")
def list_invoices(user_id: int = Depends(get_current_user_id)):
    """Invoices I submitted (owner_id = me) OR invoices on projects I own
    (so clients see invoices submitted by their freelancers, and freelancers see
    their own submissions)."""
    conn = get_conn()
    rows = conn.execute(
        """SELECT i.id, i.owner_id, i.amount, i.amount_cents, i.status,
                  i.project_id, i.title, i.description, i.due_date,
                  i.issued_at, i.paid_at, i.client_email, i.notes,
                  i.attachment_url, i.attachment_name, i.attachment_type, i.attachment_size,
                  i.created_at,
                  p.name as project_name, p.client_name, p.owner_id as project_owner_id,
                  u.name as submitter_name, u.email as submitter_email
           FROM invoices i
           LEFT JOIN projects p ON p.id = i.project_id
           LEFT JOIN users u ON u.id = i.owner_id
           WHERE i.owner_id = ? OR p.owner_id = ?
           ORDER BY i.created_at DESC""",
        (user_id, user_id),
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.post("/projects/{project_id}/invoices/generate", status_code=201)
def generate_invoice(
    project_id: int,
    body: InvoiceGenerate,
    user_id: int = Depends(get_current_user_id),
):
    """Generate a draft invoice from un-invoiced billable time entries."""
    conn = get_conn()
    project = conn.execute(
        "SELECT id, name, owner_id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    # Determine which user's time entries to bill
    # If owner is freelancer → bill their own time
    # If owner is client → bill the accepted invitee's time (the freelancer they hired)
    owner_user = conn.execute(
        "SELECT id, role FROM users WHERE id = ?", (project["owner_id"],)
    ).fetchone()
    if user_id != project["owner_id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Only project owner can generate invoices")

    if owner_user["role"] == "freelancer":
        billable_user_id = project["owner_id"]
    else:
        # Client owner: use their accepted freelancer
        inv_row = conn.execute(
            """SELECT invitee_id FROM project_invitations
               WHERE project_id = ? AND status = 'accepted'
               ORDER BY responded_at DESC LIMIT 1""",
            (project_id,),
        ).fetchone()
        if not inv_row:
            conn.close()
            raise HTTPException(status_code=400, detail="No freelancer accepted on this project yet")
        billable_user_id = inv_row["invitee_id"]

    # Determine hourly rate
    rate_cents = body.hourly_rate_cents
    if not rate_cents:
        prof = _get_profile(conn, billable_user_id)
        rate_cents = prof.get("hourly_rate") or 0
    if not rate_cents:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail="No hourly rate set. Provide hourly_rate_cents or set it in your profile.",
        )

    # Pull un-invoiced billable time entries within optional period
    query = """SELECT id, duration_minutes, date, description FROM time_entries
               WHERE project_id = ? AND user_id = ? AND billable = 1 AND invoiced = 0"""
    params = [project_id, billable_user_id]
    if body.period_start:
        query += " AND date >= ?"; params.append(body.period_start)
    if body.period_end:
        query += " AND date <= ?"; params.append(body.period_end)

    entries = conn.execute(query, params).fetchall()
    if not entries:
        conn.close()
        raise HTTPException(status_code=400, detail="No un-invoiced billable time found in this range")

    total_minutes = sum(e["duration_minutes"] for e in entries)
    total_hours = total_minutes / 60
    amount_cents = round(total_hours * rate_cents)
    amount_str = f"${amount_cents / 100:,.2f}"

    inv_id = f"inv_{uuid.uuid4().hex[:10]}"
    conn.execute(
        "INSERT INTO invoices (id, project_id, owner_id, amount, status) VALUES (?, ?, ?, ?, ?)",
        (inv_id, project_id, user_id, amount_str, "draft"),
    )
    # Mark entries as invoiced
    entry_ids = [e["id"] for e in entries]
    placeholders = ",".join("?" * len(entry_ids))
    conn.execute(
        f"UPDATE time_entries SET invoiced = 1 WHERE id IN ({placeholders})",
        entry_ids,
    )
    conn.commit()
    conn.close()
    return {
        "id": inv_id,
        "amount": amount_str,
        "amount_cents": amount_cents,
        "total_minutes": total_minutes,
        "total_hours": round(total_hours, 2),
        "rate_cents": rate_cents,
        "entry_count": len(entries),
        "status": "draft",
        "project_id": project_id,
    }


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
    # Mark paid_at automatically when status flips to 'paid'
    mark_paid_now = updates.get("status") == "paid" and "paid_at" not in updates
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        params = list(updates.values())
        if mark_paid_now:
            set_clause += ", paid_at = datetime('now')"
        conn.execute(
            f"UPDATE invoices SET {set_clause} WHERE id = ?",
            (*params, invoice_id),
        )
        conn.commit()
    conn.close()
    return {"ok": True}


@app.post("/invoices", status_code=201)
def create_invoice(body: InvoiceCreate, user_id: int = Depends(get_current_user_id)):
    inv_id = f"inv_{uuid.uuid4().hex[:10]}"
    amount_str = f"${(body.amount_cents or 0) / 100:,.2f}"
    conn = get_conn()
    if body.project_id is not None:
        proj = conn.execute(
            "SELECT id FROM projects WHERE id = ? AND owner_id = ?",
            (body.project_id, user_id),
        ).fetchone()
        if not proj:
            conn.close()
            raise HTTPException(status_code=404, detail="Project not found")
    conn.execute(
        """INSERT INTO invoices
           (id, project_id, owner_id, amount, amount_cents, status,
            title, description, due_date, client_email, notes, issued_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))""",
        (inv_id, body.project_id, user_id, amount_str, body.amount_cents or 0,
         body.status or "draft", body.title, body.description,
         body.due_date, body.client_email, body.notes),
    )
    conn.commit()
    row = conn.execute(
        """SELECT i.*, p.name as project_name, p.client_name
           FROM invoices i LEFT JOIN projects p ON p.id = i.project_id
           WHERE i.id = ?""", (inv_id,),
    ).fetchone()
    conn.close()
    return row_to_dict(row)


@app.post("/projects/{project_id}/invoices", status_code=201)
async def create_project_invoice(
    project_id: int,
    amount_cents: int = Form(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    status_val: str = Form("sent", alias="status"),
    file: Optional[UploadFile] = File(None),
    user_id: int = Depends(get_current_user_id),
):
    """Create an invoice attached to a project, optionally with a file/image.
    Any project member (owner OR accepted invitee) can add — typically the
    freelancer submitting a bill. Also posts a system message to chat."""
    conn = get_conn()
    proj = conn.execute(
        "SELECT id, name, owner_id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not proj:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    authorized = proj["owner_id"] == user_id
    if not authorized:
        inv_row = conn.execute(
            "SELECT 1 FROM project_invitations WHERE project_id = ? AND invitee_id = ? AND status = 'accepted'",
            (project_id, user_id),
        ).fetchone()
        authorized = bool(inv_row)
    if not authorized:
        conn.close()
        raise HTTPException(status_code=403, detail="Not a member of this project")

    if amount_cents <= 0:
        conn.close()
        raise HTTPException(status_code=422, detail="amount_cents must be positive")

    # Save file attachment if provided
    attachment_url = None
    attachment_name = None
    attachment_type = None
    attachment_size = None
    if file is not None and file.filename:
        safe_id = uuid.uuid4().hex
        saved_name = f"inv_{project_id}_{safe_id}_{file.filename}"
        filepath = os.path.join(UPLOAD_DIR, saved_name)
        content = await file.read()
        attachment_size = len(content)
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)
        attachment_url = f"/uploads/{saved_name}"
        attachment_name = file.filename
        attachment_type = file.content_type

    inv_id = f"inv_{uuid.uuid4().hex[:10]}"
    amount_str = f"${amount_cents / 100:,.2f}"
    conn.execute(
        """INSERT INTO invoices
           (id, project_id, owner_id, amount, amount_cents, status, title, description,
            issued_at, attachment_url, attachment_name, attachment_type, attachment_size)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)""",
        (inv_id, project_id, user_id, amount_str, amount_cents, status_val,
         title, description, attachment_url, attachment_name, attachment_type, attachment_size),
    )

    # Post a chat message referencing the invoice
    me = conn.execute("SELECT name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    sender_name = (me["name"] if me else None) or (me["email"] if me else f"User {user_id}")
    msg_text = f"📄 Submitted invoice: {title or '(untitled)'} — {amount_str}"
    if description:
        msg_text += f"\n\n{description}"
    conn.execute(
        """INSERT INTO messages
           (project_id, sender_id, sender_name, text,
            attachment_url, attachment_name, attachment_type, attachment_size)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (project_id, user_id, sender_name, msg_text,
         attachment_url, attachment_name, attachment_type, attachment_size),
    )
    conn.commit()

    row = conn.execute(
        """SELECT i.*, p.name as project_name, p.client_name
           FROM invoices i LEFT JOIN projects p ON p.id = i.project_id
           WHERE i.id = ?""", (inv_id,),
    ).fetchone()
    conn.close()
    return row_to_dict(row)


@app.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: str, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    row = conn.execute(
        "SELECT id FROM invoices WHERE id = ? AND owner_id = ?", (invoice_id, user_id),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Invoice not found")
    conn.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Scope flags (persistent record of AI scope guardian alerts) ──────────────

@app.get("/projects/{project_id}/scope-flags")
def list_scope_flags(project_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    try:
        _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    rows = conn.execute(
        """SELECT id, project_id, message_id, severity, message,
                  suggested_reply, contract_clause, status, created_at
           FROM scope_flags WHERE project_id = ?
           ORDER BY created_at DESC""",
        (project_id,),
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.patch("/scope-flags/{flag_id}")
def patch_scope_flag(flag_id: int, body: ScopeFlagPatch, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    row = conn.execute("SELECT project_id FROM scope_flags WHERE id = ?", (flag_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Flag not found")
    try:
        _check_project_access(conn, row["project_id"], user_id)
    except HTTPException:
        conn.close(); raise
    if body.status not in ("open", "dismissed", "resolved"):
        conn.close()
        raise HTTPException(status_code=422, detail="Invalid status")
    conn.execute("UPDATE scope_flags SET status = ? WHERE id = ?", (body.status, flag_id))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Meetings (persistent summaries) ──────────────────────────────────────────

@app.get("/projects/{project_id}/meetings")
def list_meetings(project_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    try:
        _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    rows = conn.execute(
        """SELECT id, title, duration_minutes, started_at, ended_at, created_at
           FROM meeting_summaries WHERE project_id = ?
           ORDER BY ended_at DESC""",
        (project_id,),
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.get("/meetings/{meeting_id}")
def get_meeting(meeting_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM meeting_summaries WHERE id = ?", (meeting_id,),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Meeting not found")
    try:
        _check_project_access(conn, row["project_id"], user_id)
    except HTTPException:
        conn.close(); raise
    conn.close()
    d = row_to_dict(row)
    try:
        d["payload"] = json.loads(d.get("payload_json") or "{}")
    except Exception:
        d["payload"] = {}
    d.pop("payload_json", None)
    return d


# ── Portfolio ────────────────────────────────────────────────────────────────

@app.get("/portfolio")
def my_portfolio(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM portfolio_items WHERE user_id = ? ORDER BY created_at DESC",
        (user_id,),
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = row_to_dict(r)
        try: d["tags"] = json.loads(d.get("tags") or "[]")
        except Exception: d["tags"] = []
        result.append(d)
    return result


@app.get("/users/{target_user_id}/portfolio")
def user_portfolio(target_user_id: int):
    """Public portfolio — shows only public items. No auth required."""
    conn = get_conn()
    rows = conn.execute(
        """SELECT * FROM portfolio_items
           WHERE user_id = ? AND is_public = 1
           ORDER BY created_at DESC""",
        (target_user_id,),
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = row_to_dict(r)
        try: d["tags"] = json.loads(d.get("tags") or "[]")
        except Exception: d["tags"] = []
        result.append(d)
    return result


@app.post("/portfolio", status_code=201)
def create_portfolio_item(body: PortfolioItemCreate, user_id: int = Depends(get_current_user_id)):
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="title required")
    conn = get_conn()
    conn.execute(
        """INSERT INTO portfolio_items
           (user_id, project_id, title, summary, thumbnail_url, tags,
            testimonial, client_name, is_public)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, body.project_id, body.title.strip(), body.summary,
         body.thumbnail_url, json.dumps(body.tags or []),
         body.testimonial, body.client_name,
         int(bool(body.is_public if body.is_public is not None else True))),
    )
    conn.commit()
    pid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    row = conn.execute("SELECT * FROM portfolio_items WHERE id = ?", (pid,)).fetchone()
    conn.close()
    d = row_to_dict(row)
    try: d["tags"] = json.loads(d.get("tags") or "[]")
    except Exception: d["tags"] = []
    return d


@app.delete("/portfolio/{item_id}")
def delete_portfolio_item(item_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    row = conn.execute(
        "SELECT user_id FROM portfolio_items WHERE id = ?", (item_id,),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Item not found")
    if row["user_id"] != user_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not your item")
    conn.execute("DELETE FROM portfolio_items WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Ratings / Reputation ─────────────────────────────────────────────────────

def _aggregate_ratings(conn, uid: int) -> dict:
    row = conn.execute(
        """SELECT COUNT(*) as cnt,
                  AVG(overall) as overall,
                  AVG(asset_delivery) as asset_delivery,
                  AVG(communication) as communication,
                  AVG(scope_respect) as scope_respect,
                  AVG(payment_speed) as payment_speed
           FROM ratings WHERE ratee_id = ?""",
        (uid,),
    ).fetchone()
    if not row or not row["cnt"]:
        return {"count": 0, "overall": None, "asset_delivery": None,
                "communication": None, "scope_respect": None, "payment_speed": None}
    return {
        "count": row["cnt"],
        "overall": round(row["overall"], 2) if row["overall"] is not None else None,
        "asset_delivery": round(row["asset_delivery"], 2) if row["asset_delivery"] is not None else None,
        "communication": round(row["communication"], 2) if row["communication"] is not None else None,
        "scope_respect": round(row["scope_respect"], 2) if row["scope_respect"] is not None else None,
        "payment_speed": round(row["payment_speed"], 2) if row["payment_speed"] is not None else None,
    }


@app.post("/ratings", status_code=201)
def create_rating(body: RatingCreate, user_id: int = Depends(get_current_user_id)):
    if not (1.0 <= body.overall <= 5.0):
        raise HTTPException(status_code=422, detail="overall must be 1.0–5.0")
    if body.ratee_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot rate yourself")
    conn = get_conn()
    ratee = conn.execute("SELECT id FROM users WHERE id = ?", (body.ratee_id,)).fetchone()
    if not ratee:
        conn.close()
        raise HTTPException(status_code=404, detail="Ratee not found")
    conn.execute(
        """INSERT INTO ratings
           (rater_id, ratee_id, project_id, overall, asset_delivery,
            communication, scope_respect, payment_speed, comment)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, body.ratee_id, body.project_id, body.overall,
         body.asset_delivery, body.communication, body.scope_respect,
         body.payment_speed, body.comment),
    )
    conn.commit()
    rid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return {"id": rid, "ok": True}


@app.get("/users/{target_user_id}/reputation")
def user_reputation(target_user_id: int):
    conn = get_conn()
    agg = _aggregate_ratings(conn, target_user_id)
    conn.close()
    return agg


# ── Change orders ────────────────────────────────────────────────────────────

@app.get("/projects/{project_id}/change-orders")
def list_change_orders(project_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    try:
        _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    rows = conn.execute(
        "SELECT * FROM change_orders WHERE project_id = ? ORDER BY created_at DESC",
        (project_id,),
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.post("/projects/{project_id}/change-orders", status_code=201)
def create_change_order(
    project_id: int,
    body: ChangeOrderCreate,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    try:
        _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    if not body.title.strip():
        conn.close()
        raise HTTPException(status_code=422, detail="title required")
    conn.execute(
        """INSERT INTO change_orders
           (project_id, created_by, title, description, amount_cents, hours, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (project_id, user_id, body.title.strip(), body.description,
         body.amount_cents or 0, body.hours or 0.0,
         body.status if body.status in ("draft","sent","accepted","declined") else "draft"),
    )
    conn.commit()
    co_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    row = conn.execute("SELECT * FROM change_orders WHERE id = ?", (co_id,)).fetchone()
    conn.close()
    return row_to_dict(row)


@app.patch("/change-orders/{order_id}")
def patch_change_order(
    order_id: int,
    body: ChangeOrderPatch,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    row = conn.execute("SELECT project_id FROM change_orders WHERE id = ?", (order_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Change order not found")
    try:
        _check_project_access(conn, row["project_id"], user_id)
    except HTTPException:
        conn.close(); raise
    updates = {}
    for field in ("status", "title", "description", "amount_cents", "hours"):
        v = getattr(body, field, None)
        if v is not None:
            if field == "status" and v not in ("draft","sent","accepted","declined"):
                continue
            updates[field] = v
    if body.signed_by_client is not None:
        updates["signed_by_client"] = int(bool(body.signed_by_client))
    if updates:
        set_clause = ", ".join(f"{k} = ?" for k in updates)
        set_clause += ", updated_at = datetime('now')"
        conn.execute(
            f"UPDATE change_orders SET {set_clause} WHERE id = ?",
            (*updates.values(), order_id),
        )
        conn.commit()
    conn.close()
    return {"ok": True}


# ── User settings (rates, notifications, scope guardian, communication) ─────

@app.get("/settings")
def get_user_settings(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    row = conn.execute(
        "SELECT settings_json FROM user_settings WHERE user_id = ?", (user_id,),
    ).fetchone()
    conn.close()
    if not row:
        return {}
    try:
        return json.loads(row["settings_json"] or "{}")
    except Exception:
        return {}


@app.patch("/settings")
def patch_user_settings(body: UserSettingsPatch, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    row = conn.execute(
        "SELECT settings_json FROM user_settings WHERE user_id = ?", (user_id,),
    ).fetchone()
    existing = {}
    if row:
        try: existing = json.loads(row["settings_json"] or "{}")
        except Exception: existing = {}
    merged = {**existing, **(body.settings or {})}
    merged_json = json.dumps(merged)
    if row:
        conn.execute(
            "UPDATE user_settings SET settings_json = ?, updated_at = datetime('now') WHERE user_id = ?",
            (merged_json, user_id),
        )
    else:
        conn.execute(
            "INSERT INTO user_settings (user_id, settings_json) VALUES (?, ?)",
            (user_id, merged_json),
        )
    conn.commit()
    conn.close()
    return merged


# ── Notifications (backend-driven feed + read state) ─────────────────────────

@app.get("/notifications")
def list_notifications(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    rows = conn.execute(
        """SELECT id, kind, title, body, link, project_id, read_at, created_at
           FROM notifications WHERE user_id = ?
           ORDER BY created_at DESC LIMIT 100""",
        (user_id,),
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.post("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    row = conn.execute(
        "SELECT user_id FROM notifications WHERE id = ?", (notification_id,),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Notification not found")
    if row["user_id"] != user_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not yours")
    conn.execute(
        "UPDATE notifications SET read_at = datetime('now') WHERE id = ?",
        (notification_id,),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@app.post("/notifications/read-all")
def mark_all_notifications_read(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    conn.execute(
        """UPDATE notifications SET read_at = datetime('now')
           WHERE user_id = ? AND read_at IS NULL""",
        (user_id,),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Chat AI (Summary + Ask) ──────────────────────────────────────────────────

def _fetch_chat_transcript(conn, project_id: int, limit: int = 80) -> list[dict]:
    rows = conn.execute(
        """SELECT id, sender_name, text, created_at, attachment_name
           FROM messages
           WHERE project_id = ?
           ORDER BY created_at DESC LIMIT ?""",
        (project_id, limit),
    ).fetchall()
    return [row_to_dict(r) for r in reversed(rows)]


def _render_transcript(messages: list[dict]) -> str:
    lines = []
    for m in messages:
        when = (m.get("created_at") or "")[:16]
        sender = m.get("sender_name") or "User"
        text = (m.get("text") or "").strip()
        attach = m.get("attachment_name")
        if attach:
            text = f"{text} [attached: {attach}]" if text else f"[attached: {attach}]"
        if text:
            lines.append(f"{when}  {sender}: {text}")
    return "\n".join(lines)


@app.post("/projects/{project_id}/chat/summary")
async def chat_summary(project_id: int, user_id: int = Depends(get_current_user_id)):
    """LLM-generated summary of the current chat transcript."""
    conn = get_conn()
    try:
        project = _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    messages = _fetch_chat_transcript(conn, project_id, limit=80)
    conn.close()

    if not messages:
        return {
            "summary": "No messages to summarize yet.",
            "key_points": [], "decisions": [], "action_items": [],
            "open_questions": [], "message_count": 0,
        }

    transcript = _render_transcript(messages)
    openai_key = os.environ.get("OPENAI_API_KEY")

    if openai_key:
        try:
            from openai import AsyncOpenAI
            oai = AsyncOpenAI(api_key=openai_key)
            prompt = f"""You are summarizing a freelancer-client project chat.

Project: {project.get('name') or 'Untitled'}

Transcript (most recent last):
{transcript}

Return valid JSON with these fields:
- summary: 2-3 sentence TL;DR of what was discussed
- key_points: array of short bullet strings (max 6)
- decisions: array of explicit agreements or decisions made
- action_items: array of objects {{"text": string, "owner": string}}
- open_questions: array of unresolved questions or pending clarifications

Respond with JSON only."""
            resp = await oai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=700,
                response_format={"type": "json_object"},
            )
            data = json.loads(resp.choices[0].message.content)
            data["message_count"] = len(messages)
            return data
        except Exception as e:
            print(f"[ChatSummary] LLM error: {e}")

    # Fallback — simple heuristic summary (first + last message + counts)
    first = messages[0]
    last = messages[-1]
    participants = sorted({m.get("sender_name") for m in messages if m.get("sender_name")})
    return {
        "summary": (
            f"{len(messages)} messages between {', '.join(participants)}. "
            f"Conversation started with \"{(first.get('text') or '')[:120]}\" "
            f"and most recent message was \"{(last.get('text') or '')[:120]}\". "
            "(Set OPENAI_API_KEY for an AI-powered summary.)"
        ),
        "key_points": [],
        "decisions": [],
        "action_items": [],
        "open_questions": [],
        "message_count": len(messages),
        "participants": participants,
    }


@app.post("/projects/{project_id}/chat/ask")
async def chat_ask(
    project_id: int,
    body: ChatAskRequest,
    user_id: int = Depends(get_current_user_id),
):
    """Answer a user question using the chat history + (optional) contract RAG as context."""
    question = (body.question or "").strip()
    if not question:
        raise HTTPException(status_code=422, detail="question is required")

    conn = get_conn()
    try:
        project = _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    messages = _fetch_chat_transcript(conn, project_id, limit=120)
    conn.close()

    transcript = _render_transcript(messages)

    # Best-effort RAG: pull the 3 most relevant contract clauses if a contract was uploaded.
    contract_context = ""
    try:
        import chromadb
        from chromadb.utils import embedding_functions
        cclient = chromadb.PersistentClient(path="./chroma_db")
        ef = embedding_functions.DefaultEmbeddingFunction()
        try:
            col = cclient.get_collection(f"project_{project_id}_contract", embedding_function=ef)
            results = col.query(query_texts=[question], n_results=3)
            docs = (results.get("documents") or [[]])[0]
            if docs:
                contract_context = "\n---\n".join(docs)
        except Exception:
            pass
    except Exception:
        pass

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            from openai import AsyncOpenAI
            oai = AsyncOpenAI(api_key=openai_key)
            system = """You are a helpful AI assistant embedded inside a freelancer-client project workspace.

You can answer ANY question the user asks — including general questions, brainstorming,
creative ideas, technical help, strategy, writing, and anything else. You are not limited
to the project context.

When the user's question IS about this project (what was agreed, open questions, deadlines,
scope, contract clauses), use the project transcript and contract clauses provided below as
your primary source. Cite specifics when you reference them.

When the question is general (ideas, how-to, opinions, brainstorming, unrelated topics),
just answer directly as a knowledgeable assistant — you don't need to tie the answer to the
project. If the project context happens to be relevant, you may weave it in, but don't force
it.

Be conversational and useful. Default to 2-5 sentences; go longer if the user asks for
depth, a list, or a plan. Use markdown (bullets, bold) when it genuinely helps readability."""
            contract_block = (
                f"Relevant contract clauses:\n{contract_context}\n\n"
                if contract_context else ""
            )
            user_prompt = (
                f"Project: {project.get('name') or 'Untitled'}\n\n"
                f"Chat transcript (use only if relevant to the question):\n{transcript or '(no messages)'}\n\n"
                f"{contract_block}"
                f"User question: {question}"
            )
            resp = await oai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=1200,
            )
            answer = resp.choices[0].message.content
            return {
                "answer": answer,
                "used_messages": len(messages),
                "used_contract": bool(contract_context),
            }
        except Exception as e:
            print(f"[ChatAsk] LLM error: {e}")

    # Fallback — no LLM available, so limited to transcript keyword search
    q_lower = question.lower()
    hits = [m for m in messages if q_lower in (m.get("text") or "").lower()][:3]
    if hits:
        snippet = " / ".join((h.get("text") or "")[:120] for h in hits)
        answer = (
            f"(AI not configured — keyword match) Found {len(hits)} related message(s): "
            f"{snippet}"
        )
    else:
        answer = (
            "(AI not configured) I can only answer general questions with AI enabled. "
            "Set OPENAI_API_KEY on the backend to unlock full answers."
        )
    return {"answer": answer, "used_messages": len(messages), "used_contract": False}


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


def _profile_to_embedding_text(user_row: dict, profile: dict) -> str:
    """Compose a single text blob describing a user for embedding."""
    parts = []
    role = user_row.get("role") or "user"
    parts.append(f"Role: {role}.")
    name = user_row.get("name") or user_row.get("email") or ""
    if name: parts.append(f"Name: {name}.")
    if profile.get("specialty"): parts.append(f"Specialty: {profile['specialty']}.")
    if profile.get("bio"): parts.append(f"Bio: {profile['bio']}")
    if profile.get("location"): parts.append(f"Location: {profile['location']}.")
    skills = profile.get("skills") or []
    if skills: parts.append(f"Skills: {', '.join(skills)}.")
    req = profile.get("required_skills") or []
    if req: parts.append(f"Looking for skills: {', '.join(req)}.")
    if profile.get("project_title"): parts.append(f"Project: {profile['project_title']}.")
    if profile.get("project_summary"): parts.append(f"Project description: {profile['project_summary']}")
    if profile.get("hourly_rate"):
        parts.append(f"Hourly rate: ${profile['hourly_rate']/100:.0f}/hr.")
    if profile.get("budget_min") or profile.get("budget_max"):
        parts.append(
            f"Budget: ${(profile.get('budget_min') or 0)/100:.0f}–${(profile.get('budget_max') or 0)/100:.0f}."
        )
    return " ".join(parts)


def _upsert_profile_embedding(user_id: int):
    """Push user profile text into ChromaDB collection 'user_profiles'."""
    try:
        import chromadb
        from chromadb.utils import embedding_functions

        conn = get_conn()
        u = conn.execute("SELECT id, name, email, role FROM users WHERE id = ?", (user_id,)).fetchone()
        if not u:
            conn.close()
            return
        profile = _get_profile(conn, user_id)
        conn.close()

        text = _profile_to_embedding_text(row_to_dict(u), profile)
        if not text.strip():
            return

        client = chromadb.PersistentClient(path="./chroma_db")
        ef = embedding_functions.DefaultEmbeddingFunction()
        col = client.get_or_create_collection("user_profiles", embedding_function=ef)
        col.upsert(
            ids=[f"user_{user_id}"],
            documents=[text],
            metadatas=[{"user_id": user_id, "role": u["role"] or "freelancer"}],
        )
    except Exception as e:
        print(f"[Embeddings] upsert failed for user {user_id}: {e}")


def _embedding_match_scores(user_id: int, target_role: str) -> dict:
    """Return {target_user_id: similarity_0_to_100} for users of `target_role`."""
    try:
        import chromadb
        from chromadb.utils import embedding_functions

        client = chromadb.PersistentClient(path="./chroma_db")
        ef = embedding_functions.DefaultEmbeddingFunction()
        col = client.get_or_create_collection("user_profiles", embedding_function=ef)

        # Make sure my own profile is in the collection
        _upsert_profile_embedding(user_id)

        my = col.get(ids=[f"user_{user_id}"], include=["embeddings"])
        my_embs = my.get("embeddings")
        if my_embs is None or len(my_embs) == 0:
            return {}
        my_emb = my_embs[0]
        # Convert numpy → list if needed
        try:
            my_emb = my_emb.tolist()
        except AttributeError:
            pass

        results = col.query(
            query_embeddings=[my_emb],
            where={"role": target_role},
            n_results=50,
        )
        scores = {}
        ids = results.get("ids", [[]])[0]
        dists = results.get("distances", [[]])[0]
        for i, raw_id in enumerate(ids):
            if not raw_id.startswith("user_"):
                continue
            try:
                uid = int(raw_id.split("_", 1)[1])
            except ValueError:
                continue
            if uid == user_id:
                continue
            d = dists[i] if i < len(dists) else 1.0
            # Cosine distance ~ [0, 2]; closer is better. Convert to 0-100.
            sim = max(0.0, 1.0 - (d / 2.0))
            scores[uid] = round(sim * 100)
        return scores
    except Exception as e:
        print(f"[Embeddings] match query failed: {e}")
        return {}


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

    # Push updated profile into vector DB (best-effort; never blocks)
    try:
        _upsert_profile_embedding(user_id)
    except Exception as e:
        print(f"[Embeddings] could not embed profile {user_id}: {e}")

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


# ── Interests ─────────────────────────────────────────────────────────────────

def _user_snapshot(conn, uid: int) -> dict:
    """Return a public-profile snapshot for a user (used in interests/invitations responses)."""
    u = conn.execute(
        "SELECT id, name, email, role FROM users WHERE id = ?", (uid,)
    ).fetchone()
    if not u:
        return None
    profile = _get_profile(conn, uid)
    return {
        "id": u["id"],
        "name": u["name"] or u["email"],
        "email": u["email"],
        "role": u["role"],
        "skills": profile.get("skills") or [],
        "hourly_rate": profile.get("hourly_rate") or 0,
        "available": bool(profile.get("available", 1)),
        "available_from": profile.get("available_from"),
        "bio": profile.get("bio"),
        "specialty": profile.get("specialty"),
        "location": profile.get("location"),
        "project_title": profile.get("project_title"),
        "project_summary": profile.get("project_summary"),
        "budget_min": profile.get("budget_min") or 0,
        "budget_max": profile.get("budget_max") or 0,
    }


@app.get("/interests")
def list_interests(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    rows = conn.execute(
        """SELECT target_user_id, created_at FROM user_interests
           WHERE user_id = ? ORDER BY created_at DESC""",
        (user_id,),
    ).fetchall()
    result = []
    for r in rows:
        snap = _user_snapshot(conn, r["target_user_id"])
        if snap:
            snap["interested_at"] = r["created_at"]
            result.append(snap)
    conn.close()
    return result


@app.post("/interests/{target_user_id}", status_code=201)
def add_interest(target_user_id: int, user_id: int = Depends(get_current_user_id)):
    if target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    conn = get_conn()
    exists = conn.execute(
        "SELECT 1 FROM users WHERE id = ?", (target_user_id,)
    ).fetchone()
    if not exists:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    conn.execute(
        """INSERT OR IGNORE INTO user_interests (user_id, target_user_id)
           VALUES (?, ?)""",
        (user_id, target_user_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


@app.delete("/interests/{target_user_id}")
def remove_interest(target_user_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    conn.execute(
        "DELETE FROM user_interests WHERE user_id = ? AND target_user_id = ?",
        (user_id, target_user_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


# ── Project Invitations ───────────────────────────────────────────────────────

@app.post("/projects/{project_id}/invitations", status_code=201)
def create_invitation(
    project_id: int,
    body: InvitationCreate,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    me = conn.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
    if not me or me["role"] != "client":
        conn.close()
        raise HTTPException(status_code=403, detail="Only clients can send project invitations")

    project = conn.execute(
        "SELECT id, name, owner_id FROM projects WHERE id = ? AND owner_id = ?",
        (project_id, user_id),
    ).fetchone()
    if not project:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    if body.invitee_id == user_id:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot invite yourself")

    invitee = conn.execute(
        "SELECT id, name, email, role FROM users WHERE id = ?", (body.invitee_id,)
    ).fetchone()
    if not invitee:
        conn.close()
        raise HTTPException(status_code=404, detail="Invitee not found")
    if invitee["role"] != "freelancer":
        conn.close()
        raise HTTPException(status_code=400, detail="Can only invite freelancers")

    # Check existing invitation
    existing = conn.execute(
        "SELECT id, status FROM project_invitations WHERE project_id = ? AND invitee_id = ?",
        (project_id, body.invitee_id),
    ).fetchone()
    if existing:
        conn.close()
        raise HTTPException(
            status_code=409,
            detail=f"Invitation already exists (status: {existing['status']})",
        )

    conn.execute(
        """INSERT INTO project_invitations (project_id, inviter_id, invitee_id, message)
           VALUES (?, ?, ?, ?)""",
        (project_id, user_id, body.invitee_id, body.message),
    )
    conn.commit()
    inv_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    return {
        "id": inv_id,
        "project_id": project_id,
        "invitee_id": body.invitee_id,
        "status": "pending",
        "invitee_name": invitee["name"] or invitee["email"],
    }


@app.get("/projects/{project_id}/invitations")
def list_project_invitations(
    project_id: int,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_conn()
    project = conn.execute(
        "SELECT id, owner_id FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project or project["owner_id"] != user_id:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")

    rows = conn.execute(
        """SELECT i.id, i.status, i.message, i.created_at, i.responded_at,
                  u.id as invitee_id, u.name as invitee_name, u.email as invitee_email
           FROM project_invitations i
           JOIN users u ON u.id = i.invitee_id
           WHERE i.project_id = ?
           ORDER BY i.created_at DESC""",
        (project_id,),
    ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.get("/invitations")
def list_my_invitations(user_id: int = Depends(get_current_user_id)):
    """Invitations where I am the invitee (for freelancer inbox)."""
    conn = get_conn()
    rows = conn.execute(
        """SELECT i.id, i.status, i.message, i.created_at, i.responded_at,
                  p.id as project_id, p.name as project_name, p.client_name,
                  p.description, p.budget_min, p.budget_max, p.required_skills,
                  p.timeline_weeks,
                  inviter.id as inviter_id, inviter.name as inviter_name,
                  inviter.email as inviter_email
           FROM project_invitations i
           JOIN projects p ON p.id = i.project_id
           JOIN users inviter ON inviter.id = i.inviter_id
           WHERE i.invitee_id = ?
           ORDER BY i.created_at DESC""",
        (user_id,),
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = row_to_dict(r)
        try:
            d["required_skills"] = json.loads(d.get("required_skills") or "[]")
        except Exception:
            d["required_skills"] = []
        result.append(d)
    return result


@app.patch("/invitations/{invitation_id}")
def respond_to_invitation(
    invitation_id: int,
    body: InvitationPatch,
    user_id: int = Depends(get_current_user_id),
):
    if body.status not in ("accepted", "declined"):
        raise HTTPException(status_code=422, detail="status must be 'accepted' or 'declined'")
    conn = get_conn()
    inv = conn.execute(
        "SELECT id, invitee_id, status, project_id FROM project_invitations WHERE id = ?",
        (invitation_id,),
    ).fetchone()
    if not inv:
        conn.close()
        raise HTTPException(status_code=404, detail="Invitation not found")
    if inv["invitee_id"] != user_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not your invitation")
    if inv["status"] != "pending":
        conn.close()
        raise HTTPException(status_code=400, detail=f"Already {inv['status']}")

    conn.execute(
        "UPDATE project_invitations SET status = ?, responded_at = datetime('now') WHERE id = ?",
        (body.status, invitation_id),
    )

    if body.status == "accepted":
        # Add the freelancer to the project participants (if not already) so they show
        # in the chat sidebar, and post a system message announcing they joined.
        me = conn.execute(
            "SELECT name, email FROM users WHERE id = ?", (user_id,),
        ).fetchone()
        display_name = (me["name"] if me else None) or (me["email"] if me else f"User {user_id}")

        already = conn.execute(
            "SELECT 1 FROM participants WHERE project_id = ? AND email = ?",
            (inv["project_id"], me["email"] if me else None),
        ).fetchone() if me else None
        if not already:
            conn.execute(
                """INSERT INTO participants (project_id, name, role, email, avatar_color, removable)
                   VALUES (?, ?, 'Freelancer', ?, '#1d6ecd', 0)""",
                (inv["project_id"], display_name, me["email"] if me else None),
            )
        conn.execute(
            "INSERT INTO messages (project_id, sender_id, sender_name, text) VALUES (?, ?, ?, ?)",
            (
                inv["project_id"],
                user_id,
                display_name,
                f"{display_name} accepted the invitation and joined the project.",
            ),
        )

    conn.commit()
    conn.close()
    return {"ok": True, "status": body.status, "project_id": inv["project_id"]}


@app.delete("/invitations/{invitation_id}")
def cancel_invitation(
    invitation_id: int,
    user_id: int = Depends(get_current_user_id),
):
    """Inviter (project owner) cancels a pending invitation."""
    conn = get_conn()
    inv = conn.execute(
        """SELECT i.id, i.inviter_id, i.status, i.project_id
           FROM project_invitations i WHERE i.id = ?""",
        (invitation_id,),
    ).fetchone()
    if not inv:
        conn.close()
        raise HTTPException(status_code=404, detail="Invitation not found")
    if inv["inviter_id"] != user_id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not your invitation to cancel")
    conn.execute("DELETE FROM project_invitations WHERE id = ?", (invitation_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


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

    # Who have I already marked as interested?
    interest_rows = conn.execute(
        "SELECT target_user_id FROM user_interests WHERE user_id = ?", (user_id,)
    ).fetchall()
    interest_set = {r["target_user_id"] for r in interest_rows}

    # Embedding-based similarity scores (best-effort)
    embedding_scores = _embedding_match_scores(user_id, opposite_role)

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

        # Hybrid: blend rule-based overall with embedding similarity
        emb_sim = embedding_scores.get(other["id"])
        if emb_sim is not None:
            blended = round(scores["overall"] * 0.65 + emb_sim * 0.35)
            scores["overall"] = blended
            scores["embedding"] = emb_sim
        else:
            scores["embedding"] = None

        # Skip very poor matches (overall < 20)
        if scores["overall"] < 20:
            continue

        results.append({
            "id":            f"match_{user_id}_{other['id']}",
            "userId":        other["id"],
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
                "embedding":     scores["embedding"],
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
            "interested":     other["id"] in interest_set,
        })

    conn.close()

    # Sort by overall score descending
    results.sort(key=lambda x: x["overallScore"], reverse=True)
    return results


# ── Dashboard Summary ──────────────────────────────────────────────────────────

@app.get("/dashboard/summary")
def dashboard_summary(user_id: int = Depends(get_current_user_id)):
    conn = get_conn()

    # Projects — owned OR projects the user has been accepted onto as a participant
    # (freelancers don't own projects, so an owner-only query left their dashboard empty).
    proj_rows = conn.execute(
        """SELECT DISTINCT p.id, p.name, p.client_name, p.status, p.created_at
           FROM projects p
           LEFT JOIN project_invitations i
             ON i.project_id = p.id AND i.invitee_id = ? AND i.status = 'accepted'
           WHERE p.owner_id = ? OR i.id IS NOT NULL""",
        (user_id, user_id),
    ).fetchall()
    projects = [row_to_dict(r) for r in proj_rows]

    # Invoices
    inv_rows = conn.execute(
        "SELECT id, amount, status, project_id, created_at FROM invoices WHERE owner_id = ?",
        (user_id,),
    ).fetchall()
    invoices = [row_to_dict(r) for r in inv_rows]

    # Unread messages: count messages from others AFTER the user's last-read timestamp
    # for each project. Falls back to "count all from others" when no read marker exists.
    unread_count = 0
    for p in projects:
        mr = conn.execute(
            "SELECT last_read_at FROM message_reads WHERE project_id = ? AND user_id = ?",
            (p["id"], user_id),
        ).fetchone()
        if mr and mr["last_read_at"]:
            row = conn.execute(
                """SELECT COUNT(*) as cnt FROM messages
                   WHERE project_id = ? AND sender_id != ? AND created_at > ?""",
                (p["id"], user_id, mr["last_read_at"]),
            ).fetchone()
        else:
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

ONBOARDING_SYSTEM_FREELANCER = """You are an AI onboarding assistant for Scout, a platform that connects
freelancers with clients. Gather the freelancer's profile through friendly, brief, one-question-at-a-time
conversation. Aim to learn: their main specialty (e.g. Brand Design, Frontend Engineering),
their top skills/tools, their hourly rate (USD), their general availability, and a 1-2 sentence bio.
Whenever the user gives information, extract structured fields and call save_profile with what you've
learned so far. Keep replies under 2 sentences. Once you have specialty + skills + rate + bio, congratulate
them and tell them their profile is ready."""

ONBOARDING_SYSTEM_CLIENT = """You are an AI onboarding assistant for Scout, a platform that connects
freelancers with clients. Gather the client's project profile through friendly, brief, one-question-at-a-time
conversation. Aim to learn: their project title, project description, required skills, total budget range
(min and max in USD), and timeline (in weeks). Whenever the user gives information, extract structured
fields and call save_profile with what you've learned so far. Keep replies under 2 sentences. Once you
have title + description + budget + skills, congratulate them and tell them their project is ready to match."""

PROFILE_EXTRACTION_TOOL = {
    "type": "function",
    "function": {
        "name": "save_profile",
        "description": "Persist any profile fields you have learned about the user from this conversation.",
        "parameters": {
            "type": "object",
            "properties": {
                "specialty":     {"type": "string", "description": "Freelancer specialty/role"},
                "skills":        {"type": "array",  "items": {"type": "string"}, "description": "Freelancer skills or client required skills"},
                "hourly_rate_usd": {"type": "number", "description": "Freelancer hourly rate in USD"},
                "available":     {"type": "boolean", "description": "Freelancer currently available"},
                "bio":           {"type": "string"},
                "location":      {"type": "string"},
                "project_title": {"type": "string", "description": "Client project title"},
                "project_summary": {"type": "string"},
                "budget_min_usd":  {"type": "number"},
                "budget_max_usd":  {"type": "number"},
                "timeline_weeks":  {"type": "integer"},
            },
        },
    },
}


def _apply_profile_args(user_id: int, role: str, args: dict):
    """Map LLM-extracted args onto user_profiles columns."""
    if not args:
        return
    patch = {}
    if "specialty" in args:    patch["specialty"]    = args["specialty"]
    if "bio" in args:          patch["bio"]          = args["bio"]
    if "location" in args:     patch["location"]     = args["location"]
    if "available" in args:    patch["available"]    = int(bool(args["available"]))
    if "hourly_rate_usd" in args:
        patch["hourly_rate"] = int(round(float(args["hourly_rate_usd"]) * 100))
    if "skills" in args and isinstance(args["skills"], list):
        if role == "client":
            patch["required_skills"] = json.dumps([str(s) for s in args["skills"]])
        else:
            patch["skills"] = json.dumps([str(s) for s in args["skills"]])
    if "project_title" in args:    patch["project_title"]   = args["project_title"]
    if "project_summary" in args:  patch["project_summary"] = args["project_summary"]
    if "budget_min_usd" in args:
        patch["budget_min"] = int(round(float(args["budget_min_usd"]) * 100))
    if "budget_max_usd" in args:
        patch["budget_max"] = int(round(float(args["budget_max_usd"]) * 100))

    if not patch:
        return

    conn = get_conn()
    existing = conn.execute(
        "SELECT user_id FROM user_profiles WHERE user_id = ?", (user_id,)
    ).fetchone()
    if existing:
        set_clause = ", ".join(f"{k} = ?" for k in patch)
        set_clause += ", updated_at = datetime('now')"
        conn.execute(
            f"UPDATE user_profiles SET {set_clause} WHERE user_id = ?",
            (*patch.values(), user_id),
        )
    else:
        cols = ", ".join(["user_id"] + list(patch.keys()))
        placeholders = ", ".join(["?"] * (1 + len(patch)))
        conn.execute(
            f"INSERT INTO user_profiles ({cols}) VALUES ({placeholders})",
            (user_id, *patch.values()),
        )
    conn.commit()
    conn.close()

    # Re-embed
    try:
        _upsert_profile_embedding(user_id)
    except Exception:
        pass


@app.post("/onboarding/message")
async def onboarding_message(
    body: OnboardingMessage,
    user_id: int = Depends(get_current_user_id),
):
    # Determine user role
    conn = get_conn()
    me = conn.execute("SELECT id, role FROM users WHERE id = ?", (user_id,)).fetchone()
    role = me["role"] if me else "freelancer"

    # Pull recent onboarding history (last 12 turns) so the LLM has context
    history_rows = conn.execute(
        """SELECT message, reply FROM onboarding_sessions
           WHERE user_id = ? ORDER BY id DESC LIMIT 12""",
        (user_id,),
    ).fetchall()
    conn.close()

    history_msgs = []
    for row in reversed(history_rows):
        history_msgs.append({"role": "user", "content": row["message"]})
        history_msgs.append({"role": "assistant", "content": row["reply"]})

    system_prompt = ONBOARDING_SYSTEM_CLIENT if role == "client" else ONBOARDING_SYSTEM_FREELANCER
    extracted_fields = {}
    reply = None

    openai_key = os.environ.get("OPENAI_API_KEY")
    if openai_key:
        try:
            from openai import AsyncOpenAI
            oai = AsyncOpenAI(api_key=openai_key)
            messages = (
                [{"role": "system", "content": system_prompt}]
                + history_msgs
                + [{"role": "user", "content": body.message}]
            )
            resp = await oai.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=[PROFILE_EXTRACTION_TOOL],
                max_tokens=300,
            )
            choice = resp.choices[0].message
            # Handle tool calls (may be 0..n)
            for tc in (choice.tool_calls or []):
                if tc.function and tc.function.name == "save_profile":
                    try:
                        args = json.loads(tc.function.arguments or "{}")
                        extracted_fields.update(args)
                        _apply_profile_args(user_id, role, args)
                    except Exception as e:
                        print(f"[Onboarding] tool-call parse error: {e}")
            # If the model only called a tool and didn't speak, ask for follow-up
            if choice.content:
                reply = choice.content
            else:
                follow = await oai.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages + [
                        {"role": "assistant", "content": "(profile updated — what should I ask next?)"},
                    ],
                    max_tokens=180,
                )
                reply = follow.choices[0].message.content or "Got it — what else should I know?"
        except Exception as e:
            reply = f"(LLM error: {e}) Echo: {body.message}"

    if reply is None:
        reply = (
            f"(No OPENAI_API_KEY set — echo mode) You said: \"{body.message}\". "
            "Set OPENAI_API_KEY in your environment to enable real AI responses."
        )

    conn = get_conn()
    conn.execute(
        "INSERT INTO onboarding_sessions (user_id, role, message, reply) VALUES (?, ?, ?, ?)",
        (user_id, role, body.message, reply),
    )
    conn.commit()
    conn.close()
    return {"reply": reply, "extracted": extracted_fields}

# ── Message read-state (unread badges) ───────────────────────────────────────

@app.get("/unread-counts")
def unread_counts(user_id: int = Depends(get_current_user_id)):
    """
    Return { project_id: unread_count, _total: N } for projects the user can access.
    Unread = messages sent by others after the user's last_read_at for that project.
    """
    conn = get_conn()
    # All projects user can see (owner or accepted invitee)
    rows = conn.execute(
        """SELECT DISTINCT p.id FROM projects p
           LEFT JOIN project_invitations i
             ON i.project_id = p.id AND i.invitee_id = ? AND i.status = 'accepted'
           WHERE p.owner_id = ? OR i.id IS NOT NULL""",
        (user_id, user_id),
    ).fetchall()
    per_project = {}
    total = 0
    for r in rows:
        pid = r["id"]
        last_read_row = conn.execute(
            "SELECT last_read_at FROM message_reads WHERE project_id = ? AND user_id = ?",
            (pid, user_id),
        ).fetchone()
        last_read = last_read_row["last_read_at"] if last_read_row else "1970-01-01 00:00:00"
        cnt_row = conn.execute(
            """SELECT COUNT(*) as cnt FROM messages
               WHERE project_id = ? AND sender_id != ? AND created_at > ?""",
            (pid, user_id, last_read),
        ).fetchone()
        cnt = cnt_row["cnt"] if cnt_row else 0
        per_project[str(pid)] = cnt
        total += cnt
    conn.close()
    per_project["_total"] = total
    return per_project


@app.post("/projects/{project_id}/read")
def mark_project_read(project_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    try:
        _check_project_access(conn, project_id, user_id)
    except HTTPException:
        conn.close(); raise
    # Use sub-second resolution so a mark-read won't tie with a message created in the same second.
    conn.execute(
        """INSERT INTO message_reads (project_id, user_id, last_read_at)
           VALUES (?, ?, strftime('%Y-%m-%d %H:%M:%f', 'now'))
           ON CONFLICT(project_id, user_id) DO UPDATE SET
             last_read_at = strftime('%Y-%m-%d %H:%M:%f', 'now')""",
        (project_id, user_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}


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

    # Authorize: must be project owner OR accepted invitee
    try:
        pid_int = int(project_id)
    except (TypeError, ValueError):
        pid_int = None
    if pid_int is not None:
        _c = get_conn()
        proj = _c.execute(
            "SELECT owner_id FROM projects WHERE id = ?", (pid_int,)
        ).fetchone()
        authorized = False
        if proj and proj["owner_id"] == user_id:
            authorized = True
        else:
            inv = _c.execute(
                "SELECT status FROM project_invitations WHERE project_id = ? AND invitee_id = ?",
                (pid_int, user_id),
            ).fetchone()
            if inv and inv["status"] == "accepted":
                authorized = True
        _c.close()
        if not authorized:
            await websocket.close(code=4003)
            return

    await websocket.accept()
    manager.join(project_id, websocket, user_id, user_name)

    # Send chat history
    conn = get_conn()
    rows = conn.execute(
        """SELECT m.id, m.text, m.sender_id, m.sender_name, m.created_at,
                  m.attachment_url, m.attachment_name, m.attachment_type, m.attachment_size
           FROM messages m
           WHERE m.project_id = ?
           ORDER BY m.created_at ASC
           LIMIT 200""",
        (project_id,),
    ).fetchall()
    conn.close()
    try:
        await websocket.send_text(json.dumps({
            "type": "history",
            "payload": [row_to_dict(r) for r in rows],
        }))
    except (WebSocketDisconnect, RuntimeError):
        # Client hung up before history finished sending — clean up and bail
        manager.leave(project_id, websocket)
        return

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
            flag_msg = result.get("message", "Possible scope creep detected.")
            suggested_reply = result.get("suggested_reply")
            contract_clause = result.get("contract_clause")

            # Persist the flag so it shows up in Scope Drift Report later
            try:
                pid_int = int(project_id)
                _c = get_conn()
                _c.execute(
                    """INSERT INTO scope_flags
                       (project_id, message_id, severity, message, suggested_reply, contract_clause)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (pid_int, msg_id, "MEDIUM", flag_msg, suggested_reply, contract_clause),
                )
                _c.commit()
                flag_id = _c.execute("SELECT last_insert_rowid()").fetchone()[0]
                _c.close()
            except Exception as e:
                print(f"[ScopeGuardian] persist failed: {e}")
                flag_id = None

            alert = {
                "id": f"scope_{flag_id or msg_id}_{uuid.uuid4().hex[:6]}",
                "flag_id": flag_id,
                "after_message_id": msg_id,
                "message": flag_msg,
                "suggested_reply": suggested_reply,
                "contract_clause": contract_clause,
            }
            try:
                await sender_ws.send_text(json.dumps({"type": "scope_alert", "payload": alert}))
            except Exception:
                pass
    except Exception as e:
        print(f"[ScopeGuardian] Error: {e}")
