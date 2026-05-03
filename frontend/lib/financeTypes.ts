/** Finance summary transaction row (matches API + FinanceReportsClient). */
export type FinanceTx = {
  id: string;
  kind: string;
  paymentType: string;
  paymentWay: string;
  paymentLineBreakdown?: Array<{ paymentType: string; amount: number }> | null;
  amount: number;
  currency: string;
  displayCurrency?: string;
  fxUsdPerUnit?: number | null;
  amountDisplayTotal?: number | null;
  date: string | null;
  party: string;
  description: string;
  status: string;
  reference: string;
  churchId: string | null;
  churchName: string | null;
};
