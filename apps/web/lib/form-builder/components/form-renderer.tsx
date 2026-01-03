"use client";

import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ContentBlockRenderer } from "@/lib/form-builder/components/content-block-renderer";

import type {
  FormBuilderSchema,
  FormField as FormFieldType,
  FormPage,
  FormSection,
  FormSubmissionData,
  FormTheme,
} from "@/lib/form-builder/schema";
import { cn } from "@/lib/utils";

function themeToStyleVars(theme: FormTheme): React.CSSProperties {
  const { colors, radius, font } = theme;
  return {
    "--radius": radius,
    "--font-family": `"${font.family}", ui-sans-serif, system-ui, sans-serif`,
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--card": colors.card,
    "--card-foreground": colors.cardForeground,
    "--popover": colors.popover,
    "--popover-foreground": colors.popoverForeground,
    "--primary": colors.primary,
    "--primary-foreground": colors.primaryForeground,
    "--secondary": colors.secondary,
    "--secondary-foreground": colors.secondaryForeground,
    "--muted": colors.muted,
    "--muted-foreground": colors.mutedForeground,
    "--accent": colors.accent,
    "--accent-foreground": colors.accentForeground,
    "--destructive": colors.destructive,
    "--border": colors.border,
    "--input": colors.input,
    "--ring": colors.ring,
  } as React.CSSProperties;
}

interface FormRendererProps {
  schema: FormBuilderSchema;
  /** Called when the form is submitted. Return true for success, false for failure. */
  onSubmit?: (data: FormSubmissionData) => Promise<boolean> | boolean | void;
  className?: string;
}

const fieldWidthClasses = {
  full: "w-full",
  half: "w-full sm:w-[calc(50%-0.5rem)]",
  third: "w-full sm:w-[calc(33.333%-0.667rem)]",
  quarter: "w-full sm:w-[calc(25%-0.75rem)]",
};

const AUTO_ADVANCE_FIELD_TYPES = [
  "radio",
  "select",
  "choice_card",
  "rating",
  "checkbox",
] as const;

function getPageFields(page: FormPage): FormFieldType[] {
  return page.sections.flatMap((section) => section.fields);
}

function shouldAutoAdvance(page: FormPage): boolean {
  const fields = getPageFields(page);
  if (fields.length !== 1) return false;

  const field = fields[0];
  return AUTO_ADVANCE_FIELD_TYPES.includes(
    field.type as (typeof AUTO_ADVANCE_FIELD_TYPES)[number],
  );
}

interface FieldRendererProps {
  field: FormFieldType;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const widthClass = fieldWidthClasses[field.appearance.width];
  const isRequired = field.validation?.required;
  const isInvalid = !!error;

  if (field.type === "content") {
    return (
      <div className={cn(widthClass)}>
        <ContentBlockRenderer content={field.richContent} />
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className={cn(widthClass)}>
        <Field orientation="horizontal" data-invalid={isInvalid}>
          <Checkbox
            id={field.id}
            checked={(value as boolean) ?? false}
            onCheckedChange={onChange}
            aria-invalid={isInvalid}
          />
          <FieldContent>
            <FieldLabel htmlFor={field.id}>{field.label}</FieldLabel>
            {field.description && (
              <FieldDescription>{field.description}</FieldDescription>
            )}
            {error && <FieldError>{error}</FieldError>}
          </FieldContent>
        </Field>
      </div>
    );
  }

