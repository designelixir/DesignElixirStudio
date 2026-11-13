'use client';

import { StatementParserProps } from './parserTypes';
import { STATEMENT_FORMATS } from './statementFormats';
import StatementPdfParser from './StatementPdfParser';

// Chase credit card monthly statements
export default function ParseChase(props: StatementParserProps) {
  return <StatementPdfParser {...props} title='Chase Parser' parse={STATEMENT_FORMATS.chase.parse} />;
}
