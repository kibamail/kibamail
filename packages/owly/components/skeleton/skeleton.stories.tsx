import type { Meta, StoryFn } from "@storybook/react";
import * as React from "react";
import { Skeleton } from "./skeleton";
import { Text } from "../text/text";
import { Heading } from "../heading/heading";
import { Button } from "../button/button";

import "./skeleton.css";
import "../text/text.css";
import "../heading/heading.css";
import "../button/button.css";

const meta: Meta<typeof Skeleton> = {
  title: "Components/Skeleton",
};

type SkeletonStoryFn = StoryFn<typeof Skeleton>;

export const Default: SkeletonStoryFn = () => {
  return (
    <div className="box">
      <h5>Basic Skeleton</h5>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Skeleton />
        <Skeleton width="80%" />
        <Skeleton width="60%" />
      </div>
    </div>
  );
};

export const WithDimensions: SkeletonStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Custom Width and Height</h5>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Skeleton width="100%" height="40px" />
          <Skeleton width="200px" height="20px" />
          <Skeleton width="150px" height="60px" />
        </div>
      </div>

      <div className="box">
        <h5>Numeric Dimensions</h5>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Skeleton width={300} height={24} />
          <Skeleton width={250} height={16} />
          <Skeleton width={200} height={32} />
        </div>
      </div>
    </>
  );
};

export const Variants: SkeletonStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Default Variant</h5>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Skeleton width="100%" height="20px" />
          <Skeleton width="80%" height="20px" />
          <Skeleton width="60%" height="20px" />
        </div>
      </div>

      <div className="box">
        <h5>Circle Variant</h5>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Skeleton variant="circle" />
          <Skeleton variant="circle" width="48px" height="48px" />
          <Skeleton variant="circle" width="64px" height="64px" />
          <Skeleton variant="circle" width="80px" height="80px" />
        </div>
      </div>
    </>
  );
};

export const Speeds: SkeletonStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Slow</h5>
        <Skeleton speed="slow" width="100%" height="20px" />
      </div>

      <div className="box">
        <h5>Normal (Default)</h5>
        <Skeleton speed="normal" width="100%" height="20px" />
      </div>

      <div className="box">
        <h5>Fast</h5>
        <Skeleton speed="fast" width="100%" height="20px" />
      </div>
    </>
  );
};

export const InlineText: SkeletonStoryFn = () => {
  const [loading, setLoading] = React.useState(true);

  return (
    <div className="box">
      <h5>Inline Text Skeleton</h5>
      <div style={{ marginBottom: "16px" }}>
        <Button onClick={() => setLoading(!loading)}>
          {loading ? "Show Content" : "Show Skeleton"}
        </Button>
      </div>
      <div>
        <Text as="p" size="md">
          <Skeleton loading={loading}>
            This is a paragraph of text that can be wrapped with a skeleton
            loader. When loading is true, the text is hidden and replaced with
            a skeleton.
          </Skeleton>
        </Text>
      </div>
    </div>
  );
};

export const CardExample: SkeletonStoryFn = () => {
  const [loading, setLoading] = React.useState(true);

  return (
    <div className="box">
      <h5>Card with Skeleton</h5>
      <div style={{ marginBottom: "16px" }}>
        <Button onClick={() => setLoading(!loading)}>
          {loading ? "Load Content" : "Show Skeleton"}
        </Button>
      </div>
      <div
        style={{
          border: "1px solid var(--border-tertiary)",
          borderRadius: "var(--radius-md)",
          padding: "var(--sp-xl)",
          maxWidth: "400px",
        }}
      >
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <Skeleton loading={loading} variant="circle" width="48px" height="48px">
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "var(--gray-100)",
              }}
            />
          </Skeleton>
          <div style={{ flex: 1 }}>
            <Skeleton loading={loading} width="60%" height="20px">
              <Heading as="h3" size="xs">
                John Doe
              </Heading>
            </Skeleton>
            <Skeleton loading={loading} width="40%" height="16px" style={{ marginTop: "4px" }}>
              <Text as="p" size="sm">
                Software Engineer
              </Text>
            </Skeleton>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Skeleton loading={loading} width="100%" height="16px">
            <Text as="p" size="sm">
              Building amazing web applications with modern technologies.
            </Text>
          </Skeleton>
          <Skeleton loading={loading} width="90%" height="16px">
            <Text as="p" size="sm">
              Passionate about creating great user experiences.
            </Text>
          </Skeleton>
          <Skeleton loading={loading} width="70%" height="16px">
            <Text as="p" size="sm">
              Always learning something new.
            </Text>
          </Skeleton>
        </div>
      </div>
    </div>
  );
};

export const ListExample: SkeletonStoryFn = () => {
  return (
    <div className="box">
      <h5>List Skeleton</h5>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              padding: "12px",
              border: "1px solid var(--border-tertiary)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <Skeleton variant="circle" width="40px" height="40px" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
              <Skeleton width="70%" height="16px" />
              <Skeleton width="50%" height="12px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TableExample: SkeletonStoryFn = () => {
  return (
    <div className="box">
      <h5>Table Skeleton</h5>
      <div style={{ border: "1px solid var(--border-tertiary)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "var(--background-secondary)" }}>
            <tr>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid var(--border-tertiary)" }}>
                <Skeleton width="80px" height="16px" />
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid var(--border-tertiary)" }}>
                <Skeleton width="60px" height="16px" />
              </th>
              <th style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid var(--border-tertiary)" }}>
                <Skeleton width="70px" height="16px" />
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((row) => (
              <tr key={row}>
                <td style={{ padding: "12px", borderBottom: "1px solid var(--border-tertiary)" }}>
                  <Skeleton width="90%" height="14px" />
                </td>
                <td style={{ padding: "12px", borderBottom: "1px solid var(--border-tertiary)" }}>
                  <Skeleton width="70%" height="14px" />
                </td>
                <td style={{ padding: "12px", borderBottom: "1px solid var(--border-tertiary)" }}>
                  <Skeleton width="80%" height="14px" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default meta;
