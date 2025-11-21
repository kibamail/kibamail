"use client";

import { Button } from "@kibamail/owly";
import {
  Clock,
  DataTransferBoth,
  Mail,
  MinusCircle,
  NavArrowLeft,
  NetworkReverse,
  Percentage,
  PlusCircle,
  User,
  UserXmark,
} from "iconoir-react";
import { useCallback } from "react";
import { useFlowStore } from "../state/flow-store";
import { AddNodeCard } from "./add-node-card";
import { TriggerConfiguration } from "./configurations/trigger-configuration";
import { PercentageSplitConfiguration } from "./configurations/percentage-split-configuration";

const actionNodes = [
  { id: "send-email", label: "Send email", icon: Mail },
  { id: "send-webhook", label: "Send webhook", icon: DataTransferBoth },
  { id: "update-contact", label: "Update contact", icon: User },
  { id: "unsubscribe-contact", label: "Unsubscribe contact", icon: UserXmark },
  { id: "add-to-topic", label: "Add contact to topic", icon: PlusCircle },
  {
    id: "remove-from-topic",
    label: "Remove contact from topic",
    icon: MinusCircle,
  },
];

const ruleNodes = [
  { id: "if-else", label: "If/else", icon: NetworkReverse },
  { id: "percentage-split", label: "Percentage split", icon: Percentage },
  { id: "time-delay", label: "Time delay", icon: Clock },
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

  const handleAddNode = useCallback(
    (nodeType: string) => {
      const nodeId = `${nodeType}-${Date.now()}`;

      // Set default data based on node type
      let data = {};
      if (nodeType === "percentage-split") {
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
    // Determine which configuration to show based on node type
    const isTriggerNode =
      selectedNode.type === "form-filled" ||
      selectedNode.type === "contact-subscribed" ||
      selectedNode.type === "contact-property-updated" ||
      selectedNode.type === "webhook-trigger";

    const isPercentageSplitNode = selectedNode.type === "percentage-split";

    return (
      <div className="w-[360px] box-border p-4 shrink-0 h-full border-l border-kb-border-tertiary flex flex-col gap-6">
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          <Button
            variant="tertiary"
            size="sm"
            onClick={closeNodeConfiguration}
            className="shrink-0"
          >
            <NavArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-base font-semibold text-kb-content-primary">
            Configure Node
          </h2>
        </div>

        {/* Configuration content based on node type */}
        {isTriggerNode && <TriggerConfiguration />}
        {isPercentageSplitNode && <PercentageSplitConfiguration />}
      </div>
    );
  }

  // Node selector mode (default)
  return (
    <div className="w-[360px] box-border p-4 shrink-0 h-full border-l border-kb-border-tertiary flex flex-col gap-6">
      {/* Actions Group */}
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
              onClick={() => handleAddNode(node.id)}
            />
          ))}
        </div>
      </div>

      {/* Rules Group */}
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
              onClick={() => handleAddNode(node.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
