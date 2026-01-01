import { redirect } from "next/navigation";

/**
 * Settings Index Page
 *
 * Redirects to the default settings page (usage).
 * This allows the sidebar to link to /w/settings while ensuring
 * users always land on a specific settings page.
 */
export default function SettingsPage() {
  redirect("/w/settings/workspace");
}
