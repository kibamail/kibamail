import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import * as EmptyCard from "./empty-card";
import { Button } from "../button/button";

import "./empty-card.css";
import "../button/button.css";

const meta: Meta<typeof EmptyCard> = {
  title: "Components/EmptyCard",
};

type EmptyCardStoryFn = StoryFn<typeof EmptyCard>;

export const Default: EmptyCardStoryFn = () => {
  return (
    <div style={{ padding: "40px", maxWidth: "760px" }}>
      <EmptyCard.Root>
        <EmptyCard.Title>No files uploaded</EmptyCard.Title>
        <EmptyCard.Description>
          Upload your first file to get started
        </EmptyCard.Description>
      </EmptyCard.Root>
    </div>
  );
};

export const WithAction: EmptyCardStoryFn = () => {
  return (
    <div style={{ padding: "40px", maxWidth: "760px" }}>
      <EmptyCard.Root>
        <EmptyCard.Title>No team members yet</EmptyCard.Title>
        <EmptyCard.Description>
          Invite your team members to collaborate on this project
        </EmptyCard.Description>
        <EmptyCard.Action>
          <Button variant="primary" size="sm">
            Invite Team Members
          </Button>
        </EmptyCard.Action>
      </EmptyCard.Root>
    </div>
  );
};

export const NoResults: EmptyCardStoryFn = () => {
  return (
    <div style={{ padding: "40px", maxWidth: "760px" }}>
      <EmptyCard.Root>
        <EmptyCard.Title>No results found</EmptyCard.Title>
        <EmptyCard.Description>
          Try adjusting your search or filter to find what you're looking for
        </EmptyCard.Description>
      </EmptyCard.Root>
    </div>
  );
};

export const EmptyInbox: EmptyCardStoryFn = () => {
  return (
    <div style={{ padding: "40px", maxWidth: "760px" }}>
      <EmptyCard.Root>
        <EmptyCard.Title>All caught up!</EmptyCard.Title>
        <EmptyCard.Description>
          You have no new messages in your inbox
        </EmptyCard.Description>
      </EmptyCard.Root>
    </div>
  );
};

export const NoData: EmptyCardStoryFn = () => {
  return (
    <div style={{ padding: "40px", maxWidth: "760px" }}>
      <EmptyCard.Root>
        <EmptyCard.Title>No data available</EmptyCard.Title>
        <EmptyCard.Description>
          There's no data to display at the moment. Check back later or try
          refreshing the page.
        </EmptyCard.Description>
      </EmptyCard.Root>
    </div>
  );
};

export default meta;
