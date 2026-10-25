import { withAuth } from "@/lib/api";
import { runRegulationAnalysis } from "@/lib/services/analysis";

export const maxDuration = 300;

export const POST = withAuth<{ id: string }>("analyst", async ({ user, params }) => {
  const result = await runRegulationAnalysis(user.orgId, params.id, user.id);
  return Response.json(result);
});
