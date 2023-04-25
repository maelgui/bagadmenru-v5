FROM python:3.10

WORKDIR /project

RUN pip install poetry

COPY pyproject.toml poetry.lock ./

ENV POETRY_VIRTUALENVS_CREATE=false
RUN poetry install --no-ansi --no-root

COPY . .

CMD [ "uvicorn", "bbe2.main:app", "--reload", "--host", "0.0.0.0" ]
