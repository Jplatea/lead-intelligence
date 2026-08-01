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
       dist/ILeadsOutlookAgent.exe.
    2. Double-click that .exe (or run install_autostart.bat once to make
       it launch automatically every time you log in to Windows).

This only works on Windows, with classic desktop Outlook installed, while
this script is running on this same PC. It does not work from other
computers or phones.
"""

import json
import os
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

_LOG_PATH = os.path.join(os.path.dirname(sys.executable if getattr(sys, "frozen", False) else __file__), "agent_debug_log.txt")


def _debug_log(message):
    try:
        with open(_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().isoformat()} {message}\n")
    except Exception:
        pass

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


def mail_matches(mail_item, target_email, check_sender=True, check_recipients=True):
    target = target_email.lower()
    try:
        if check_sender and _address_of(mail_item) == target:
            return True
        if check_recipients:
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


def find_recent_emails(target_email, limit=10, max_age_days=365, max_scan=150):
    _t0 = datetime.now()
    _debug_log(f"find_recent_emails start target={target_email!r}")
    try:
        ns = get_outlook_namespace()
    except Exception as e:
        _debug_log(f"get_outlook_namespace failed: {e!r}")
        raise
    cutoff = datetime.now() - timedelta(days=max_age_days)
    matches = []
    _exception_count = 0

    for folder_id in (OL_FOLDER_INBOX, OL_FOLDER_SENT_MAIL):
        try:
            folder = ns.GetDefaultFolder(folder_id)
        except Exception as e:
            _debug_log(f"GetDefaultFolder({folder_id}) failed: {e!r}")
            continue
        is_sent_folder = folder_id == OL_FOLDER_SENT_MAIL
        sort_field = "[SentOn]" if is_sent_folder else "[ReceivedTime]"
        items = folder.Items
        items.Sort(sort_field, True)  # newest first

        # Plain `for item in items` uses the collection's own enumerator,
        # which does NOT honor Sort() - items can come back in an
        # unrelated order, so the "stop once we hit an old one" cutoff
        # below would trigger on the wrong item and bail out too early,
        # skipping real matches further down. GetFirst()/GetNext() do
        # respect Sort() (verified directly against a real mailbox), so
        # use that instead of the for-loop.
        count = 0
        item = items.GetFirst()
        # Capped well below the folder's real size on purpose - this tool is
        # for "recent emails with this contact", not a full-history search,
        # and each extra item costs a real COM round-trip (walking the full
        # 500 previously allowed took 1-2+ minutes against a busy mailbox,
        # long enough that the browser gave up on the request before it
        # finished). Scanning only the most recent max_scan keeps this
        # fast enough to actually be usable.
        while item is not None and count < max_scan:
            count += 1
            try:
                if item.Class == 43:  # olMail
                    when = getattr(item, "ReceivedTime", None) or getattr(item, "SentOn", None)
                    # pywin32 returns a timezone-aware datetime here; cutoff
                    # (below) is naive. Comparing aware vs naive datetimes
                    # raises TypeError, which the broad except below was
                    # silently swallowing on every single item - so this
                    # cutoff check was quietly breaking out of the loop
                    # before ever reaching mail_matches(), for every mail,
                    # every time. Strip tzinfo so the comparison is valid.
                    if when is not None and getattr(when, "tzinfo", None) is not None:
                        when = when.replace(tzinfo=None)
                    if when and when < cutoff:
                        break
                    # Inbox mail: only the sender can be this contact (they
                    # sent it to us). Sent Mail: the sender is always us, so
                    # only the recipients can be this contact. Checking the
                    # side that can never match was the main cost - for a
                    # non-matching item it walked every recipient and
                    # resolved each one's address (an Exchange/GAL lookup for
                    # Exchange-type entries), for nothing. Restricting to the
                    # one side that's actually possible roughly halves the
                    # per-item COM cost across hundreds of items.
                    if mail_matches(
                        item,
                        target_email,
                        check_sender=not is_sent_folder,
                        check_recipients=is_sent_folder,
                    ):
                        matches.append(to_result(item))
            except Exception as e:
                _exception_count += 1
                if _exception_count <= 3:
                    _debug_log(f"item exception in folder {folder_id}: {e!r}")
            item = items.GetNext()
        _debug_log(f"folder {folder_id} scanned {count} items")

    matches.sort(key=lambda m: m["date"], reverse=True)
    _debug_log(
        f"find_recent_emails done matches={len(matches)} exceptions={_exception_count} "
        f"elapsed={(datetime.now() - _t0).total_seconds():.1f}s"
    )
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
