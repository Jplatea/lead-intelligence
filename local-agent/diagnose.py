import win32com.client

outlook = win32com.client.Dispatch("Outlook.Application")
ns = outlook.GetNamespace("MAPI")

inbox = ns.GetDefaultFolder(6)
sent = ns.GetDefaultFolder(5)

print("Inbox items:", inbox.Items.Count)
print("Sent items:", sent.Items.Count)

def addr_of(mail):
    try:
        entry = mail.Sender
        if entry is None:
            return "(sin sender)"
        user_type = getattr(entry, "AddressEntryUserType", None)
        raw_addr = getattr(entry, "Address", "")
        smtp = ""
        try:
            if user_type == 0:
                exch_user = entry.GetExchangeUser()
                if exch_user is not None:
                    smtp = exch_user.PrimarySmtpAddress or ""
        except Exception as e:
            smtp = f"(error exchangeuser: {e})"
        return f"type={user_type} raw={raw_addr} smtp={smtp}"
    except Exception as e:
        return f"(error: {e})"

print("\n--- Ultimos 5 de Inbox ---")
items = inbox.Items
items.Sort("[ReceivedTime]", True)
count = 0
for item in items:
    if count >= 5:
        break
    try:
        if item.Class != 43:
            continue
        print(f"Subject: {item.Subject!r}")
        print("  ", addr_of(item))
        count += 1
    except Exception as e:
        print("  (error item)", e)

print("\n--- Ultimos 5 de Sent ---")
items2 = sent.Items
items2.Sort("[SentOn]", True)
count = 0
for item in items2:
    if count >= 5:
        break
    try:
        if item.Class != 43:
            continue
        print(f"Subject: {item.Subject!r}")
        recips = []
        for r in item.Recipients:
            recips.append(addr_of_recipient(r) if False else None)
        try:
            for r in item.Recipients:
                entry = r.AddressEntry
                user_type = getattr(entry, "AddressEntryUserType", None)
                raw_addr = getattr(entry, "Address", "")
                smtp = ""
                try:
                    if user_type == 0:
                        exch_user = entry.GetExchangeUser()
                        if exch_user is not None:
                            smtp = exch_user.PrimarySmtpAddress or ""
                except Exception as e:
                    smtp = f"(error: {e})"
                print(f"   -> to: type={user_type} raw={raw_addr} smtp={smtp}")
        except Exception as e:
            print("   (error recipients)", e)
        count += 1
    except Exception as e:
        print("  (error item)", e)
