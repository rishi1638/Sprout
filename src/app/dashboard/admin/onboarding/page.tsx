import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForms } from "@/components/forms/onboarding-forms";
import { t } from "@/lib/i18n";

export default async function OnboardingPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: classrooms } = await supabase.from("classrooms").select("id, name").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("inviteInstructorTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("inviteParentTitle")}</p>
      </div>
      <OnboardingForms classrooms={classrooms ?? []} />
    </div>
  );
}
