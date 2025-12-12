import random
from typing import Optional, List


class ProxyPool:
    def __init__(self, proxies: Optional[List[str]]):
        self.proxies = proxies or []

    def get(self) -> Optional[str]:
        if not self.proxies:
            return None
        return random.choice(self.proxies)
