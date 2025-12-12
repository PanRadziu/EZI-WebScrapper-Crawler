import csv
import json
from pathlib import Path
from typing import Dict, List, Tuple, Any
import networkx as nx
import zipfile

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
        # podstawowe pliki źródłowe
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
                # prosta nazwa pliku bez kombinowania
                safe_name = str(abs(hash(url)))
                (bodies / f"{safe_name}.html").write_text(body, encoding="utf-8")

    # ========= EKSPORTY =========

    def export_json(self, run_id: str) -> Path:
        """
        ZWRACA JEDEN PLIK JSON — nie ZIP.
        Struktura:
        {
          "nodes": {...},
          "edges": [...]
        }
        """
        out = self.job_dir(run_id)
        nodes = json.loads((out / "nodes.json").read_text(encoding="utf-8"))
        edges = json.loads((out / "edges.json").read_text(encoding="utf-8"))

        data = {"nodes": nodes, "edges": edges}
        json_path = out / f"{run_id}.json"
        json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return json_path

    def export_csv(self, run_id: str) -> Path:
        """
        Tworzy nodes.csv + edges.csv i pakuje do ZIP.
        """
        out = self.job_dir(run_id)
        nodes = json.loads((out / "nodes.json").read_text(encoding="utf-8"))
        edges = json.loads((out / "edges.json").read_text(encoding="utf-8"))

        nodes_csv = out / "nodes.csv"
        with nodes_csv.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["url", "status", "title", "content_type", "depth"])
            for url, meta in nodes.items():
                w.writerow([
                    url,
                    meta.get("status"),
                    meta.get("title") or "",
                    meta.get("content_type") or "",
                    meta.get("depth") or "",
                ])

        edges_csv = out / "edges.csv"
        with edges_csv.open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["from", "to", "anchor_text"])
            for frm, to, edata in edges:
                w.writerow([frm, to, (edata or {}).get("anchor_text", "")])

        zpath = out / f"{run_id}_csv.zip"
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.write(nodes_csv, arcname="nodes.csv")
            zf.write(edges_csv, arcname="edges.csv")
        return zpath

    def export_graphml(self, run_id: str) -> Path:
        """
        Prosty eksport GraphML: tylko węzły (URL) i krawędzie (from -> to),
        bez dodatkowych atrybutów, żeby uniknąć problemów z typami (dict, list itd.).
        """
        out = self.job_dir(run_id)
        nodes = json.loads((out / "nodes.json").read_text(encoding="utf-8"))
        edges = json.loads((out / "edges.json").read_text(encoding="utf-8"))

        G = nx.DiGraph()

        # dodaj same węzły (URL)
        for url in nodes.keys():
            G.add_node(url)

        # dodaj krawędzie (from, to)
        for frm, to, _ in edges:
            G.add_edge(frm, to)

        graphml_path = out / f"{run_id}.graphml"
        nx.write_graphml(G, graphml_path)
        return graphml_path


    def export_zip_full(self, run_id: str) -> Path:
        """
        Pełny ZIP z wszystkimi plikami danego zadania.
        """
        out = self.job_dir(run_id)
        zpath = out / f"{run_id}_full.zip"
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in out.rglob("*"):
                if p.is_file() and p.name != zpath.name:
                    zf.write(p, arcname=str(p.relative_to(out)))
        return zpath
