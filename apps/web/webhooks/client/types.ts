import type { components } from "./schema";

// Extended field type with the key attribute that's missing from generated schema
export interface DestinationSchemaField
  extends Omit<components["schemas"]["DestinationSchemaField"], "type"> {
  type: "text" | "checkbox";
  key: string;
  label?: string;
  description?: string;
  required: boolean;
  sensitive?: boolean;
  default?: string;
  minlength?: number;
  maxlength?: number;
  pattern?: string;
}

// Extended destination type with corrected field types
export interface WebhookDestinationType
  extends Omit<
    components["schemas"]["DestinationTypeSchema"],
    "config_fields" | "credential_fields"
  > {
  type?: string;
  label?: string;
  description?: string;
  icon?: string;
  instructions?: string;
  remote_setup_url?: string;
  config_fields?: DestinationSchemaField[];
  credential_fields?: DestinationSchemaField[];
}

export type WebhookDestination = components["schemas"]["Destination"];
export type WebhookEvent = components["schemas"]["Event"];
export type DeliveryAttempt = components["schemas"]["DeliveryAttempt"] & {
  id: string;
  response_data?: {
    body: object | string;
    status: number;
  };
};
