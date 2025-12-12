import json
from pathlib import Path
from typing import Dict, List, Tuple, Any

from backend_app.settings import DATA_DIR

class Storage:
    def __init__(self, base: str = DATA_DIR):
        self.base = Path(base)
        self.base.mkdir(parents=True, exist_ok=True)

    def job_dir(self, run_id: str) -> Path:
        d = self.base / run_id
        d.mkdir(parents=True, exist_ok=True)
        return d

    def save_artifacts(
        self,
        run_id: str,
        nodes: Dict[str, Dict[str, Any]],
        edges: List[Tuple[str, str, Dict[str, Any]]],
        store_bodies: bool = True,
    ):
        out = self.job_dir(run_id)
        (out / "nodes.json").write_text(
            json.dumps(nodes, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        (out / "edges.json").write_text(
            json.dumps(edges, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        if store_bodies:
            bodies = out / "bodies"
            bodies.mkdir(exist_ok=True)
            for url, meta in nodes.items():
                body = meta.get("body")
                if not body:
                    continue
                safe_name = str(abs(hash(url)))
                (bodies / f"{safe_name}.html").write_text(body, encoding="utf-8")

    def export_json(self, run_id: str) -> Path:
        out = self.job_dir(run_id)
        nodes_path = out / "nodes.json"
        edges_path = out / "edges.json"

        if not nodes_path.exists() or not edges_path.exists():
            raise FileNotFoundError("Crawl data not found")

        nodes = json.loads(nodes_path.read_text(encoding="utf-8"))
        edges = json.loads(edges_path.read_text(encoding="utf-8"))

        data = {"nodes": nodes, "edges": edges}
        json_path = out / f"{run_id}.json"
        json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return json_path