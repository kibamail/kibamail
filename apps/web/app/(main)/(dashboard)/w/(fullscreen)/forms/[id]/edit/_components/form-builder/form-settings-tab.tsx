"use client";

import { useState } from "react";
import { useFormBuilder } from "./form-builder-context";
import {
  DEFAULT_LIGHT_THEME,
  DEFAULT_DARK_THEME,
  type FormTheme,
  type ButtonVariant,
  type ButtonSize,
  type ButtonPosition,
} from "./types";
import { cn } from "@/lib/utils";

// Popular Google Fonts for forms
const POPULAR_FONTS = [
  { name: "Inter", url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
  { name: "Roboto", url: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" },
  { name: "Open Sans", url: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap" },
  { name: "Lato", url: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" },
  { name: "Poppins", url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" },
  { name: "Montserrat", url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" },
  { name: "Source Sans Pro", url: "https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap" },
  { name: "Nunito", url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap" },
  { name: "Playfair Display", url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap" },
  { name: "Merriweather", url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap" },
];

// Body style presets
const BODY_PRESETS = [
  {
    name: "Centered Card",
    body: {
      width: "100%",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
      boxSizing: "border-box",
      background: "linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)",
    },
    container: {
      width: "100%",
      maxWidth: "32rem",
      backgroundColor: "#ffffff",
      borderRadius: "0.75rem",
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
      padding: "2rem",
      boxSizing: "border-box",
    },
  },
  {
    name: "Full Width",
    body: {
      width: "100%",
      minHeight: "100vh",
      padding: "2rem",
      boxSizing: "border-box",
      backgroundColor: "#f9fafb",
    },
    container: {
      width: "100%",
      maxWidth: "48rem",
      margin: "0 auto",
      backgroundColor: "#ffffff",
      borderRadius: "0.5rem",
      border: "1px solid #e5e7eb",
      padding: "2rem",
      boxSizing: "border-box",
    },
  },
  {
    name: "Minimal",
    body: {
      width: "100%",
      minHeight: "100vh",
      padding: "2rem",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
    },
    container: {
      width: "100%",
      maxWidth: "36rem",
      margin: "0 auto",
      padding: "1rem",
      boxSizing: "border-box",
    },
  },
  {
    name: "Dark Gradient",
    body: {
      width: "100%",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
      boxSizing: "border-box",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    },
    container: {
      width: "100%",
      maxWidth: "32rem",
      backgroundColor: "#1f2937",
      borderRadius: "0.75rem",
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.2)",
      padding: "2rem",
      boxSizing: "border-box",
    },
  },
  {
    name: "Blue Accent",
    body: {
      width: "100%",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
      boxSizing: "border-box",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    container: {
      width: "100%",
      maxWidth: "32rem",
      backgroundColor: "#ffffff",
      borderRadius: "1rem",
      boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
      padding: "2.5rem",
      boxSizing: "border-box",
    },
  },
];

type SettingsSection = "submit" | "theme" | "layout";

export function FormSettingsTab() {
  const { schema, updateSettings, updateTheme } = useFormBuilder();
  const [activeSection, setActiveSection] = useState<SettingsSection>("submit");

  const theme = schema.settings.theme;
  const submitButton = schema.settings.submitButton;
  const successAction = schema.settings.successAction;

  return (
    <div className="h-full w-full bg-kb-bg-primary flex">
      {/* Settings Navigation */}
      <div className="w-[240px] h-full bg-kb-surface-secondary border-r border-kb-border-tertiary p-4 shrink-0">
        <h2 className="text-sm font-semibold text-kb-content-primary mb-4">
          Settings
        </h2>
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveSection("submit")}
            className={cn(
              "w-full px-3 py-2 rounded-md text-left text-sm font-medium transition-colors",
              activeSection === "submit"
                ? "bg-kb-primary text-white"
                : "text-kb-content-secondary hover:bg-kb-surface-tertiary"
            )}
          >
            Submit Button
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("theme")}
            className={cn(
              "w-full px-3 py-2 rounded-md text-left text-sm font-medium transition-colors",
              activeSection === "theme"
                ? "bg-kb-primary text-white"
                : "text-kb-content-secondary hover:bg-kb-surface-tertiary"
            )}
          >
            Theme & Colors
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("layout")}
            className={cn(
              "w-full px-3 py-2 rounded-md text-left text-sm font-medium transition-colors",
              activeSection === "layout"
                ? "bg-kb-primary text-white"
                : "text-kb-content-secondary hover:bg-kb-surface-tertiary"
            )}
          >
            Layout & Style
          </button>
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl">
          {/* Submit Button Settings */}
          {activeSection === "submit" && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-kb-content-primary mb-1">
                  Submit Button
                </h3>
                <p className="text-sm text-kb-content-secondary">
                  Customize the appearance and behavior of your form's submit button.
                </p>
              </div>

              <div className="space-y-6">
                {/* Button Text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-kb-content-primary">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={submitButton.text}
                    onChange={(e) =>
                      updateSettings({
                        submitButton: { ...submitButton, text: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
                  />
                </div>

                {/* Loading Text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-kb-content-primary">
                    Loading Text
                  </label>
                  <input
                    type="text"
                    value={submitButton.loadingText}
                    onChange={(e) =>
                      updateSettings({
                        submitButton: { ...submitButton, loadingText: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
                  />
                </div>

                {/* Button Variant */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-kb-content-primary">
                    Style
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["default", "secondary", "outline", "ghost"] as ButtonVariant[]).map(
                      (variant) => (
                        <button
                          key={variant}
                          type="button"
                          onClick={() =>
                            updateSettings({
                              submitButton: { ...submitButton, variant },
                            })
                          }
                          className={cn(
                            "px-3 py-2 rounded-md text-sm font-medium capitalize transition-colors",
                            submitButton.variant === variant
                              ? "bg-kb-primary text-white"
                              : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary"
                          )}
                        >
                          {variant}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Button Size */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-kb-content-primary">
                    Size
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["sm", "default", "lg"] as ButtonSize[]).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          updateSettings({
                            submitButton: { ...submitButton, size },
                          })
                        }
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium capitalize transition-colors",
                          submitButton.size === size
                            ? "bg-kb-primary text-white"
                            : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary"
                        )}
                      >
                        {size === "sm" ? "Small" : size === "default" ? "Medium" : "Large"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Button Position */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-kb-content-primary">
                    Position
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["left", "center", "right"] as ButtonPosition[]).map((position) => (
                      <button
                        key={position}
                        type="button"
                        onClick={() =>
                          updateSettings({
                            submitButton: { ...submitButton, position },
                          })
                        }
                        className={cn(
                          "px-3 py-2 rounded-md text-sm font-medium capitalize transition-colors",
                          submitButton.position === position
                            ? "bg-kb-primary text-white"
                            : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary"
                        )}
                      >
                        {position}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full Width */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={submitButton.fullWidth}
                    onChange={(e) =>
                      updateSettings({
                        submitButton: { ...submitButton, fullWidth: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded border-kb-border-secondary text-kb-primary focus:ring-kb-primary/20"
                  />
                  <span className="text-sm text-kb-content-primary">Full width button</span>
                </label>
              </div>

              {/* Success Action */}
              <div className="pt-6 border-t border-kb-border-tertiary">
                <h4 className="text-sm font-semibold text-kb-content-primary mb-4">
                  After Submission
                </h4>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={successAction.type === "message"}
                        onChange={() =>
                          updateSettings({
                            successAction: { type: "message", message: "Thank you for your submission!" },
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-kb-content-primary">Show message</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={successAction.type === "redirect"}
                        onChange={() =>
                          updateSettings({
                            successAction: { type: "redirect", url: "https://", openInNewTab: false },
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-kb-content-primary">Redirect to URL</span>
                    </label>
                  </div>

                  {successAction.type === "message" && (
                    <textarea
                      value={successAction.message}
                      onChange={(e) =>
                        updateSettings({
                          successAction: { type: "message", message: e.target.value },
                        })
                      }
                      placeholder="Thank you for your submission!"
                      rows={3}
                      className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
                    />
                  )}

                  {successAction.type === "redirect" && (
                    <div className="space-y-3">
                      <input
                        type="url"
                        value={successAction.url}
                        onChange={(e) =>
                          updateSettings({
                            successAction: { ...successAction, url: e.target.value },
                          })
                        }
                        placeholder="https://example.com/thank-you"
                        className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-primary text-kb-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-kb-primary/20 focus:border-kb-primary"
                      />
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={successAction.openInNewTab}
                          onChange={(e) =>
                            updateSettings({
                              successAction: { ...successAction, openInNewTab: e.target.checked },
                            })
                          }
                          className="w-4 h-4 rounded border-kb-border-secondary text-kb-primary focus:ring-kb-primary/20"
                        />
                        <span className="text-sm text-kb-content-primary">Open in new tab</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Theme Settings */}
          {activeSection === "theme" && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-kb-content-primary mb-1">
                  Theme & Colors
                </h3>
                <p className="text-sm text-kb-content-secondary">
                  Customize the visual appearance of your form.
                </p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-kb-content-primary">
                  Color Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateTheme({ ...DEFAULT_LIGHT_THEME })}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      theme.mode === "light"
                        ? "border-kb-primary bg-kb-primary/5"
                        : "border-kb-border-secondary hover:border-kb-border-primary"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 mb-2"></div>
                    <div className="text-sm font-medium text-kb-content-primary">Light</div>
                    <div className="text-xs text-kb-content-tertiary">Clean and bright</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTheme({ ...DEFAULT_DARK_THEME })}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      theme.mode === "dark"
                        ? "border-kb-primary bg-kb-primary/5"
                        : "border-kb-border-secondary hover:border-kb-border-primary"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 mb-2"></div>
                    <div className="text-sm font-medium text-kb-content-primary">Dark</div>
                    <div className="text-xs text-kb-content-tertiary">Easy on the eyes</div>
                  </button>
                </div>
              </div>

              {/* Font Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-kb-content-primary">
                  Font Family
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_FONTS.map((font) => (
                    <button
                      key={font.name}
                      type="button"
                      onClick={() =>
                        updateTheme({
                          font: { family: font.name, url: font.url },
                        })
                      }
                      className={cn(
                        "px-4 py-3 rounded-lg border-2 transition-all text-left",
                        theme.font.family === font.name
                          ? "border-kb-primary bg-kb-primary/5"
                          : "border-kb-border-secondary hover:border-kb-border-primary"
                      )}
                    >
                      <span className="text-sm font-medium text-kb-content-primary">
                        {font.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-kb-content-primary">
                  Border Radius
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "None", value: "0" },
                    { label: "Small", value: "0.375rem" },
                    { label: "Medium", value: "0.625rem" },
                    { label: "Large", value: "1rem" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateTheme({ radius: option.value })}
                      className={cn(
                        "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        theme.radius === option.value
                          ? "bg-kb-primary text-white"
                          : "bg-kb-surface-primary border border-kb-border-secondary text-kb-content-secondary hover:border-kb-border-primary"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Layout Settings */}
          {activeSection === "layout" && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-kb-content-primary mb-1">
                  Layout & Style
                </h3>
                <p className="text-sm text-kb-content-secondary">
                  Choose a layout preset or customize the body and container styles.
                </p>
              </div>

              {/* Layout Presets */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-kb-content-primary">
                  Layout Presets
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {BODY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() =>
                        updateTheme({
                          body: preset.body as unknown as FormTheme["body"],
                          container: preset.container as unknown as FormTheme["container"],
                        })
                      }
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        JSON.stringify(theme.body) === JSON.stringify(preset.body)
                          ? "border-kb-primary bg-kb-primary/5"
                          : "border-kb-border-secondary hover:border-kb-border-primary"
                      )}
                    >
                      {/* Preview */}
                      <div
                        className="h-16 rounded mb-3 flex items-center justify-center"
                        style={preset.body as React.CSSProperties}
                      >
                        <div
                          className="w-3/4 h-8 rounded"
                          style={preset.container as React.CSSProperties}
                        ></div>
                      </div>
                      <div className="text-sm font-medium text-kb-content-primary">
                        {preset.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pt-6 border-t border-kb-border-tertiary">
                <h4 className="text-sm font-semibold text-kb-content-primary mb-4">
                  Multi-Page Options
                </h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schema.settings.showProgressBar}
                    onChange={(e) =>
                      updateSettings({ showProgressBar: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-kb-border-secondary text-kb-primary focus:ring-kb-primary/20"
                  />
                  <span className="text-sm text-kb-content-primary">
                    Show progress bar for multi-page forms
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
