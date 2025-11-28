import React, { useState } from "react";
import type { Meta, StoryFn } from "@storybook/react";

import { CalendarRange } from "./calendar-range";

const meta = {
 title: "Components/CalendarRange",
} satisfies Meta<typeof CalendarRange>;

export default meta;

type CalendarRangeStoryFn = StoryFn<typeof CalendarRange>;

export const Variants: CalendarRangeStoryFn = () => {
 const [selectedDates, setSelectedDates] = useState<Date[]>([]);

 return (
  <>
   <div className="box">
    <h5>Default - Range Picker</h5>
    <div>
     <CalendarRange dates={selectedDates} onDatesChange={setSelectedDates} />
    </div>

    {selectedDates.length === 2 && (
     <div style={{ marginTop: "16px", fontSize: "14px" }}>
      <strong>Selected Range:</strong>
      <div>
       Start: {selectedDates[0].toLocaleDateString()}
      </div>
      <div>
       End: {selectedDates[1].toLocaleDateString()}
      </div>
     </div>
    )}
   </div>

   <div className="box">
    <h5>With Min/Max Dates</h5>
    <div>
     <CalendarRange
      minDate={new Date()}
      maxDate={new Date(new Date().setMonth(new Date().getMonth() + 2))}
     />
    </div>
   </div>
  </>
 );
};

export const Sizes: CalendarRangeStoryFn = () => {
 const [mediumDates, setMediumDates] = useState<Date[]>([]);
 const [smallDates, setSmallDates] = useState<Date[]>([]);

 return (
  <div style={{ display: "flex", flexDirection: "column", gap: "40px", padding: "40px" }}>
   <div>
    <h5 style={{ marginBottom: "16px" }}>Medium (Default)</h5>
    <CalendarRange
     size="md"
     dates={mediumDates}
     onDatesChange={setMediumDates}
    />
   </div>

   <div>
    <h5 style={{ marginBottom: "16px" }}>Small</h5>
    <CalendarRange
     size="sm"
     dates={smallDates}
     onDatesChange={setSmallDates}
    />
   </div>
  </div>
 );
};
