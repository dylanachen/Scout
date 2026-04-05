# Backend
An end-to-end pipeline for seamless freelancer discovery, collaborative tracking, and scope creep management.

First of all, please follow frontend setup.
Below is some frontend setup
```bash
cd web
npm install
cp .env.example .env          # set VITE_API_URL and VITE_WS_URL
npm run dev                   # http://localhost:3000
```

### web/.env setting
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_DEMO_MODE=false
```

# Backend Part
FastAPI + SQLite + WebSocket + RAG (ChromaDB + pdfplumber)
Please download backend and place them to web/ (like web/backend)

    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

### additional .env for future usage
    
    SECRET_KEY=your-secret-key-here
    OPENAI_API_KEY=sk-...           # enables real LLM for onboarding + scope guardian
    DB_PATH=freelanceos.db
    UPLOAD_DIR=uploads


### Web app step
First, run backend

    cd web/backend
    uvicorn main:app --reload --port 8000

Then, run fronend

    cd ..
    npm run dev 
