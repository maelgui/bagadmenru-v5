FROM python:3.11-alpine

WORKDIR /project

RUN pip install --no-cache-dir poetry==1.8.2

COPY pyproject.toml poetry.lock ./

ENV POETRY_VIRTUALENVS_CREATE=false
RUN poetry install --no-ansi --no-root

COPY . .

HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 CMD [ "./check.py" ]
CMD [ "uvicorn", "bbe2.main:app", "--reload", "--host", "0.0.0.0" ]
