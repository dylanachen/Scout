# scope-guard
An end-to-end pipeline for seamless freelancer discovery, collaborative tracking, and scope creep management.

```bash
cd web
npm install
cp .env.example .env          # set VITE_API_URL and VITE_WS_URL
npm run dev                   # http://localhost:3000
```


### `web/.env`

```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_DEMO_MODE=true
```




# Backend Temporary ReadMe :) (will replace very soon)
FastAPI + SQLite + WebSocket + RAG (ChromaDB + pdfplumber)


    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

### .env  (or export in shell)
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=sk-...           # enables real LLM for onboarding + scope guardian
DB_PATH=freelanceos.db
UPLOAD_DIR=uploads
