import { redirect } from "next/navigation";
import { industries } from "@/data/industries";
import OnboardingForm from "./_components/onboarding-form";
import { getUserOnboardingStatus } from "@/actions/user";

export default async function OnboardingPage() {
  
  // Check if user is already onboarded
  const { isOnboarded } = await getUserOnboardingStatus();  // is onboarded is boolean that tells if user has completed onboarding

  if (isOnboarded) {
    redirect("/dashboard");
  }

  return (
    <main>
      {/* // here i have used components to show the onboarding form becaue this is server side page i cant use hooks directly */}
      {/* // that form component will handle the form submission and all logic */}
      <OnboardingForm industries={industries} />
    </main>
  );
}
