import {
  PROPERTY_SLOT_LIMITS,
  INDEXED_PROPERTY_SLOTS,
} from "@/lib/contact-properties/config";

// Generate string fields
const stringFields = [];
for (let i = 0; i < PROPERTY_SLOT_LIMITS.STRING; i++) {
  stringFields.push(`  propertyString${i}  String? @db.VarChar(255)`);
}

// Generate float fields (combines date and number)
const floatFields = [];
for (let i = 0; i < PROPERTY_SLOT_LIMITS.FLOAT; i++) {
  floatFields.push(`  propertyFloat${i}   Float?`);
}

// Generate selective indexes
const indexes = [];
// Float field indexes
for (let i = 0; i < INDEXED_PROPERTY_SLOTS.FLOAT; i++) {
  indexes.push(`  @@index([workspaceId, propertyFloat${i}])`);
}
// String field indexes
for (let i = 0; i < INDEXED_PROPERTY_SLOTS.STRING; i++) {
  indexes.push(`  @@index([workspaceId, propertyString${i}])`);
}

console.log(
  `// Custom property slots - Float (${PROPERTY_SLOT_LIMITS.FLOAT} slots for dates and numbers)`
);
console.log(floatFields.join("\n"));
console.log(`\n// Custom property slots - String (${PROPERTY_SLOT_LIMITS.STRING} slots)`);
console.log(stringFields.join("\n"));
console.log(
  `\n// Selective indexes (first ${INDEXED_PROPERTY_SLOTS.FLOAT} float, ${INDEXED_PROPERTY_SLOTS.STRING} string)`
);
console.log(indexes.join("\n"));
