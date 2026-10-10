from typing import Any

from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    password: str


class FilesIn(BaseModel):
    files: dict[str, str] = Field(max_length=20)


class AnswerIn(BaseModel):
    answer: Any


class AnswerOut(BaseModel):
    correct: bool
    expected: Any
    explanation: str
    xp_awarded: int


class XpOut(BaseModel):
    xp_awarded: int
