import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import { CopilotSettingsPageClient } from "@/components/copilot/copilot-settings-page";

export default async function CopilotSettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  const tenantId = session.session.activeOrganizationId;
  if (!tenantId) redirect("/onboarding");

  return <CopilotSettingsPageClient />;
}

export const instant = false;
