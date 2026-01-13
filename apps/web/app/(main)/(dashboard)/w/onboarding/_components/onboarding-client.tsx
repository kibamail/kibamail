"use client";

import { Heading } from "@kibamail/owly/heading";
import { Text } from "@kibamail/owly/text";
import { Button } from "@kibamail/owly/button";
import * as Alert from "@kibamail/owly/alert";
import * as TextField from "@kibamail/owly/text-field";
import { useState } from "react";
import { OnboardingStep } from "./onboarding-step";
import { SdkCodeSnippets } from "./sdk-code-snippets";
import { PasswordField } from "./password-field";
import { CopyIcon } from "./icons/copy-icon";
import { CheckCircleSolidIcon } from "./icons/check-circle-solid-icon";
import { CreateSendingDomainFlow } from "./create-sending-domain-flow";
import Link from "next/link";
import type { HighlightedSdk } from "../_lib/get-highlighted-sdks";

const MOCK_API_KEY = "kbt_dGVzdF9hcGlfa2V5X2Zvcl9vbmJvYXJkaW5n";

interface OnboardingClientProps {
  sdks: HighlightedSdk[];
}

export function OnboardingClient({ sdks }: OnboardingClientProps) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false);
  const [isTestEmailSent, setIsTestEmailSent] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const isGeneratedApiKeySuccess = apiKey !== null;

  let percentageCompleted = 0;

  if (isGeneratedApiKeySuccess) {
    percentageCompleted = percentageCompleted + 33;
  }

  if (isTestEmailSent) {
    percentageCompleted = percentageCompleted + 51;
  }

  function generateApiKey() {
    setIsGeneratingApiKey(true);
    // Simulate API call delay
    setTimeout(() => {
      setApiKey(MOCK_API_KEY);
      setIsGeneratingApiKey(false);
    }, 1500);
  }

  async function copyApiKey() {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey);
    }
  }

  function sendTestEmail() {
    setIsSendingTestEmail(true);
    // Simulate API call delay
    setTimeout(() => {
      setIsTestEmailSent(true);
      setIsSendingTestEmail(false);
    }, 2000);
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-3xl mx-auto mt-20 px-4">
        <Heading size="xs" variant="display" className="mb-5">
          Setup transactional email sending
        </Heading>
        <Text className="text-kb-content-secondary">
          Create an api key, and connect one of our supported SDKs to start
          sending transactional email from your applications.
        </Text>

        <div className="mt-6 flex flex-col w-full gap-8 relative">
          <div className="h-1" />
          <div className="absolute w-px h-full left-[7.5px] bg-kb-border-tertiary">
            <div
              className="bg-kb-content-info w-px transition-all duration-500 ease-out"
              style={{ height: `${percentageCompleted}%` }}
            />
          </div>
          <OnboardingStep
            title="Generate an api key"
            description="Your api key may be used to send emails using an SDK, SMTP or interact with our API."
            completed={isGeneratedApiKeySuccess}
          >
            {!apiKey ? (
              <Button onClick={generateApiKey} disabled={isGeneratingApiKey}>
                {isGeneratingApiKey ? "Generating..." : "Generate api key"}
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <PasswordField readOnly value={apiKey}>
                  <TextField.Label>API Key</TextField.Label>
                </PasswordField>
                <Button onClick={copyApiKey} variant="secondary">
                  <CopyIcon className="w-4 h-4 mr-2" />
                  Copy API key
                </Button>
              </div>
            )}
          </OnboardingStep>

          <OnboardingStep
            title="Send a test email"
            description={`We'll send an email to your registered email address using your created api key.`}
            completed={isTestEmailSent}
          >
            <SdkCodeSnippets
              sdks={sdks}
              footer={
                isTestEmailSent ? (
                  <Alert.Root variant="success">
                    <Alert.Icon>
                      <CheckCircleSolidIcon />
                    </Alert.Icon>
                    <Alert.Title>
                      Test email sent successfully! Check your email inbox to
                      see the received email.
                    </Alert.Title>
                  </Alert.Root>
                ) : (
                  <Button
                    onClick={sendTestEmail}
                    loading={isSendingTestEmail}
                    disabled={!isGeneratedApiKeySuccess}
                  >
                    Send your first email
                  </Button>
                )
              }
            />
          </OnboardingStep>

          <OnboardingStep
            title="Configure a sending domain"
            description={
              "For email best practices, please set up a dedicated sending domain for your transactional emails."
            }
          >
            <div className="flex gap-4 items-center">
              <CreateSendingDomainFlow>
                <Button disabled={!isTestEmailSent}>
                  Add a sending domain
                </Button>
              </CreateSendingDomainFlow>
              <Button variant="tertiary" asChild>
                <Link href="/w">I'll do this later</Link>
              </Button>
            </div>
          </OnboardingStep>

          <div className="h-1" />
        </div>
      </div>
    </div>
  );
}
