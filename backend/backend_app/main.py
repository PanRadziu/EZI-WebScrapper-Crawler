from fastapi import FastAPI, BackgroundTasks, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
import uuid
import os
from backend_app.models import CrawlerConfig
from backend_app.crawler import CrawlManager
from backend_app.settings import CORS_ORIGINS, APP_TITLE
from backend_app.storage import Storage

app = FastAPI(title=APP_TITLE)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = CrawlManager()
storage = Storage()

@app.post("/start")
async def start_crawl(config: CrawlerConfig, background_tasks: BackgroundTasks) -> Dict:
    run_id = str(uuid.uuid4())
    manager.create_job(run_id, config)
    background_tasks.add_task(manager.run_job, run_id)
    return {"run_id": run_id, "status": "started"}

@app.post("/stop/{run_id}")
def stop_crawl(run_id: str) -> Dict:
    if run_id not in manager.jobs:
        raise HTTPException(status_code=404, detail="run_id not found")
    manager.stop_job(run_id)
    return {"run_id": run_id, "status": "stopping"}

@app.get("/status/{run_id}")
def status(run_id: str):
    return manager.get_status(run_id)

@app.get("/result/{run_id}")
def result(run_id: str):
    return manager.get_result_summary(run_id)

@app.get("/export/{run_id}/{format}")
def export(run_id: str, format: str):
    if run_id not in manager.jobs:
        raise HTTPException(status_code=404, detail="run_id not found")

    if format == "json":
        path = storage.export_json(run_id)
        media = "application/json"
    elif format == "csv":
        path = storage.export_csv(run_id)
        media = "application/zip"  # bo zwracamy ZIP z dwoma CSV
    elif format == "graphml":
        path = storage.export_graphml(run_id)
        media = "application/xml"
    elif format == "zip":
        path = storage.export_zip_full(run_id)
        media = "application/zip"
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

    data = path.read_bytes()
    filename = os.path.basename(path)
    return Response(
        content=data,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

