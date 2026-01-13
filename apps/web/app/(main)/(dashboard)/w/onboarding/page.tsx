import { getHighlightedSdks } from "./_lib/get-highlighted-sdks";
import { OnboardingClient } from "./_components/onboarding-client";

const MOCK_EMAIL = "developer@example.com";

export default async function OnboardingPage() {
  const sdks = await getHighlightedSdks(MOCK_EMAIL);

  return <OnboardingClient sdks={sdks} />;
}
