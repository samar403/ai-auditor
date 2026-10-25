import { withAuth } from "@/lib/api";
import { runPolicyGapCheck } from "@/lib/services/policy";

export const maxDuration = 300;

export const POST = withAuth<{ id: string }>("analyst", async ({ user, params }) => {
  return Response.json(await runPolicyGapCheck(user.orgId, params.id, user.id));
});
