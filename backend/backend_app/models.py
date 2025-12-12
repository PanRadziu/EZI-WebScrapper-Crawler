from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Dict
from enum import Enum

class SearchMethod(str, Enum):
    BFS = "BFS"
    DFS = "DFS"

class LinkTypeFilter(BaseModel):
    allow_patterns: Optional[List[str]] = Field(default=None, description="Regex list to allow links")
    deny_patterns: Optional[List[str]] = Field(default=None, description="Regex list to deny links")

class CrawlerConfig(BaseModel):
    seed_url: HttpUrl
    max_depth: int = Field(3, ge=0, le=10)
    request_timeout: float = Field(10.0, gt=0)
    global_timeout: Optional[float] = Field(None, description="Max job duration in seconds")
    hard_link_limit: int = Field(1000, gt=0, le=100000)
    stay_in_domain: bool = True
    search_method: SearchMethod = SearchMethod.BFS
    allowed_schemes: List[str] = ["http", "https"]
    link_filter: Optional[LinkTypeFilter] = None
    user_agents: Optional[List[str]] = None
    proxy_list: Optional[List[str]] = None
    follow_robots_txt: bool = True
    obey_rate_limit: Optional[float] = Field(default=None, description="Pause in seconds between requests")
    max_concurrency: int = Field(10, ge=1, le=50)
    export_store_body: bool = Field(True, description="Save full body clipped to limit")
    max_body_chars: int = Field(200_000, ge=1000, le=2_000_000)
    respect_content_type_html_only: bool = Field(True, description="If True, only fetch HTML")

class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    finished = "finished"
    error = "error"
    stopped = "stopped"

class JobSummary(BaseModel):
    run_id: str
    status: JobStatus
    error: Optional[str] = None
    total_nodes: int = 0
    total_edges: int = 0
    limit: int = 0
    seed_url: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None

class ExportFormat(str, Enum):
    json = "json"

class NodeMeta(BaseModel):
    url: str
    status: Optional[int] = None
    title: Optional[str] = None
    meta: Optional[Dict[str, str]] = None
    keywords: Optional[List[str]] = None
    content_type: Optional[str] = None
    depth: Optional[int] = None