import type { Company, MailingContact } from "../types";

export interface CompanyMailingMatch {
  company: Company;
  contact: MailingContact;
  matchedBy: "email" | "name";
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

// Cross-checks the clients database against the mailing list looking for
// the same company on both sides — either the exact same contact email,
// or the company name matching the mailing contact's own company field.
// Each company pairs with at most one mailing contact (its best/first
// match) rather than listing every possible pairing.
export function findCompanyMailingMatches(companies: Company[], contacts: MailingContact[]): CompanyMailingMatch[] {
  const matches: CompanyMailingMatch[] = [];

  for (const company of companies) {
    const companyEmail = company.contact.email ? norm(company.contact.email) : "";
    const companyName = norm(company.name);

    let found: CompanyMailingMatch | undefined;
    for (const contact of contacts) {
      const contactEmail = contact.email ? norm(contact.email) : "";
      const contactCompany = contact.companyName ? norm(contact.companyName) : "";

      if (companyEmail && contactEmail && companyEmail === contactEmail) {
        found = { company, contact, matchedBy: "email" };
        break;
      }
      if (!found && contactCompany && companyName === contactCompany) {
        found = { company, contact, matchedBy: "name" };
      }
    }
    if (found) matches.push(found);
  }

  return matches;
}
