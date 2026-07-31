"""
ILEADS local Outlook agent
==========================

Reads recent emails with a given contact address directly from the Outlook
DESKTOP application already running on this Windows PC (via COM automation —
the same mechanism VBA macros use), and serves them over a small local HTTP
server that the ILEADS web app can call from the browser.

This exists as a fallback for while Microsoft 365 tenant admin consent for
the real Microsoft Graph integration is pending — it never talks to
Microsoft's cloud APIs and needs no Azure app registration or admin
approval, because it's just automating the Outlook app already signed in
on this machine. It is READ-ONLY: it never sends, deletes, or modifies
anything.

Requirements (run once):
    pip install pywin32

Usage (running the Python script directly):
    1. Make sure Outlook (the desktop app, not the web version) is open
       and signed in.
    2. Run:  python outlook_agent.py
    3. Leave this window open. Leave it running in the background while
       you use the "Establecer comunicación" -> "Agente local" option on
       the ILEADS website.
    4. Press Ctrl+C to stop it.

Usage (as a standalone .exe, no Python needed to run it afterwards):
    1. On a Windows PC with Python installed, double-click build_exe.bat
       in this same folder. It installs pyinstaller and produces
       dist\ILeadsOutlookAgent.exe.
    2. Double-click that .exe (or run install_autostart.bat once to make
       it launch automatically every time you log in to Windows).

This only works on Windows, with classic desktop Outlook installed, while
this script is running on this same PC. It does not work from other
computers or phones.
"""

import json
import sys
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

try:
    import win32com.client
except ImportError:
    print("Falta la libreria pywin32. Instalala con:  pip install pywin32")
    sys.exit(1)

HOST = "127.0.0.1"
PORT = 5787

# Only these origins are allowed to call this agent from the browser -
# keeps random other websites from being able to query your inbox just
# because this script happens to be running.
ALLOWED_ORIGINS = {
    "https://ileads.prestigedistribution.es",
    "http://localhost:5183",
}

# Outlook's OlDefaultFolders enum values used below.
OL_FOLDER_INBOX = 6
OL_FOLDER_SENT_MAIL = 5


def get_outlook_namespace():
    outlook = win32com.client.Dispatch("Outlook.Application")
    return outlook.GetNamespace("MAPI")


def _address_of(mail_item, recipient=None):
    """Best-effort resolution of an SMTP address, since Exchange items
    sometimes expose an internal EX address instead of the real email."""
    try:
        if recipient is not None:
            addr_entry = recipient.AddressEntry
        else:
            addr_entry = mail_item.Sender
        if addr_entry is None:
            return ""
        if getattr(addr_entry, "AddressEntryUserType", None) == 0:  # olExchangeUserAddressEntry
            exch_user = addr_entry.GetExchangeUser()
            if exch_user is not None:
                return (exch_user.PrimarySmtpAddress or "").lower()
        return (getattr(addr_entry, "Address", "") or "").lower()
    except Exception:
        return ""


def mail_matches(mail_item, target_email):
    target = target_email.lower()
    try:
        if _address_of(mail_item) == target:
            return True
        for recipient in mail_item.Recipients:
            if _address_of(mail_item, recipient) == target:
                return True
    except Exception:
        pass
    return False


def to_result(mail_item):
    try:
        received = mail_item.ReceivedTime
    except Exception:
        received = mail_item.SentOn
    try:
        date_iso = received.strftime("%Y-%m-%dT%H:%M:%S")
    except Exception:
        date_iso = ""
    body = (mail_item.Body or "").strip().replace("\r\n", " ")[:200]
    return {
        "id": mail_item.EntryID,
        "subject": mail_item.Subject or "(sin asunto)",
        "from": _address_of(mail_item) or (mail_item.SenderName or ""),
        "date": date_iso,
        "snippet": body,
    }


def find_recent_emails(target_email, limit=10, max_age_days=365):
    ns = get_outlook_namespace()
    cutoff = datetime.now() - timedelta(days=max_age_days)
    matches = []

    for folder_id in (OL_FOLDER_INBOX, OL_FOLDER_SENT_MAIL):
        try:
            folder = ns.GetDefaultFolder(folder_id)
        except Exception:
            continue
        items = folder.Items
        items.Sort("[ReceivedTime]", True)  # newest first; Sent Mail falls back to SentOn internally
        count = 0
        for item in items:
            # Cap how many we scan per folder so a huge mailbox doesn't hang.
            count += 1
            if count > 500:
                break
            try:
                if item.Class != 43:  # olMail
                    continue
                when = getattr(item, "ReceivedTime", None) or getattr(item, "SentOn", None)
                if when and when < cutoff:
                    break
                if mail_matches(item, target_email):
                    matches.append(to_result(item))
            except Exception:
                continue

    matches.sort(key=lambda m: m["date"], reverse=True)
    return matches[:limit]


class Handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write("ILEADS local Outlook agent esta funcionando.".encode("utf-8"))
            return

        if parsed.path != "/emails":
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()
            return

        query = parse_qs(parsed.query)
        email = (query.get("email") or [""])[0].strip()
        limit = int((query.get("limit") or ["10"])[0])

        if not email:
            self.send_response(400)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Falta el parametro email"}).encode("utf-8"))
            return

        try:
            results = find_recent_emails(email, limit=limit)
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(results, ensure_ascii=False).encode("utf-8"))
        except Exception as e:
            self.send_response(500)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

    def log_message(self, format, *args):
        # Quieter console output - only show real request lines, no noise.
        print("[agente]", format % args)


def main():
    print(f"Agente de Outlook para ILEADS escuchando en http://{HOST}:{PORT}")
    print("Deja esta ventana abierta mientras usas la web. Ctrl+C para parar.")
    server = HTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAgente detenido.")


if __name__ == "__main__":
    main()
