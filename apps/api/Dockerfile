FROM python:3.12-slim
# pdflatex + common resume packages. Compilation runs with -no-shell-escape.
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt psycopg2-binary email-validator
COPY . .
# Run as an unprivileged user
RUN useradd -m app && chown -R app /app
USER app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
