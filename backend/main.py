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

def init_chroma():
    """Create the shared profiles ChromaDB collection if it doesn't exist."""
    import chromadb
    from chromadb.utils import embedding_functions
    client = chromadb.PersistentClient(path="./chroma_db")
    ef = embedding_functions.DefaultEmbeddingFunction()
    client.get_or_create_collection("profiles", embedding_function=ef)
    print("[ChromaDB] profiles collection ready")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_chroma()
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

class OnboardingMessage(BaseModel):
    message: str

class InvoicePatch(BaseModel):
    status: Optional[str] = None
    amount: Optional[str] = None

class FreelancerProfileIn(BaseModel):
    skills: Optional[list[str]] = None
    hourly_rate: Optional[float] = None
    availability: Optional[str] = None   # "full-time" | "part-time" | "project-based"
    experience_years: Optional[int] = None
    bio: Optional[str] = None
    portfolio_url: Optional[str] = None
    location: Optional[str] = None

class ClientProfileIn(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    project_description: Optional[str] = None
    required_skills: Optional[list[str]] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    timeline: Optional[str] = None       # "1-2 weeks" | "1 month" | "3+ months"
    team_size: Optional[int] = None
    location: Optional[str] = None

class MatchPatch(BaseModel):
    status: str  # "accepted" | "rejected"

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
def register(body: AuthRequest):
    conn = get_conn()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(body.password) < 8:
        conn.close()
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    conn.execute(
        "INSERT INTO users (email, hashed_pw) VALUES (?, ?)",
        (body.email, hash_password(body.password)),
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
    return {"id": user["id"], "email": user["email"], "name": user["name"] or user["email"]}

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

@app.post("/onboarding/extract-profile")
async def extract_profile_from_onboarding(user_id: int = Depends(get_current_user_id)):
    """
    Read the current user's onboarding conversation, use GPT to extract structured
    profile fields, then upsert the profile (SQLite + ChromaDB embedding).
    """
    user = get_user_by_id(user_id)
    role = user["role"]

    conn = get_conn()
    rows = conn.execute(
        "SELECT message, reply FROM onboarding_sessions WHERE user_id = ? ORDER BY created_at ASC",
        (user_id,),
    ).fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=400, detail="No onboarding conversation found")

    # Build conversation transcript
    transcript_parts = []
    for r in rows:
        transcript_parts.append(f"User: {r['message']}")
        transcript_parts.append(f"Assistant: {r['reply']}")
    transcript = "\n".join(transcript_parts)

    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not set")

    if role == "freelancer":
        schema_hint = """{
  "skills": ["list", "of", "skills"],
  "hourly_rate": 0.0,
  "availability": "full-time|part-time|project-based",
  "experience_years": 0,
  "bio": "short bio",
  "portfolio_url": "url or null",
  "location": "city or null"
}"""
    else:
        schema_hint = """{
  "company_name": "name or null",
  "industry": "industry or null",
  "project_description": "description",
  "required_skills": ["list", "of", "skills"],
  "budget_min": 0.0,
  "budget_max": 0.0,
  "timeline": "1-2 weeks|1 month|3+ months or null",
  "team_size": 0,
  "location": "city or null"
}"""

    prompt = f"""Extract structured profile data for a {role} from the following onboarding conversation.
Return ONLY valid JSON matching the schema below. Use null for any field not mentioned.

Schema:
{schema_hint}

Conversation:
{transcript}"""

    try:
        from openai import AsyncOpenAI
        oai = AsyncOpenAI(api_key=openai_key)
        resp = await oai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=512,
            response_format={"type": "json_object"},
        )
        extracted = json.loads(resp.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM extraction failed: {e}")

    # Upsert via the same logic as the profile endpoints
    if role == "freelancer":
        profile_body = FreelancerProfileIn(**{
            k: extracted.get(k) for k in FreelancerProfileIn.model_fields
        })
        upsert_freelancer_profile(profile_body, user_id)
    else:
        profile_body = ClientProfileIn(**{
            k: extracted.get(k) for k in ClientProfileIn.model_fields
        })
        upsert_client_profile(profile_body, user_id)

    return {"ok": True, "extracted": extracted}


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


# ── Profiles ──────────────────────────────────────────────────────────────────

@app.post("/profiles/freelancer", status_code=201)
def upsert_freelancer_profile(
    body: FreelancerProfileIn,
    user_id: int = Depends(get_current_user_id),
):
    from matching import build_freelancer_text, upsert_profile_embedding

    data = body.model_dump()
    # Serialize list fields to JSON strings for SQLite storage
    data["skills"] = json.dumps(data["skills"]) if data["skills"] is not None else None

    conn = get_conn()
    existing = conn.execute(
        "SELECT id FROM freelancer_profiles WHERE user_id = ?", (user_id,)
    ).fetchone()

    if existing:
        set_clause = ", ".join(
            f"{k} = ?" for k in data if data[k] is not None
        ) + ", updated_at = datetime('now')"
        values = [v for v in data.values() if v is not None]
        conn.execute(
            f"UPDATE freelancer_profiles SET {set_clause} WHERE user_id = ?",
            (*values, user_id),
        )
    else:
        cols = ["user_id"] + [k for k, v in data.items() if v is not None]
        placeholders = ", ".join("?" for _ in cols)
        values = [user_id] + [v for v in data.values() if v is not None]
        conn.execute(
            f"INSERT INTO freelancer_profiles ({', '.join(cols)}) VALUES ({placeholders})",
            values,
        )

    conn.commit()

    # Rebuild and upsert embedding
    profile = row_to_dict(
        conn.execute(
            "SELECT * FROM freelancer_profiles WHERE user_id = ?", (user_id,)
        ).fetchone()
    )
    conn.close()

    profile_text = build_freelancer_text(profile)
    upsert_profile_embedding(user_id, "freelancer", profile_text)

    return {"ok": True}


@app.post("/profiles/client", status_code=201)
def upsert_client_profile(
    body: ClientProfileIn,
    user_id: int = Depends(get_current_user_id),
):
    from matching import build_client_text, upsert_profile_embedding

    data = body.model_dump()
    data["required_skills"] = (
        json.dumps(data["required_skills"]) if data["required_skills"] is not None else None
    )

    conn = get_conn()
    existing = conn.execute(
        "SELECT id FROM client_profiles WHERE user_id = ?", (user_id,)
    ).fetchone()

    if existing:
        set_clause = ", ".join(
            f"{k} = ?" for k in data if data[k] is not None
        ) + ", updated_at = datetime('now')"
        values = [v for v in data.values() if v is not None]
        conn.execute(
            f"UPDATE client_profiles SET {set_clause} WHERE user_id = ?",
            (*values, user_id),
        )
    else:
        cols = ["user_id"] + [k for k, v in data.items() if v is not None]
        placeholders = ", ".join("?" for _ in cols)
        values = [user_id] + [v for v in data.values() if v is not None]
        conn.execute(
            f"INSERT INTO client_profiles ({', '.join(cols)}) VALUES ({placeholders})",
            values,
        )

    conn.commit()

    profile = row_to_dict(
        conn.execute(
            "SELECT * FROM client_profiles WHERE user_id = ?", (user_id,)
        ).fetchone()
    )
    conn.close()

    profile_text = build_client_text(profile)
    upsert_profile_embedding(user_id, "client", profile_text)

    return {"ok": True}


@app.get("/profiles/me")
def get_my_profile(user_id: int = Depends(get_current_user_id)):
    user = get_user_by_id(user_id)
    conn = get_conn()

    if user["role"] == "client":
        row = conn.execute(
            "SELECT * FROM client_profiles WHERE user_id = ?", (user_id,)
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT * FROM freelancer_profiles WHERE user_id = ?", (user_id,)
        ).fetchone()

    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile = row_to_dict(row)
    # Deserialize JSON skill arrays for API consumers
    for field in ("skills", "required_skills"):
        if field in profile and isinstance(profile[field], str):
            try:
                profile[field] = json.loads(profile[field])
            except (json.JSONDecodeError, ValueError):
                pass

    return profile


# ── Matches ───────────────────────────────────────────────────────────────────

@app.post("/matches/compute")
def compute_matches_endpoint(user_id: int = Depends(get_current_user_id)):
    from matching import compute_matches

    user = get_user_by_id(user_id)
    role = user["role"]

    conn = get_conn()
    results = compute_matches(user_id, role, conn)

    if not results:
        conn.close()
        return {"matches": []}

    # Persist new suggestions (skip pairs that already have an entry)
    for m in results:
        other_id = m["other_user_id"]
        freelancer_id = user_id if role == "freelancer" else other_id
        client_id = other_id if role == "freelancer" else user_id

        existing = conn.execute(
            """SELECT id FROM match_history
               WHERE freelancer_id = ? AND client_id = ? AND status = 'suggested'""",
            (freelancer_id, client_id),
        ).fetchone()

        if not existing:
            conn.execute(
                "INSERT INTO match_history (freelancer_id, client_id, score) VALUES (?, ?, ?)",
                (freelancer_id, client_id, m["score"]),
            )
            conn.commit()
            match_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
            m["match_id"] = match_id
        else:
            m["match_id"] = existing["id"]

    conn.close()
    return {"matches": results}


@app.get("/matches")
def list_matches(user_id: int = Depends(get_current_user_id)):
    user = get_user_by_id(user_id)
    role = user["role"]

    conn = get_conn()
    if role == "freelancer":
        rows = conn.execute(
            """SELECT mh.id, mh.freelancer_id, mh.client_id, mh.score, mh.status, mh.created_at,
                      u.name AS other_name, u.email AS other_email
               FROM match_history mh
               JOIN users u ON u.id = mh.client_id
               WHERE mh.freelancer_id = ?
               ORDER BY mh.score DESC""",
            (user_id,),
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT mh.id, mh.freelancer_id, mh.client_id, mh.score, mh.status, mh.created_at,
                      u.name AS other_name, u.email AS other_email
               FROM match_history mh
               JOIN users u ON u.id = mh.freelancer_id
               WHERE mh.client_id = ?
               ORDER BY mh.score DESC""",
            (user_id,),
        ).fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


@app.get("/matches/{match_id}")
def get_match(match_id: int, user_id: int = Depends(get_current_user_id)):
    conn = get_conn()
    row = conn.execute(
        """SELECT mh.*,
                  fl.name AS freelancer_name, fl.email AS freelancer_email,
                  cl.name AS client_name,     cl.email AS client_email
           FROM match_history mh
           JOIN users fl ON fl.id = mh.freelancer_id
           JOIN users cl ON cl.id = mh.client_id
           WHERE mh.id = ? AND (mh.freelancer_id = ? OR mh.client_id = ?)""",
        (match_id, user_id, user_id),
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Match not found")
    return row_to_dict(row)


@app.patch("/matches/{match_id}")
def patch_match(
    match_id: int,
    body: MatchPatch,
    user_id: int = Depends(get_current_user_id),
):
    if body.status not in ("accepted", "rejected"):
        raise HTTPException(status_code=422, detail="status must be 'accepted' or 'rejected'")

    conn = get_conn()
    row = conn.execute(
        "SELECT id FROM match_history WHERE id = ? AND (freelancer_id = ? OR client_id = ?)",
        (match_id, user_id, user_id),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Match not found")

    conn.execute(
        "UPDATE match_history SET status = ? WHERE id = ?",
        (body.status, match_id),
    )
    conn.commit()
    conn.close()
    return {"ok": True}
