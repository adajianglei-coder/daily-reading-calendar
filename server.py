from __future__ import annotations

import io
import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd


ROOT = Path(__file__).resolve().parent
REQUIRED_HEADERS = ["书名", "标题", "摘要"]


class ReadingHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/import-summaries-excel":
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        length = int(self.headers.get("Content-Length", "0"))
        payload = self.rfile.read(length)

        try:
            dataframe = pd.read_excel(io.BytesIO(payload))
            missing = [header for header in REQUIRED_HEADERS if header not in dataframe.columns]
            if missing:
                raise ValueError(f"missing headers: {', '.join(missing)}")

            entries = []
            for index, row in dataframe.iterrows():
                book_title = str(row["书名"]).strip()
                title = str(row["标题"]).strip()
                summary = str(row["摘要"]).strip()
                if not (book_title and title and summary):
                    continue
                entries.append(
                    {
                        "id": f"entry-{index + 1}",
                        "bookTitle": book_title,
                        "title": title,
                        "summary": summary,
                    }
                )

            if not entries:
                raise ValueError("no valid rows")

            body = json.dumps({"entries": entries}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:  # noqa: BLE001
            body = json.dumps({"error": str(exc)}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.BAD_REQUEST)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            body = json.dumps({"ok": True}, ensure_ascii=False).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        super().do_GET()


def main():
    port = int(os.environ.get("PORT", "4317"))
    server = ThreadingHTTPServer(("0.0.0.0", port), ReadingHandler)
    print(f"Serving on http://0.0.0.0:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
