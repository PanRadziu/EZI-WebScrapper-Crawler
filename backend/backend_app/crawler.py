import asyncio
import re
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, Set, Tuple, List, Optional, Any
from urllib.parse import urljoin, urldefrag, urlparse

import aiohttp
from bs4 import BeautifulSoup
from urllib import robotparser

from backend_app.models import CrawlerConfig, SearchMethod, JobStatus, JobSummary
from backend_app.utils.ua_pool import UserAgentPool
from backend_app.utils.proxy import ProxyPool
from backend_app.storage import Storage

def _slug_domain(url: str) -> str:
    return urlparse(url).netloc.lower()

def _match_patterns(patterns: List[str], text: str) -> bool:
    for pat in patterns:
        if re.search(pat, text, flags=re.IGNORECASE):
            return True
    return False

def _extract_keywords(text: str, k: int = 15) -> List[str]:
    if not text:
        return []
    # Simple cleanup to isolate words
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s-]", " ", text)
    tokens = [t.lower() for t in text.split()]
    
    # Common Polish & English stop words
    stop = set("""
        i oraz lub ale więc że to jest są był była było być byćże na w we do od
        a o z za dla przez bez pod nad po przy jak jakby gdy gdyż gdyby też teżże
        the and or of in on at to from with for by as into over under about
    """.split())
    
    freq: Dict[str, int] = {}
    for t in tokens:
        if len(t) < 3 or t in stop or t.isdigit():
            continue
        freq[t] = freq.get(t, 0) + 1
        
    return [w for w, _ in sorted(freq.items(), key=lambda kv: kv[1], reverse=True)[:k]]

@dataclass
class CrawlJob:
    config: CrawlerConfig
    visited: Set[str] = field(default_factory=set)
    edges: List[Tuple[str, str, Dict[str, Any]]] = field(default_factory=list)
    nodes: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    status: JobStatus = JobStatus.queued
    error: Optional[str] = None
    started_at: Optional[float] = None
    finished_at: Optional[float] = None
    stop_flag: bool = False

