import { redirect } from 'next/navigation';

export default function EstimateIndexPage({ params }: { params: { estimateId: string } }) {
  redirect(`/admin/estimates/${params.estimateId}/overview`);
}
