import { RedeemDesk } from '@/features/builder-lab/components/redeem-desk';

export default async function BuilderLabRedeemPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return <RedeemDesk orgId={orgId} />;
}
