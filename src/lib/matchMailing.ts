import type { Company, MailingContact } from "../types";

export interface CompanyMailingMatch {
  company: Company;
  contact: MailingContact;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

// Cross-checks the clients database against the mailing list looking for
// the same company on both sides — specifically the clients table's
// "Nombre" column (Company.name) against the mailing table's "Empresa"
// column (MailingContact.companyName), per explicit instruction (not
// email - a company can share a name across both lists with a different
// contact email on each side). Each company pairs with at most one
// mailing contact (its first match) rather than listing every pairing.
// Only pairs whose emails actually differ are worth surfacing - if both
// sides already agree there's nothing to reconcile, so those are dropped
// rather than cluttering the list with rows that have no real action.
export function findCompanyMailingMatches(companies: Company[], contacts: MailingContact[]): CompanyMailingMatch[] {
  const matches: CompanyMailingMatch[] = [];

  for (const company of companies) {
    const companyName = norm(company.name);
    const found = contacts.find((c) => c.companyName && norm(c.companyName) === companyName);
    if (found && norm(company.contact.email ?? "") !== norm(found.email)) {
      matches.push({ company, contact: found });
    }
  }

  return matches;
}
