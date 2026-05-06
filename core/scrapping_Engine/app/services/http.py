from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.core.config import settings


def browser_headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {
        "User-Agent": settings.user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }
    if settings.contact_email:
        headers["From"] = settings.contact_email
    if extra:
        headers.update(extra)
    return headers


async def fetch_text(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None,
    timeout_seconds: float | None = None,
    retries: int = 2,
) -> str:
    timeout = timeout_seconds or settings.request_timeout_seconds
    last_error: Exception | None = None

    for attempt in range(retries + 1):
        try:
            async with httpx.AsyncClient(
                timeout=timeout,
                follow_redirects=True,
                headers=browser_headers(headers),
            ) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.text
        except Exception as error:  # pragma: no cover - network dependent
            last_error = error
            if attempt >= retries:
                break
            await asyncio.sleep(0.5 * (attempt + 1))

    raise RuntimeError(f"Failed to fetch text from {url}: {last_error}")


async def fetch_json(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None,
    timeout_seconds: float | None = None,
) -> Any:
    timeout = timeout_seconds or settings.request_timeout_seconds
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers=browser_headers(headers),
    ) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


async def post_text(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    data: str | None = None,
    timeout_seconds: float | None = None,
) -> str:
    timeout = timeout_seconds or settings.request_timeout_seconds
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers=browser_headers(headers),
    ) as client:
        response = await client.post(url, content=data)
        response.raise_for_status()
        return response.text


async def post_form_json(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    data: dict[str, Any] | None = None,
    timeout_seconds: float | None = None,
) -> Any:
    timeout = timeout_seconds or settings.request_timeout_seconds
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers=browser_headers(headers),
    ) as client:
        response = await client.post(url, data=data)
        response.raise_for_status()
        return response.json()
