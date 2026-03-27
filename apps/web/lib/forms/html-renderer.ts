import * as cheerio from "cheerio";

/**
 * State to render into the form HTML.
 * Populated from query params after a submission redirect.
 */
export interface FormRenderState {
  status?: "success" | "error";
  errors?: Record<string, string>;
  message?: string;
  values?: Record<string, string>;
}

/**
 * Render form HTML with submission state.
 *
 * After a form submission, the server redirects back to the form page with
 * state encoded in query params. This function processes the stored HTML
 * to show errors, success messages, and repopulate field values.
 *
 * Uses data-kibamail-* attributes:
 * - data-kibamail-error="{fieldName}" — per-field error text
 * - data-kibamail-error-summary — shown on server errors
 * - data-kibamail-error-message — server error text
 * - data-kibamail-success — shown on success, form hidden
 */
export function renderFormHtml(html: string, state: FormRenderState): string {
  if (!state.status) return html;

  const $ = cheerio.load(html);

  if (state.status === "success") {
    renderSuccess($);
  } else if (state.status === "error") {
    if (state.errors) {
      renderFieldErrors($, state.errors);
    }
    if (state.message) {
      renderServerError($, state.message);
    }
    if (state.values) {
      repopulateValues($, state.values);
    }
  }

  return $.html();
}

function renderSuccess($: cheerio.CheerioAPI): void {
  $("form").attr("hidden", "");
  $("[data-kibamail-success]").removeAttr("hidden");
}

function renderFieldErrors(
  $: cheerio.CheerioAPI,
  errors: Record<string, string>,
): void {
  for (const [field, message] of Object.entries(errors)) {
    const errorEl = $(`[data-kibamail-error="${field}"]`);
    if (errorEl.length) {
      errorEl.text(message);
      errorEl.removeAttr("hidden");
    }
  }
}

function renderServerError($: cheerio.CheerioAPI, message: string): void {
  $("[data-kibamail-error-summary]").removeAttr("hidden");
  const messageEl = $("[data-kibamail-error-message]");
  if (messageEl.length) {
    messageEl.text(message);
  }
}

function repopulateValues(
  $: cheerio.CheerioAPI,
  values: Record<string, string>,
): void {
  for (const [name, value] of Object.entries(values)) {
    const inputs = $(`form [name="${name}"]`);

    inputs.each((_i, el) => {
      const $el = $(el);
      const tagName = ((el as any).tagName as string | undefined)?.toLowerCase();

      if (tagName === "textarea") {
        $el.text(value);
      } else if (tagName === "select") {
        // Remove existing selected, set the matching option
        $el.find("option").removeAttr("selected");
        $el.find(`option[value="${value}"]`).attr("selected", "");
      } else if (tagName === "input") {
        const type = $el.attr("type")?.toLowerCase();
        if (type === "checkbox" || type === "radio") {
          if ($el.attr("value") === value) {
            $el.attr("checked", "");
          } else {
            $el.removeAttr("checked");
          }
        } else {
          $el.attr("value", value);
        }
      }
    });
  }
}