class CrawlManager:
    def __init__(self):
        self.jobs: Dict[str, CrawlJob] = {}
        self.storage = Storage()

    def create_job(self, run_id: str, config: CrawlerConfig):
        self.jobs[run_id] = CrawlJob(config=config)

    def get_status(self, run_id: str) -> Dict[str, Any]:
        job = self.jobs.get(run_id)
        if not job:
            return {"error": "run_id not found"}
        
        return JobSummary(
            run_id=run_id,
            status=job.status,
            error=job.error,
            total_nodes=len(job.nodes),
            total_edges=len(job.edges),
            limit=job.config.hard_link_limit,
            seed_url=str(job.config.seed_url),
            started_at=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(job.started_at)) if job.started_at else None,
            finished_at=time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(job.finished_at)) if job.finished_at else None,
        ).model_dump()

    def get_result_summary(self, run_id: str) -> Dict[str, Any]:
        job = self.jobs.get(run_id)
        if not job:
            return {"error": "run_id not found"}
        
        nodes_short = {
            url: {k: v for k, v in meta.items() if k != "body"}
            for url, meta in job.nodes.items()
        }
        return {
            "nodes": nodes_short,
            "edges": job.edges,
            "status": job.status,
        }

    async def run_job(self, run_id: str):
        job = self.jobs[run_id]
        job.status = JobStatus.running
        job.started_at = time.time()
        
        try:
            await self._crawl(job)
            if job.status != JobStatus.stopped:
                job.status = JobStatus.finished
            job.finished_at = time.time()
            
            self.storage.save_artifacts(
                run_id,
                job.nodes,
                job.edges,
                store_bodies=job.config.export_store_body,
            )
        except Exception as e:
            job.status = JobStatus.error
            job.error = str(e)
            job.finished_at = time.time()

    def stop_job(self, run_id: str):
        job = self.jobs.get(run_id)
        if job:
            job.stop_flag = True

    async def _fetch_robots(self, session: aiohttp.ClientSession, base_url: str, ua: str) -> Optional[robotparser.RobotFileParser]:
        parsed = urlparse(base_url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        try:
            async with session.get(robots_url, headers={"User-Agent": ua}, timeout=5) as resp:
                if resp.status >= 400:
                    return None
                txt = await resp.text()
        except Exception:
            return None
            
        rp = robotparser.RobotFileParser()
        rp.parse(txt.splitlines())
        return rp

    async def _crawl(self, job: CrawlJob):
        cfg = job.config
        ua_pool = UserAgentPool(cfg.user_agents)
        proxy_pool = ProxyPool(cfg.proxy_list)

        start = str(cfg.seed_url)
        start_domain = _slug_domain(start)
        sem = asyncio.Semaphore(cfg.max_concurrency)

        # Initialize Queue or Stack based on method
        queue: deque[Tuple[str, int]] | List[Tuple[str, int]]
        if cfg.search_method == SearchMethod.BFS:
            queue = deque([(start, 0)])
            pop_item = lambda: queue.popleft()
            push_item = lambda u, d: queue.append((u, d))
            has_items = lambda: len(queue) > 0
        else:
            stack: List[Tuple[str, int]] = [(start, 0)]
            queue = stack  # type: ignore
            pop_item = lambda: queue.pop()
            push_item = lambda u, d: queue.append((u, d))
            has_items = lambda: len(queue) > 0

        async with aiohttp.ClientSession() as session:
            rp = None
            if cfg.follow_robots_txt:
                rp = await self._fetch_robots(session, start, ua_pool.get())

            async def fetch(url: str) -> Tuple[Optional[int], Optional[str], Optional[str]]:
                headers = {
                    "User-Agent": ua_pool.get(), 
                    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"
                }
                proxy = proxy_pool.get()
                
                try:
                    async with sem:
                        async with session.get(url, headers=headers, proxy=proxy, timeout=cfg.request_timeout) as resp:
                            ctype = resp.headers.get("Content-Type", "")
                            # Content-Type check
                            if cfg.respect_content_type_html_only and "text/html" not in ctype:
                                return resp.status, None, ctype
                            
                            text = await resp.text(errors="replace")
                            return resp.status, text, ctype
                except Exception:
                    # In case of proxy error, timeout or network issue -> return None
                    return None, None, None

            while has_items() and len(job.visited) < cfg.hard_link_limit:
                if job.stop_flag:
                    job.status = JobStatus.stopped
                    break
                
                # Check Global Timeout
                if cfg.global_timeout and job.started_at:
                    if time.time() - job.started_at > cfg.global_timeout:
                        job.error = "Global timeout reached"
                        break

                url, depth = pop_item()
                # Clean URL (remove fragment #)
                url = urldefrag(urljoin(start, url))[0]

                if url in job.visited:
                    continue
                if depth > cfg.max_depth:
                    continue

                # Filters
                if cfg.stay_in_domain and _slug_domain(url) != start_domain:
                    continue
                
                if rp and not rp.can_fetch(ua_pool.get(), url):
                    continue

                if urlparse(url).scheme not in cfg.allowed_schemes:
                    continue

                if cfg.link_filter:
                    if cfg.link_filter.allow_patterns and not _match_patterns(cfg.link_filter.allow_patterns, url):
                        continue
                    if cfg.link_filter.deny_patterns and _match_patterns(cfg.link_filter.deny_patterns, url):
                        continue

                job.visited.add(url)

                status, text, ctype = await fetch(url)
                
                meta_entry: Dict[str, Any] = {
                    "status": status,
                    "content_type": ctype,
                    "depth": depth,
                }

                if text:
                    soup = BeautifulSoup(text, "lxml")
                    title = soup.title.string.strip() if soup.title and soup.title.string else ""
                    
                    metas = {}
                    for m in soup.find_all("meta"):
                        name = m.get("name") or m.get("property")
                        content = m.get("content")
                        if name and content:
                            metas[str(name).strip()] = str(content).strip()
                    
                    meta_entry["title"] = title
                    meta_entry["meta"] = metas

                    # Keyword extraction
                    meta_kw = []
                    if "keywords" in metas:
                        meta_kw = [k.strip() for k in metas["keywords"].split(",") if k.strip()]
                    derived_kw = _extract_keywords(text, k=15)
                    meta_entry["keywords"] = list(dict.fromkeys(meta_kw + derived_kw))[:20]

                    if cfg.export_store_body:
                        meta_entry["body"] = text[: cfg.max_body_chars]

                    # Extract Links
                    for a in soup.find_all("a", href=True):
                        href = urldefrag(urljoin(url, a["href"]))[0]
                        parsed_href = urlparse(href)
                        
                        if parsed_href.scheme not in cfg.allowed_schemes:
                            continue
                            
                        anchor_text = (a.get_text() or "").strip()[:200]
                        job.edges.append((url, href, {"anchor_text": anchor_text}))
                        
                        # Add to queue if not visited
                        if href not in job.visited and (len(job.visited) + len(queue)) < cfg.hard_link_limit:
                            if not cfg.stay_in_domain or _slug_domain(href) == start_domain:
                                push_item(href, depth + 1)

                job.nodes[url] = meta_entry

                if cfg.obey_rate_limit:
                    await asyncio.sleep(cfg.obey_rate_limit)