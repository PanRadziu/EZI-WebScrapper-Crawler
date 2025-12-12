class CaptchaSolverAdapter:
    """
    Interfejs do integracji z zewnętrznym solverem (np. 2captcha/anticaptcha).
    Tu jest stub — nic nie robi. W razie potrzeby podmień implementację.
    """
    def __init__(self, name: str | None = None):
        self.name = name

    async def solve(self, site_key: str, page_url: str) -> dict:
        # Zwróć token lub podnieś wyjątek jeśli brak integracji
        raise NotImplementedError("Brak skonfigurowanego CAPTCHA solvera.")
