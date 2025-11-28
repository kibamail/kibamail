import type { Meta, StoryFn } from "@storybook/react"
import * as React from "react"
import { LetterAvatar } from "./letter-avatar"

import "./letter-avatar.css"

const meta: Meta<typeof LetterAvatar> = {
  title: "Components/LetterAvatar",
  component: LetterAvatar,
}

type LetterAvatarStoryFn = StoryFn<typeof LetterAvatar>

export const Sizes: LetterAvatarStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Extra Small - 20px</h5>
        <LetterAvatar size="xs" color="info">
          John Doe
        </LetterAvatar>
      </div>
      <div className="box">
        <h5>Small - 40px</h5>
        <LetterAvatar size="sm" color="info">
          John Doe
        </LetterAvatar>
      </div>
      <div className="box">
        <h5>Medium - 60px (default)</h5>
        <LetterAvatar size="md" color="info">
          John Doe
        </LetterAvatar>
      </div>
      <div className="box">
        <h5>Large - 80px</h5>
        <LetterAvatar size="lg" color="info">
          John Doe
        </LetterAvatar>
      </div>
      <div className="box">
        <h5>Extra Large - 100px</h5>
        <LetterAvatar size="xl" color="info">
          John Doe
        </LetterAvatar>
      </div>
    </>
  )
}

export const AllSizesTogether: LetterAvatarStoryFn = () => {
  return (
    <div className="box">
      <h5>All Sizes: 20px, 40px, 60px, 80px, 100px</h5>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <LetterAvatar size="xs" color="info">
          John
        </LetterAvatar>
        <LetterAvatar size="sm" color="info">
          John
        </LetterAvatar>
        <LetterAvatar size="md" color="info">
          John
        </LetterAvatar>
        <LetterAvatar size="lg" color="info">
          John
        </LetterAvatar>
        <LetterAvatar size="xl" color="info">
          John
        </LetterAvatar>
      </div>
    </div>
  )
}

export const AutoColorDetection: LetterAvatarStoryFn = () => {
  return (
    <div className="box">
      <h5>Automatic Color Detection (No color prop specified)</h5>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        <LetterAvatar>Alice</LetterAvatar>
        <LetterAvatar>Bob</LetterAvatar>
        <LetterAvatar>Charlie</LetterAvatar>
        <LetterAvatar>Diana</LetterAvatar>
        <LetterAvatar>Ethan</LetterAvatar>
        <LetterAvatar>Fiona</LetterAvatar>
        <LetterAvatar>George</LetterAvatar>
        <LetterAvatar>Hannah</LetterAvatar>
        <LetterAvatar>Isaac</LetterAvatar>
        <LetterAvatar>Julia</LetterAvatar>
        <LetterAvatar>Kevin</LetterAvatar>
        <LetterAvatar>Laura</LetterAvatar>
        <LetterAvatar>Mike</LetterAvatar>
        <LetterAvatar>Nina</LetterAvatar>
        <LetterAvatar>Oliver</LetterAvatar>
        <LetterAvatar>Paula</LetterAvatar>
        <LetterAvatar>Quinn</LetterAvatar>
        <LetterAvatar>Rachel</LetterAvatar>
        <LetterAvatar>Sam</LetterAvatar>
        <LetterAvatar>Tina</LetterAvatar>
        <LetterAvatar>Uma</LetterAvatar>
        <LetterAvatar>Victor</LetterAvatar>
        <LetterAvatar>Wendy</LetterAvatar>
        <LetterAvatar>Xander</LetterAvatar>
        <LetterAvatar>Yara</LetterAvatar>
        <LetterAvatar>Zoe</LetterAvatar>
      </div>
      <p style={{ marginTop: "16px", fontSize: "14px", color: "var(--content-secondary)" }}>
        Each letter is consistently mapped to the same color. Same starting letter = same color.
      </p>
    </div>
  )
}

export const ConsistentColors: LetterAvatarStoryFn = () => {
  return (
    <div className="box">
      <h5>Color Consistency Test</h5>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <p style={{ marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
            All names starting with "A" have the same color:
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <LetterAvatar>Alice</LetterAvatar>
            <LetterAvatar>Alex</LetterAvatar>
            <LetterAvatar>Andrew</LetterAvatar>
            <LetterAvatar>Amanda</LetterAvatar>
          </div>
        </div>
        <div>
          <p style={{ marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
            All names starting with "J" have the same color:
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <LetterAvatar>John</LetterAvatar>
            <LetterAvatar>Jane</LetterAvatar>
            <LetterAvatar>Jack</LetterAvatar>
            <LetterAvatar>Julia</LetterAvatar>
          </div>
        </div>
        <div>
          <p style={{ marginBottom: "8px", fontSize: "14px", fontWeight: 600 }}>
            All names starting with "M" have the same color:
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <LetterAvatar>Mike</LetterAvatar>
            <LetterAvatar>Mary</LetterAvatar>
            <LetterAvatar>Mark</LetterAvatar>
            <LetterAvatar>Michelle</LetterAvatar>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ManualColorOverride: LetterAvatarStoryFn = () => {
  return (
    <div className="box">
      <h5>Manual Color Override</h5>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <LetterAvatar>John</LetterAvatar>
          <p style={{ marginTop: "8px", fontSize: "12px" }}>Auto (J)</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <LetterAvatar color="notice">John</LetterAvatar>
          <p style={{ marginTop: "8px", fontSize: "12px" }}>Notice</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <LetterAvatar color="negative">John</LetterAvatar>
          <p style={{ marginTop: "8px", fontSize: "12px" }}>Negative</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <LetterAvatar color="positive">John</LetterAvatar>
          <p style={{ marginTop: "8px", fontSize: "12px" }}>Positive</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <LetterAvatar color="highlight">John</LetterAvatar>
          <p style={{ marginTop: "8px", fontSize: "12px" }}>Highlight</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <LetterAvatar color="info">John</LetterAvatar>
          <p style={{ marginTop: "8px", fontSize: "12px" }}>Info</p>
        </div>
      </div>
      <p style={{ marginTop: "16px", fontSize: "14px", color: "var(--content-secondary)" }}>
        Color prop overrides the auto-detected color
      </p>
    </div>
  )
}

export const Colors: LetterAvatarStoryFn = () => {
  return (
    <>
      <div className="box">
        <h5>Info</h5>
        <LetterAvatar color="info">John</LetterAvatar>
      </div>
      <div className="box">
        <h5>Notice</h5>
        <LetterAvatar color="notice">Sarah</LetterAvatar>
      </div>
      <div className="box">
        <h5>Negative</h5>
        <LetterAvatar color="negative">Mike</LetterAvatar>
      </div>
      <div className="box">
        <h5>Positive</h5>
        <LetterAvatar color="positive">Emma</LetterAvatar>
      </div>
      <div className="box">
        <h5>Highlight</h5>
        <LetterAvatar color="highlight">Alex</LetterAvatar>
      </div>
    </>
  )
}

export default meta
