import json

import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = "./chroma_db"


def _get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    ef = embedding_functions.DefaultEmbeddingFunction()
    return client.get_or_create_collection("profiles", embedding_function=ef)


# ── Profile text builders ─────────────────────────────────────────────────────

def build_freelancer_text(profile: dict) -> str:
    parts = []
    if profile.get("bio"):
        parts.append(profile["bio"])
    skills = _parse_json_list(profile.get("skills"))
    if skills:
        parts.append("Skills: " + ", ".join(skills))
    if profile.get("availability"):
        parts.append(f"Availability: {profile['availability']}")
    if profile.get("experience_years"):
        parts.append(f"Experience: {profile['experience_years']} years")
    if profile.get("location"):
        parts.append(f"Location: {profile['location']}")
    if profile.get("hourly_rate"):
        parts.append(f"Rate: ${profile['hourly_rate']}/hr")
    return " | ".join(parts) or "freelancer profile"


def build_client_text(profile: dict) -> str:
    parts = []
    if profile.get("project_description"):
        parts.append(profile["project_description"])
    skills = _parse_json_list(profile.get("required_skills"))
    if skills:
        parts.append("Required skills: " + ", ".join(skills))
    if profile.get("industry"):
        parts.append(f"Industry: {profile['industry']}")
    if profile.get("timeline"):
        parts.append(f"Timeline: {profile['timeline']}")
    if profile.get("location"):
        parts.append(f"Location: {profile['location']}")
    bmin, bmax = profile.get("budget_min"), profile.get("budget_max")
    if bmin or bmax:
        parts.append(f"Budget: ${bmin or 0}–${bmax or '?'}")
    return " | ".join(parts) or "client profile"


# ── Embedding upsert ──────────────────────────────────────────────────────────

def upsert_profile_embedding(user_id: int, role: str, profile_text: str):
    """Store or replace a profile embedding in the shared profiles collection."""
    collection = _get_collection()
    collection.upsert(
        ids=[f"{role}_{user_id}"],
        documents=[profile_text],
        metadatas=[{"user_id": user_id, "role": role}],
    )


# ── Matching engine ───────────────────────────────────────────────────────────

def compute_matches(user_id: int, role: str, conn) -> list[dict]:
    """
    Query ChromaDB for top candidates from the opposite role,
    then compute a composite score (70% embedding similarity, 30% structured bonus).
    Returns a list of match dicts sorted by score descending.
    """
    collection = _get_collection()

    # Fetch the querying user's own profile text to use as the query
    try:
        result = collection.get(ids=[f"{role}_{user_id}"], include=["documents"])
        if not result["documents"]:
            return []
        query_text = result["documents"][0]
    except Exception:
        return []

    opposite = "client" if role == "freelancer" else "freelancer"

    try:
        results = collection.query(
            query_texts=[query_text],
            n_results=10,
            where={"role": {"$eq": opposite}},
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return []

    if not results["documents"] or not results["documents"][0]:
        return []

    matches = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        other_user_id = meta["user_id"]
        # ChromaDB returns L2 distance by default; convert to [0,1] similarity
        embedding_sim = max(0.0, 1.0 - dist / 2.0)
        bonus = _structured_bonus(user_id, role, other_user_id, conn)
        score = round(embedding_sim * 0.7 + bonus * 0.3, 4)

        matches.append({
            "other_user_id": other_user_id,
            "opposite_role": opposite,
            "embedding_similarity": round(embedding_sim, 4),
            "structured_bonus": round(bonus, 4),
            "score": score,
            "profile_summary": doc,
        })

    matches.sort(key=lambda x: x["score"], reverse=True)
    return matches


# ── Structured field scoring ──────────────────────────────────────────────────

def _structured_bonus(user_id: int, role: str, other_id: int, conn) -> float:
    """
    0–1 bonus from structured field compatibility.
    Checks skills overlap and budget-vs-rate alignment.
    """
    scores, checks = 0.0, 0

    if role == "freelancer":
        fl = conn.execute(
            "SELECT skills, hourly_rate FROM freelancer_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        cl = conn.execute(
            "SELECT required_skills, budget_max FROM client_profiles WHERE user_id = ?",
            (other_id,),
        ).fetchone()
    else:
        cl = conn.execute(
            "SELECT required_skills, budget_max FROM client_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        fl = conn.execute(
            "SELECT skills, hourly_rate FROM freelancer_profiles WHERE user_id = ?",
            (other_id,),
        ).fetchone()

    if fl and cl:
        fl_skills = set(s.lower() for s in _parse_json_list(fl["skills"]))
        cl_skills = set(s.lower() for s in _parse_json_list(cl["required_skills"]))
        if fl_skills or cl_skills:
            overlap = len(fl_skills & cl_skills) / max(len(fl_skills | cl_skills), 1)
            scores += overlap
            checks += 1

        rate = fl["hourly_rate"]
        bmax = cl["budget_max"]
        if rate and bmax:
            # Heuristic: freelancer fits if rate * 160 hrs (≈1 month) ≤ budget
            monthly = rate * 160
            if monthly <= bmax:
                scores += 1.0
            else:
                scores += max(0.0, 1.0 - (monthly - bmax) / bmax)
            checks += 1

    return scores / checks if checks else 0.0


# ── Utilities ─────────────────────────────────────────────────────────────────

def _parse_json_list(value) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, ValueError):
            return []
    return []
