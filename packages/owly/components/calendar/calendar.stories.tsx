import React, { useState } from "react";
import type { Meta, StoryFn } from "@storybook/react";

import { Calendar } from "./calendar";

const meta = {
 title: "Components/Calendar",
} satisfies Meta<typeof Calendar>;

export default meta;

type ButtonStoryFn = StoryFn<typeof Calendar>;

export const Variants: ButtonStoryFn = () => {
 return (
  <>
   <div className="box">
    <h5>Default - Day Picker</h5>
    <div>
     <Calendar datePickerProps={{ dates: { minDate: new Date() } }} />
    </div>
   </div>
  </>
 );
};

export const Sizes: ButtonStoryFn = () => {
 const [mediumDates, setMediumDates] = useState<Date[]>([]);
 const [smallDates, setSmallDates] = useState<Date[]>([]);

 return (
  <div style={{ display: "flex", gap: "40px", padding: "40px", alignItems: "flex-start" }}>
   <div>
    <h5 style={{ marginBottom: "16px" }}>Medium (Default)</h5>
    <Calendar
     size="md"
     dates={mediumDates}
     onDatesChange={setMediumDates}
    />
   </div>

   <div>
    <h5 style={{ marginBottom: "16px" }}>Small</h5>
    <Calendar
     size="sm"
     dates={smallDates}
     onDatesChange={setSmallDates}
    />
   </div>
  </div>
 );
};
