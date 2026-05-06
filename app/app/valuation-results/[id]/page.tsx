import { notFound } from 'next/navigation';
import { ValuationResultsWorkspace } from '@/components/ValuationResults/ValuationResultsWorkspace';
import { requirePageUser } from '@/lib/server-auth';
import { getValuationDetailReport } from '@/lib/valuation/report';

export default async function ValuationResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser();
  const { id } = await params;
  const report = await getValuationDetailReport(id, user.userId);

  if (!report) {
    notFound();
  }

  return <ValuationResultsWorkspace report={report} />;
}
