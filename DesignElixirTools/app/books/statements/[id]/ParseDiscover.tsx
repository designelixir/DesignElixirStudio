'use client';

import { StatementParserProps } from './parserTypes';
import { STATEMENT_FORMATS } from './statementFormats';
import StatementPdfParser from './StatementPdfParser';

// Discover monthly statements and Account Activity exports (detected automatically)
export default function ParseDiscover(props: StatementParserProps) {
  return <StatementPdfParser {...props} title='Discover Parser' parse={STATEMENT_FORMATS.discover.parse} />;
}
