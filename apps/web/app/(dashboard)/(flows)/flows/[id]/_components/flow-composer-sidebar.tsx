"use client";

import { Button } from "@kibamail/owly";
import {
  ArrowLeft,
  Clock,
  DataTransferBoth,
  Mail,
  MinusCircle,
  NetworkReverse,
  Percentage,
  PlusCircle,
  User,
  UserXmark,
} from "iconoir-react";
import { useCallback } from "react";
import {
  ActionNodeType,
  RuleNodeType,
  isTriggerNodeType,
} from "@/app/(dashboard)/(flows)/flows/[id]/types/node-types";
import { useFlowStore } from "@/app/(dashboard)/(flows)/flows/[id]/state/flow-store";
import { AddNodeCard } from "./add-node-card";
import { TriggerConfiguration } from "./configurations/trigger-configuration";
import { PercentageSplitConfiguration } from "./configurations/percentage-split-configuration";
import { UpdateContactConfig } from "./configurations/update-contact-config";
import {
  AddToTopicConfig,
  RemoveFromTopicConfig,
} from "./configurations/topic-config";
import { TimeDelayConfig } from "./configurations/time-delay-config";
import { IfElseConfig } from "./configurations/if-else-config";

const actionNodes = [
  { id: ActionNodeType.SEND_EMAIL, label: "Send email", icon: Mail },
  {
    id: ActionNodeType.SEND_WEBHOOK,
    label: "Send webhook",
    icon: DataTransferBoth,
  },
  { id: ActionNodeType.UPDATE_CONTACT, label: "Update contact", icon: User },
  {
    id: ActionNodeType.UNSUBSCRIBE_CONTACT,
    label: "Unsubscribe contact",
    icon: UserXmark,
  },
  {
    id: ActionNodeType.ADD_TO_TOPIC,
    label: "Add contact to topic",
    icon: PlusCircle,
  },
  {
    id: ActionNodeType.REMOVE_FROM_TOPIC,
    label: "Remove contact from topic",
    icon: MinusCircle,
  },
];

const ruleNodes = [
  { id: RuleNodeType.IF_ELSE, label: "If/else", icon: NetworkReverse },
  {
    id: RuleNodeType.PERCENTAGE_SPLIT,
    label: "Percentage split",
    icon: Percentage,
  },
  { id: RuleNodeType.TIME_DELAY, label: "Time delay", icon: Clock },
];

export function FlowComposerSidebar() {
  const {
    setNodes,
    nodes,
    sidebarScreen,
    selectedNodeId,
    closeNodeConfiguration,
  } = useFlowStore();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const isConfigurationMode = sidebarScreen === "node-configuration";

  const onAddNode = useCallback(
    (nodeType: string) => {
      const nodeId = `${nodeType}-${Date.now()}`;

      let data = {};
      if (nodeType === RuleNodeType.PERCENTAGE_SPLIT) {
        data = {
          splits: [
            { id: "branch-a", name: "A", percentage: 50 },
            { id: "branch-b", name: "B", percentage: 50 },
          ],
        };
      }

      const newNode = {
        id: nodeId,
        type: nodeType,
        position: { x: 250, y: 250 },
        data,
      };

      setNodes([...nodes, newNode]);
    },
    [setNodes, nodes]
  );

  if (isConfigurationMode && selectedNode) {
    const nodeType = selectedNode.type as string;
    const isTriggerNode = isTriggerNodeType(nodeType);
    const isPercentageSplitNode = nodeType === RuleNodeType.PERCENTAGE_SPLIT;
    const isUpdateContactNode = nodeType === ActionNodeType.UPDATE_CONTACT;
    const isAddToTopicNode = nodeType === ActionNodeType.ADD_TO_TOPIC;
    const isRemoveFromTopicNode = nodeType === ActionNodeType.REMOVE_FROM_TOPIC;
    const isTimeDelayNode = nodeType === RuleNodeType.TIME_DELAY;
    const isIfElseNode = nodeType === RuleNodeType.IF_ELSE;

    return (
      <div className="w-[390px] box-border shrink-0 h-full border-l border-kb-border-tertiary flex flex-col bg-kb-bg-layout">
        <div className="flex items-center gap-3 h-12 px-3 border-b border-kb-border-tertiary">
          <Button
            variant="tertiary"
            size="sm"
            onClick={closeNodeConfiguration}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4">
          {isTriggerNode && <TriggerConfiguration />}
          {isPercentageSplitNode && <PercentageSplitConfiguration />}
          {isUpdateContactNode && <UpdateContactConfig />}
          {isAddToTopicNode && <AddToTopicConfig />}
          {isRemoveFromTopicNode && <RemoveFromTopicConfig />}
          {isTimeDelayNode && <TimeDelayConfig />}
          {isIfElseNode && <IfElseConfig />}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[390px] box-border p-4 shrink-0 h-full border-l border-kb-border-tertiary flex flex-col gap-6 bg-kb-bg-layout">
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-kb-content-tertiary uppercase tracking-wider">
          Actions
        </h3>
        <div className="flex flex-col gap-2">
          {actionNodes.map((node) => (
            <AddNodeCard
              key={node.id}
              icon={<node.icon className="w-5 h-5" />}
              label={node.label}
              onClick={() => onAddNode(node.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-kb-content-tertiary uppercase tracking-wider">
          Rules
        </h3>
        <div className="flex flex-col gap-2">
          {ruleNodes.map((node) => (
            <AddNodeCard
              key={node.id}
              icon={<node.icon className="w-5 h-5" />}
              label={node.label}
              onClick={() => onAddNode(node.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
