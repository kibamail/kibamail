"use client";

import { Plus, Trash } from "iconoir-react";
import { useFormBuilder } from "./form-builder-context";
import type { FormField, FormSection } from "./types";

function FieldRenderer({ field, isSelected, onClick, onRemove }: {
  field: FormField;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? "border-kb-primary bg-kb-primary/5"
          : "border-kb-border-tertiary hover:border-kb-border-primary bg-kb-surface-primary"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-kb-content-primary mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {field.type === "text" && (
            <input
              type="text"
              placeholder={field.placeholder || "Enter text..."}
              disabled
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
            />
          )}

          {field.type === "email" && (
            <input
              type="email"
              placeholder={field.placeholder || "email@example.com"}
              disabled
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
            />
          )}

          {field.type === "number" && (
            <input
              type="number"
              placeholder={field.placeholder || "0"}
              disabled
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
            />
          )}

          {field.type === "phone" && (
            <input
              type="tel"
              placeholder={field.placeholder || "+1 (555) 000-0000"}
              disabled
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
            />
          )}

          {field.type === "textarea" && (
            <textarea
              placeholder={field.placeholder || "Enter long text..."}
              disabled
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm resize-none"
            />
          )}

          {field.type === "select" && (
            <select
              disabled
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
            >
              <option>Select an option...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {field.type === "radio" && (
            <div className="space-y-2">
              {field.options?.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    disabled
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-kb-content-secondary">{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {field.type === "checkbox" && (
            <div className="space-y-2">
              {field.options?.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    disabled
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-kb-content-secondary">{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {field.type === "date" && (
            <input
              type="date"
              disabled
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
            />
          )}

          {field.type === "url" && (
            <input
              type="url"
              placeholder={field.placeholder || "https://example.com"}
              disabled
              className="w-full px-3 py-2 rounded-md border border-kb-border-secondary bg-kb-surface-secondary text-kb-content-tertiary text-sm"
            />
          )}

          {field.type === "hidden" && (
            <div className="px-3 py-2 rounded-md border border-dashed border-kb-border-secondary bg-kb-surface-tertiary text-kb-content-tertiary text-sm">
              Hidden field (not visible to users)
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-kb-content-tertiary hover:text-red-500 transition-all"
        >
          <Trash className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SectionRenderer({ section, pageIndex, isSelected, onSelectSection }: {
  section: FormSection;
  pageIndex: number;
  isSelected: boolean;
  onSelectSection: () => void;
}) {
  const { selectedFieldId, selectField, removeField, removeSection } = useFormBuilder();

  return (
    <div
      className={`rounded-xl border-2 transition-all ${
        isSelected
          ? "border-kb-primary/50 bg-kb-primary/5"
          : "border-kb-border-tertiary bg-kb-surface-primary"
      }`}
    >
      <div
        onClick={onSelectSection}
        className="flex items-center justify-between p-4 border-b border-kb-border-tertiary cursor-pointer hover:bg-kb-surface-secondary transition-colors"
      >
        <div>
          <h3 className="text-sm font-medium text-kb-content-primary">
            {section.title || "Section"}
          </h3>
          {section.description && (
            <p className="text-xs text-kb-content-tertiary mt-0.5">
              {section.description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeSection(pageIndex, section.id);
          }}
          className="p-1.5 rounded-md hover:bg-red-50 text-kb-content-tertiary hover:text-red-500 transition-all"
        >
          <Trash className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {section.fields.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-kb-border-secondary rounded-lg">
            <p className="text-sm text-kb-content-tertiary">
              No fields yet. Click a field from the sidebar to add it here.
            </p>
          </div>
        ) : (
          section.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              isSelected={selectedFieldId === field.id}
              onClick={() => selectField(field.id)}
              onRemove={() => removeField(pageIndex, section.id, field.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function FormCanvas() {
  const {
    schema,
    selectedPageIndex,
    selectedSectionId,
    addSection,
    selectSection,
    addPage,
    selectPage,
  } = useFormBuilder();

  const currentPage = schema.pages[selectedPageIndex];

  return (
    <div className="flex-1 h-full bg-kb-bg-primary flex flex-col">
      {/* Page tabs */}
      {schema.pages.length > 1 && (
        <div className="flex items-center gap-2 px-6 py-3 border-b border-kb-border-tertiary bg-kb-surface-secondary">
          {schema.pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              onClick={() => selectPage(index)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                selectedPageIndex === index
                  ? "bg-kb-primary text-white"
                  : "text-kb-content-secondary hover:bg-kb-surface-tertiary"
              }`}
            >
              {page.title || `Page ${index + 1}`}
            </button>
          ))}
          <button
            type="button"
            onClick={addPage}
            className="p-1.5 rounded-md text-kb-content-tertiary hover:bg-kb-surface-tertiary hover:text-kb-content-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Canvas content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-8 px-6">
          {currentPage && (
            <>
              {/* Page header */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-kb-content-primary">
                  {currentPage.title || "Untitled Page"}
                </h2>
                {currentPage.description && (
                  <p className="text-sm text-kb-content-secondary mt-1">
                    {currentPage.description}
                  </p>
                )}
              </div>

              {/* Sections */}
              <div className="space-y-6">
                {currentPage.sections.map((section) => (
                  <SectionRenderer
                    key={section.id}
                    section={section}
                    pageIndex={selectedPageIndex}
                    isSelected={selectedSectionId === section.id}
                    onSelectSection={() => selectSection(section.id)}
                  />
                ))}

                {/* Add section button */}
                <button
                  type="button"
                  onClick={() => addSection(selectedPageIndex)}
                  className="w-full py-4 border-2 border-dashed border-kb-border-secondary rounded-xl text-kb-content-tertiary hover:border-kb-border-primary hover:text-kb-content-secondary transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Section</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
