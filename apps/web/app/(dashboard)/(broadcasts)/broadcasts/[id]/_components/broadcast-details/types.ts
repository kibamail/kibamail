import type { SendingDomain } from "@prisma/client";
import type {
  TransformedSenderIdentity,
  CreatedDomain,
} from "@/components/sender-select";

export type { TransformedSenderIdentity, CreatedDomain };

export interface BroadcastDetails {
  subject: string;
  previewText: string;
  senderIdentityId?: string;
  topicId?: string;
  segmentId?: string;
  sendAt?: Date;
}

export type Domain = Pick<SendingDomain, "id" | "name">;

export interface SenderSelectState {
  localPart: string;
  domainId: string;
  isAddingNew: boolean;
}

export interface SenderSelectActions {
  onLocalPartChange: (value: string) => void;
  onDomainIdChange: (id: string) => void;
  onIsAddingNewChange: (value: boolean) => void;
  onDomainCreated?: (domain: CreatedDomain) => void;
}
