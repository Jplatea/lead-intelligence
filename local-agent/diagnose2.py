import win32com.client
import outlook_agent as A

ns = A.get_outlook_namespace()
inbox = ns.GetDefaultFolder(A.OL_FOLDER_INBOX)
items = inbox.Items
items.Sort("[ReceivedTime]", True)

item = items.GetFirst()
print("Subject:", item.Subject)
print("Class:", item.Class)
try:
    addr = A._address_of(item)
    print("computed _address_of:", repr(addr))
except Exception as e:
    print("EXCEPTION in _address_of:", e)

print("mail_matches result:", A.mail_matches(item, "murray@fusion-systems.es"))

results = A.find_recent_emails("murray@fusion-systems.es", limit=10)
print("find_recent_emails result count:", len(results))
