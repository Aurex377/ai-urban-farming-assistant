# AI Urban Farming Assistant - FastAPI Backend

Welcome to the backend for the **AI Urban Farming Assistant**! This backend connects directly to your existing Supabase project (PostgreSQL database and Supabase Storage) without modifying or recreating existing tables.

---

## 📁 Project Structure

```text
backend/
│
├── main.py                    # FastAPI app entrypoint, CORS & health routes
├── database.py                # Supabase client connection loader
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variables template
├── .gitignore                 # Prevents committing .env and virtual environments
│
├── routes/                    # API Endpoints
│   ├── __init__.py
│   ├── users.py               # User profiles CRUD
│   ├── plants.py              # Plants CRUD
│   ├── images.py              # Leaf/plant image upload to Supabase Storage
│   ├── diagnoses.py           # Plant disease diagnosis (ready for AI model)
│   ├── care.py                # Care recommendations
│   ├── watering.py            # Watering logs & recommendations
│   ├── weather.py             # Weather observations
│   └── activities.py          # Activity audit logs
│
├── schemas/                   # Pydantic Request & Response Models
│   ├── __init__.py
│   ├── users.py
│   ├── plants.py
│   ├── diagnoses.py
│   ├── watering.py
│   └── weather.py
│
└── services/                  # Business Logic Services
    ├── __init__.py
    ├── storage_service.py     # Image validation & upload to 'plant-images' bucket
    └── ai_service.py          # Disease diagnosis AI integration hook
```

---

## 🪟 Windows Setup Instructions (Step-by-Step)

Follow these step-by-step Windows commands in **PowerShell** or **Command Prompt**:

### Step 1: Open PowerShell in the project directory
Make sure your terminal is opened at the root folder:
```powershell
cd "c:\Users\Anant\Desktop\code carnival\backend"
```

---

### Step 2: Create a Python Virtual Environment
Run:
```powershell
python -m venv venv
```
*(This creates an isolated `venv` folder with Python and pip).*

---

### Step 3: Activate the Virtual Environment on Windows
In **PowerShell**, run:
```powershell
.\venv\Scripts\Activate.ps1
```

> **Note for PowerShell execution policy:** If you encounter a script execution error (`cannot be loaded because running scripts is disabled`), run this one command in PowerShell:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
> And then re-run `.\venv\Scripts\Activate.ps1`.

If you are using standard **Command Prompt (cmd.exe)** instead, run:
```cmd
venv\Scripts\activate.bat
```

Once activated, your terminal prompt will show `(venv)` at the beginning.

---

### Step 4: Install Requirements
Install all dependencies listed in `requirements.txt`:
```powershell
pip install -r requirements.txt
```

---

### Step 5: Create `.env` from `.env.example`
Copy the `.env.example` file to create your real `.env` file:

In **PowerShell**:
```powershell
Copy-Item .env.example .env
```
Or in **Command Prompt**:
```cmd
copy .env.example .env
```

---

### Step 6: Configure SUPABASE_URL and SUPABASE_KEY
Open `backend/.env` in your text editor. It looks like this:

```env
# Supabase Connection Settings
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-or-anon-key

# Frontend Application URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

1. **Where to find them in Supabase:**
   - Go to your [Supabase Dashboard](https://app.supabase.com).
   - Select your project.
   - Click the **Project Settings** (gear icon) in the left sidebar.
   - Click **API**.
   - Copy the **Project URL** and paste it into `SUPABASE_URL`.
   - Copy the `anon` / `public` API key (or `service_role` if using full admin bypass for storage) and paste it into `SUPABASE_KEY`.
2. Save the file.
3. ⚠️ **Security Notice:** Never commit your `.env` file to Git. It is already included in `.gitignore`.

---

### Step 7: Start the FastAPI Server
Run Uvicorn with auto-reload:

```powershell
uvicorn main:app --reload
```
You should see:
```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

---

### Step 8: Open Interactive Swagger Documentation
Open your browser and navigate to:
👉 **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

You will see the complete interactive Swagger UI where you can view schemas and test every endpoint live.

Alternatively, ReDoc is available at:
👉 **[http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)**

---

### Step 9: Test the Health Endpoint
In your browser or terminal, test the root and basic health endpoints:

- **Browser:** Visit [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **PowerShell:**
  ```powershell
  curl http://127.0.0.1:8000/health
  ```
**Expected response:**
```json
{
  "status": "healthy"
}
```

---

### Step 10: Test Database Connectivity
Once your `SUPABASE_URL` and `SUPABASE_KEY` are entered into `backend/.env`:

- **Browser:** Visit [http://127.0.0.1:8000/health/database](http://127.0.0.1:8000/health/database)
- **PowerShell:**
  ```powershell
  curl http://127.0.0.1:8000/health/database
  ```

**Expected response when connected:**
```json
{
  "status": "connected",
  "database": "Supabase reachable",
  "table_checked": "plants"
}
```

If credentials are not yet configured or incorrect, it will return:
```json
{
  "status": "disconnected",
  "database": "Supabase unreachable",
  "message": "Unable to reach Supabase. Please verify SUPABASE_URL and SUPABASE_KEY in your backend/.env file."
}
```

---

## 🌿 Available Endpoints Summary

### Health
- `GET /` - Root status
- `GET /health` - Application health
- `GET /health/database` - Test connection to Supabase `plants` table

### Plants
- `POST /api/plants` - Create plant
- `GET /api/plants/{user_id}` - Get all plants for a user UUID
- `GET /api/plants/detail/{plant_id}` - Get single plant details
- `PUT /api/plants/{plant_id}` - Update plant details
- `DELETE /api/plants/{plant_id}` - Delete plant

### Images & Supabase Storage
- `POST /api/plants/{plant_id}/images` - Upload image (jpg/png/webp up to 10MB) to Supabase Storage bucket `plant-images` and store record in `plant_images` table
- `GET /api/plants/{plant_id}/images` - List all uploaded images for a plant

### AI Diagnosis
- `POST /api/diagnosis/{plant_id}` - Request diagnosis for uploaded image (uses `services/ai_service.py` architecture hook)
- `GET /api/diagnosis/plant/{plant_id}` - Get diagnosis history for a plant

### Care Recommendations
- `POST /api/care/{plant_id}` - Add care recommendation
- `GET /api/care/{plant_id}` - List care recommendations for a plant

### Watering
- `POST /api/watering/{plant_id}/log` - Record watering log
- `GET /api/watering/{plant_id}/logs` - Get watering history
- `POST /api/watering/{plant_id}/recommendation` - Add watering recommendation
- `GET /api/watering/{plant_id}/recommendations` - Get watering recommendations

### Weather
- `POST /api/weather` - Save weather observation
- `GET /api/weather/{plant_id}` - Get weather observations for a plant

### Activities
- `POST /api/activities` - Record activity
- `GET /api/activities/{user_id}` - List user activity history
