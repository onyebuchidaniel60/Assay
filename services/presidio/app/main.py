from __future__ import annotations

import hashlib
import re
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer
from presidio_analyzer.nlp_engine import NlpEngineProvider

SERVICE_TOKEN = __import__("os").environ.get("PRESIDIO_SERVICE_TOKEN", "")
MODE = "REDUCED_PII_MODE"


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2_000_000)
    language: str = "en"
    score_threshold: float = 0.35


class TokenizeRequest(AnalyzeRequest):
    pass


class Entity(BaseModel):
    entity_type: str
    start: int
    end: int
    score: float
    text: str


class AnalyzeResponse(BaseModel):
    mode: str
    entities: list[Entity]


class TokenizeResponse(BaseModel):
    mode: str
    tokenized_text: str
    token_map: dict[str, str]
    entities: list[Entity]


def build_analyzer() -> AnalyzerEngine:
    provider = NlpEngineProvider(
        nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
        }
    )
    analyzer = AnalyzerEngine(nlp_engine=provider.create_engine(), supported_languages=["en"])
    # Financial-domain recognizers. These are deterministic regex additions and
    # are deliberately labelled as part of REDUCED_PII_MODE, not full Presidio.
    recognizers = [
        PatternRecognizer(
            supported_entity="ASSAY_REFERENCE",
            patterns=[Pattern(name="facility_or_borrower_ref", regex=r"\b[A-Z]{2,5}-\d{3,8}(?:-[A-Z0-9]{1,8})?\b", score=0.85)],
        ),
        PatternRecognizer(
            supported_entity="ASSAY_ACCOUNT",
            patterns=[Pattern(name="account_like", regex=r"\b\d{8,17}\b", score=0.65)],
        ),
        PatternRecognizer(
            supported_entity="ASSAY_EMAIL",
            patterns=[
                Pattern(
                    name="email_address",
                    regex=r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",
                    score=0.95,
                )
            ],
        ),
    ]
    for recognizer in recognizers:
        analyzer.registry.add_recognizer(recognizer)
    return analyzer


def stable_token(entity_type: str, value: str) -> str:
    digest = hashlib.sha256(f"{entity_type}:{value}".encode("utf-8")).hexdigest()[:8].upper()
    return f"[{entity_type}_{digest}]"


app = FastAPI(title="Assay Presidio REDUCED_PII_MODE", version="0.1.0")
analyzer = build_analyzer()

ENTITY_PRIORITY = {
    "ASSAY_REFERENCE": 4,
    "ASSAY_EMAIL": 4,
    "ASSAY_ACCOUNT": 3,
    "EMAIL_ADDRESS": 3,
    "PERSON": 2,
    "ORGANIZATION": 2,
}


def select_non_overlapping(results):
    ranked = sorted(
        results,
        key=lambda item: (ENTITY_PRIORITY.get(item.entity_type, 1), item.score, -item.start),
        reverse=True,
    )
    selected = []
    for result in ranked:
        if any(result.start < kept.end and result.end > kept.start for kept in selected):
            continue
        selected.append(result)
    return sorted(selected, key=lambda item: item.start)


def require_token(authorization: str | None) -> None:
    if SERVICE_TOKEN:
        expected = f"Bearer {SERVICE_TOKEN}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="invalid service token")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "mode": MODE, "analyzer": "presidio-analyzer", "model": "en_core_web_sm"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest, authorization: str | None = Header(default=None)) -> AnalyzeResponse:
    require_token(authorization)
    results = analyzer.analyze(text=request.text, language=request.language, score_threshold=request.score_threshold)
    entities = [
        Entity(
            entity_type=result.entity_type,
            start=result.start,
            end=result.end,
            score=float(result.score),
            text=request.text[result.start : result.end],
        )
        for result in results
    ]
    return AnalyzeResponse(mode=MODE, entities=entities)


@app.post("/tokenize", response_model=TokenizeResponse)
def tokenize(request: TokenizeRequest, authorization: str | None = Header(default=None)) -> TokenizeResponse:
    require_token(authorization)
    results = select_non_overlapping(
        analyzer.analyze(text=request.text, language=request.language, score_threshold=request.score_threshold)
    )
    tokenized_text = request.text
    token_map: dict[str, str] = {}
    for result in reversed(results):
        value = request.text[result.start : result.end]
        token = stable_token(result.entity_type, value)
        token_map[token] = value
        tokenized_text = tokenized_text[: result.start] + token + tokenized_text[result.end :]
    entities = [
        Entity(
            entity_type=result.entity_type,
            start=result.start,
            end=result.end,
            score=float(result.score),
            text=request.text[result.start : result.end],
        )
        for result in results
    ]
    return TokenizeResponse(mode=MODE, tokenized_text=tokenized_text, token_map=token_map, entities=entities)