  if (field.type === "checkbox_group") {
    const checkedValues = (value as string[]) ?? [];
    return (
      <div className={cn(widthClass)}>
        <Field data-invalid={isInvalid}>
          <FieldLabel>
            {field.label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </FieldLabel>
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
          <FieldGroup className="gap-3">
            {field.options?.map((option) => (
              <Field key={option.id} orientation="horizontal">
                <Checkbox
                  id={`${field.id}_${option.id}`}
                  checked={checkedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...checkedValues, option.value]);
                    } else {
                      onChange(checkedValues.filter((v) => v !== option.value));
                    }
                  }}
                />
                <FieldLabel htmlFor={`${field.id}_${option.id}`}>
                  {option.label}
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
          {error && <FieldError>{error}</FieldError>}
        </Field>
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div className={cn(widthClass)}>
        <Field data-invalid={isInvalid}>
          {field.appearance.labelPosition !== "hidden" && (
            <FieldLabel>
              {field.label}
              {isRequired && <span className="text-destructive ml-0.5">*</span>}
            </FieldLabel>
          )}
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
          <RadioGroup value={(value as string) ?? ""} onValueChange={onChange}>
            {field.options?.map((option) => (
              <Field key={option.id} orientation="horizontal">
                <RadioGroupItem
                  id={`${field.id}_${option.id}`}
                  value={option.value}
                />
                <FieldLabel htmlFor={`${field.id}_${option.id}`}>
                  {option.label}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
          {error && <FieldError>{error}</FieldError>}
        </Field>
      </div>
    );
  }

  if (field.type === "choice_card") {
    return (
      <div className={cn(widthClass)}>
        <Field data-invalid={isInvalid}>
          {field.appearance.labelPosition !== "hidden" && (
            <FieldLabel>
              {field.label}
              {isRequired && <span className="text-destructive ml-0.5">*</span>}
            </FieldLabel>
          )}
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
          <RadioGroup
            value={(value as string) ?? ""}
            onValueChange={onChange}
            className="gap-3"
          >
            {field.options?.map((option) => (
              <FieldLabel key={option.id} htmlFor={`${field.id}_${option.id}`}>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{option.label}</FieldTitle>
                    {option.description && (
                      <FieldDescription>{option.description}</FieldDescription>
                    )}
                  </FieldContent>
                  <RadioGroupItem
                    value={option.value}
                    id={`${field.id}_${option.id}`}
                  />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
          {error && <FieldError>{error}</FieldError>}
        </Field>
      </div>
    );
  }

  if (field.type === "hidden") {
    return (
      <input
        type="hidden"
        id={field.id}
        name={field.name}
        value={(value as string) ?? (field.defaultValue as string) ?? ""}
      />
    );
  }

  if (field.type === "rating") {
    const maxRating = field.validation?.rating?.maxRating ?? 5;
    const currentRating = (value as number) ?? 0;
    return (
      <div className={cn(widthClass)}>
        <Field data-invalid={isInvalid}>
          <FieldLabel>
            {field.label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </FieldLabel>
          <div className="flex gap-1">
            {Array.from({ length: maxRating }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange(i + 1)}
                className="p-0.5 hover:scale-110 transition-transform"
              >
                <Star
                  className={cn(
                    "size-6",
                    i < currentRating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
          {error && <FieldError>{error}</FieldError>}
        </Field>
      </div>
    );
  }

  if (field.type === "slider") {
    const sliderValue = (value as number) ?? field.validation?.slider?.min ?? 0;
    const min = field.validation?.slider?.min ?? 0;
    const max = field.validation?.slider?.max ?? 100;
    const step = field.validation?.slider?.step ?? 1;
    return (
      <div className={cn(widthClass)}>
        <Field data-invalid={isInvalid}>
          <FieldLabel htmlFor={field.id}>
            {field.label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </FieldLabel>
          <div className="space-y-3">
            <Slider
              id={field.id}
              value={[sliderValue]}
              onValueChange={([v]) => onChange(v)}
              min={min}
              max={max}
              step={step}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{min}</span>
              <span className="font-medium text-foreground">{sliderValue}</span>
              <span>{max}</span>
            </div>
          </div>
          {field.description && (
            <FieldDescription>{field.description}</FieldDescription>
          )}
          {error && <FieldError>{error}</FieldError>}
        </Field>
      </div>
    );
  }

  function renderInput() {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "url":
        return (
          <Input
            id={field.id}
            type={field.type === "phone" ? "tel" : field.type}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={isInvalid}
          />
        );

      case "number":
        return (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            min={field.validation?.number?.min}
            max={field.validation?.number?.max}
            step={field.validation?.number?.step}
            aria-invalid={isInvalid}
          />
        );

      case "textarea":
        return (
          <Textarea
            id={field.id}
            placeholder={field.placeholder}
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={isInvalid}
          />
        );

      case "select":
        return (
          <Select value={(value as string) ?? ""} onValueChange={onChange}>
            <SelectTrigger
              id={field.id}
              className="w-full"
              aria-invalid={isInvalid}
            >
              <SelectValue
                placeholder={field.placeholder ?? "Select an option"}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi_select": {
        const selectedValues = (value as string[]) ?? [];
        return (
          <FieldGroup className="gap-3">
            {field.options?.map((option) => (
              <Field key={option.id} orientation="horizontal">
                <Checkbox
                  id={`${field.id}_${option.id}`}
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selectedValues, option.value]);
                    } else {
                      onChange(
                        selectedValues.filter((v) => v !== option.value),
                      );
                    }
                  }}
                />
                <FieldLabel htmlFor={`${field.id}_${option.id}`}>
                  {option.label}
                </FieldLabel>
              </Field>
            ))}
          </FieldGroup>
        );
      }

      case "date":
        return (
          <Input
            id={field.id}
            type="date"
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={isInvalid}
          />
        );

      case "time":
        return (
          <Input
            id={field.id}
            type="time"
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={isInvalid}
          />
        );

      case "datetime":
        return (
          <Input
            id={field.id}
            type="datetime-local"
            value={(value as string) ?? ""}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={isInvalid}
          />
        );

      case "file":
        return (
          <Input
            id={field.id}
            type="file"
            onChange={(event) => {
              const files = event.target.files;
              if (files) {
                onChange(Array.from(files).map((file) => file.name));
              }
            }}
            aria-invalid={isInvalid}
          />
        );

      default:
        return null;
    }
  }

  return (
    <div className={cn(widthClass)}>
      <Field data-invalid={isInvalid}>
        {field.appearance.labelPosition !== "hidden" && (
          <FieldLabel htmlFor={field.id}>
            {field.label}
            {isRequired && <span className="text-destructive ml-0.5">*</span>}
          </FieldLabel>
        )}
        {renderInput()}
        {field.description && (
          <FieldDescription>{field.description}</FieldDescription>
        )}
        {error && <FieldError>{error}</FieldError>}
      </Field>
    </div>
  );
}

interface SectionRendererProps {
  section: FormSection;
  formData: FormSubmissionData;
  onChange: (fieldName: string, value: unknown) => void;
  errors: Record<string, string>;
}

function SectionRenderer({
  section,
  formData,
  onChange,
  errors,
}: SectionRendererProps) {
  const [isOpen, setIsOpen] = React.useState(!section.defaultCollapsed);

  const content = (
    <div className="flex flex-wrap gap-4">
      {section.fields.map((field) => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={formData[field.name]}
          onChange={(value) => onChange(field.name, value)}
          error={errors[field.name]}
        />
      ))}
    </div>
  );

  if (section.collapsible) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
        <div className="mb-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-left w-full"
            >
              <ChevronRight
                className={cn(
                  "size-4 transition-transform",
                  isOpen && "rotate-90",
                )}
              />
              {section.title && (
                <h3 className="text-lg font-semibold">{section.title}</h3>
              )}
            </button>
          </CollapsibleTrigger>
          {section.description && (
            <p className="text-sm text-muted-foreground mt-1 ml-6">
              {section.description}
            </p>
          )}
        </div>
        <CollapsibleContent className="ml-6">{content}</CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="mb-6">
      {section.title && (
        <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
      )}
      {section.description && (
        <p className="text-sm text-muted-foreground mb-4">
          {section.description}
        </p>
      )}
      {content}
    </div>
  );
}

interface PageRendererProps {
  page: FormPage;
  formData: FormSubmissionData;
  onChange: (fieldName: string, value: unknown) => void;
  errors: Record<string, string>;
}

function PageRenderer({ page, formData, onChange, errors }: PageRendererProps) {
  return (
    <div>
      {page.title && <h2 className="text-xl font-bold mb-2">{page.title}</h2>}
      {page.description && (
        <p className="text-muted-foreground mb-6">{page.description}</p>
      )}
      {page.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          formData={formData}
          onChange={onChange}
          errors={errors}
        />
      ))}
    </div>
  );
}

export function FormRenderer({
  schema,
  onSubmit,
  className,
}: FormRendererProps) {
  const [currentPageIndex, setCurrentPageIndex] = React.useState(0);
  const [formData, setFormData] = React.useState<FormSubmissionData>(() => {
    const initialData: FormSubmissionData = {};
    schema.pages.forEach((page) => {
      page.sections.forEach((section) => {
        section.fields.forEach((field) => {
          if (field.defaultValue !== undefined) {
            initialData[field.name] = field.defaultValue as
              | string
              | number
              | boolean
              | string[];
          }
        });
      });
    });
    return initialData;
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const totalPages = schema.pages.length;
  const isMultiPage = totalPages > 1;
  const currentPage = schema.pages[currentPageIndex];
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === totalPages - 1;
  const progress = ((currentPageIndex + 1) / totalPages) * 100;

  function onFieldChange(fieldName: string, value: unknown) {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value as string | number | boolean | string[] | null,
    }));
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }

