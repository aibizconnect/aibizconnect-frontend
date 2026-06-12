/**
 * Shared option lists for the Settings hub. These MUST live outside the "use server"
 * action files: Next 16 hard-errors when a "use server" module exports anything that
 * isn't an async function ("found object"), which silently killed EVERY server action
 * on the Settings page (the production-masked crash Ali hit).
 */

export const FIELD_TYPES = ["text", "textarea", "number", "date", "dropdown", "checkbox", "phone", "email", "url"] as const;
export type CustomFieldType = (typeof FIELD_TYPES)[number];

export const TRIGGER_TYPES = ["tag_added", "field_equals", "form_submitted", "email_opened", "link_clicked", "page_visited"] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  tag_added: "Tag added",
  field_equals: "Field equals value",
  form_submitted: "Form submitted",
  email_opened: "Email opened",
  link_clicked: "Link clicked",
  page_visited: "Page visited",
};
