// Fixed rules for filling in parsed statement lines. They win over what past
// transactions suggest. Matching is case-insensitive on the bank descriptor
// (and the company, once one is filled in).

export interface PredictionRule {
  match?: RegExp;          // tested against the descriptor + company
  whenCompany?: RegExp;    // tested against the company alone
  onlyPayments?: boolean;  // only lines from the statement's payments section
  company?: string;       // used only when no company was found otherwise
  categoryTitle?: string; // your expense category's title, e.g. "Software"
  workExpense?: boolean;
}

// Earlier rules win when two set the same thing.
export const PREDICTION_RULES: PredictionRule[] = [
  // Paying off the Apple Card (ACH transfers, Apple Cash) is a payment, not software
  { whenCompany: /^apple$/i, onlyPayments: true, categoryTitle: 'Payments' },

  // Apple subscriptions / App Store
  { match: /apple\.com/i, company: 'Apple', categoryTitle: 'Software' },

  // Always work expenses
  { match: /adobe/i, company: 'Adobe', workExpense: true },
  { match: /starlink/i, company: 'Starlink', workExpense: true },
  { match: /google/i, company: 'Google', workExpense: true },
  { match: /squarespace/i, company: 'Squarespace', workExpense: true },
  { match: /claude|anthropic/i, company: 'Claude', workExpense: true },
  { match: /chatgpt|openai/i, company: 'ChatGPT', workExpense: true },
];

export interface RuleResult {
  company?: string;
  categoryTitle?: string;
  workExpense?: boolean;
}

// Every rule that matches, merged (later rules don't undo earlier ones).
// `isPayment`: the line is from the statement's payments section (not a refund).
export function applyPredictionRules(descriptor: string, company: string | null, isPayment = false): RuleResult {
  const text = `${descriptor} ${company ?? ''}`;
  const result: RuleResult = {};
  for (const rule of PREDICTION_RULES) {
    if (rule.match && !rule.match.test(text)) continue;
    if (rule.whenCompany && !rule.whenCompany.test(company?.trim() ?? '')) continue;
    if (rule.onlyPayments && !isPayment) continue;
    if (rule.company && !result.company) result.company = rule.company;
    if (rule.categoryTitle && !result.categoryTitle) result.categoryTitle = rule.categoryTitle;
    if (rule.workExpense !== undefined && result.workExpense === undefined) result.workExpense = rule.workExpense;
  }
  return result;
}
