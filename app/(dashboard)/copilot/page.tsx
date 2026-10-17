import { redirect } from "next/navigation";
import { getSession } from "@/lib/dal";
import ChatInterface from "@/components/chat-interface";

export const instant = false;

export default async function CopilotPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const tenantId = session.session.activeOrganizationId;
  if (!tenantId) redirect("/onboarding");

  return (
    <div className="h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-brand-cream/15">
      <ChatInterface />
    </div>
  );
}