    if (!isLastPage && shouldAutoAdvance(currentPage)) {
      setTimeout(() => {
        setCurrentPageIndex((prev) => prev + 1);
      }, 300);
    }
  }

  function validatePage(page: FormPage): boolean {
    const newErrors: Record<string, string> = {};

    page.sections.forEach((section) => {
      section.fields.forEach((field) => {
        const value = formData[field.name];
        const validation = field.validation;

        if (validation?.required) {
          const isEmpty =
            value === undefined ||
            value === null ||
            value === "" ||
            (Array.isArray(value) && value.length === 0);

          if (isEmpty) {
            newErrors[field.name] =
              validation.requiredMessage ?? `${field.label} is required`;
          }
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function onPrevious() {
    if (!isFirstPage) {
      setCurrentPageIndex((prev) => prev - 1);
    }
  }

  function onNext() {
    if (validatePage(currentPage)) {
      if (!isLastPage) {
        setCurrentPageIndex((prev) => prev + 1);
      }
    }
  }

  async function onFormSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!validatePage(currentPage)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmit?.(formData);
      if (result !== false) {
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitButtonPosition = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  };

  const theme = schema.settings.theme;
  const themeStyles = themeToStyleVars(theme);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link rel="stylesheet" href={theme.font.url} />

      <div
        style={{
          ...(theme.body as React.CSSProperties),
          fontFamily: `"${theme.font.family}", ui-sans-serif, system-ui, sans-serif`,
        }}
      >
        <div
          style={{
            ...(theme.container as React.CSSProperties),
            margin: "0 auto",
          }}
        >
          <div
            className={cn(theme.mode === "dark" && "dark")}
            style={themeStyles}
          >
            {isSubmitted && schema.settings.successAction.type === "message" ? (
              <div className={cn("space-y-4", className)}>
                {schema.settings.successAction.richContent ? (
                  <ContentBlockRenderer
                    content={schema.settings.successAction.richContent}
                  />
                ) : schema.settings.successAction.message ? (
                  <p className="text-foreground">
                    {schema.settings.successAction.message}
                  </p>
                ) : (
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
                    <p className="text-muted-foreground">
                      Your submission has been received.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={onFormSubmit}
                className={cn("space-y-6", className)}
              >
                {schema.title && (
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold">{schema.title}</h1>
                    {schema.description && (
                      <p className="text-muted-foreground mt-1">
                        {schema.description}
                      </p>
                    )}
                  </div>
                )}

                {isMultiPage && schema.settings.showProgressBar && (
                  <div className="mb-6">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span>
                        Page {currentPageIndex + 1} of {totalPages}
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                <PageRenderer
                  page={currentPage}
                  formData={formData}
                  onChange={onFieldChange}
                  errors={errors}
                />

                {(() => {
                  const showSubmitButton = !isMultiPage || isLastPage;
                  const isFullWidth =
                    showSubmitButton && schema.settings.submitButton.fullWidth;

                  const previousButton = isMultiPage && (
                    <Button
                      type="button"
                      variant="link"
                      onClick={onPrevious}
                      disabled={isFirstPage}
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      Previous
                    </Button>
                  );

                  return (
                    <div
                      className={cn(
                        "flex pt-4",
                        isFullWidth
                          ? "flex-col gap-1 items-center"
                          : "flex-row gap-3",
                        !isFullWidth &&
                          (isMultiPage
                            ? "justify-between"
                            : submitButtonPosition[
                                schema.settings.submitButton.position
                              ]),
                      )}
                    >
                      {!isFullWidth && previousButton}

                      {isMultiPage && !isLastPage ? (
                        <Button type="button" onClick={onNext}>
                          Next
                          <ChevronRight className="size-4 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          variant={schema.settings.submitButton.variant}
                          size={schema.settings.submitButton.size}
                          disabled={isSubmitting}
                          className={cn(isFullWidth && "w-full")}
                        >
                          {isSubmitting
                            ? schema.settings.submitButton.loadingText
                            : schema.settings.submitButton.text}
                        </Button>
                      )}

                      {isFullWidth && previousButton}
                    </div>
                  );
                })()}
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
