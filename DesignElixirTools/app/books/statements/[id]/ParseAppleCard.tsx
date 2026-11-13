'use client';

import { StatementParserProps } from './parserTypes';
import { STATEMENT_FORMATS } from './statementFormats';
import StatementPdfParser from './StatementPdfParser';

// Apple Card monthly statements
export default function ParseAppleCard(props: StatementParserProps) {
  return <StatementPdfParser {...props} title='Apple Card Parser' parse={STATEMENT_FORMATS.apple.parse} />;
}
