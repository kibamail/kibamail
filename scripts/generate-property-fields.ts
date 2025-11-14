// Helper script to generate property field definitions
// Run with: bun run scripts/generate-property-fields.ts

// Generate 50 string fields
const stringFields = [];
for (let i = 0; i < 50; i++) {
  stringFields.push(`  propertyString${i}  String? @db.VarChar(255)`);
}

// Generate 30 float fields (combines date and number)
const floatFields = [];
for (let i = 0; i < 30; i++) {
  floatFields.push(`  propertyFloat${i}   Float?`);
}

// Generate 20 bool fields (for tagging)
const boolFields = [];
for (let i = 0; i < 20; i++) {
  boolFields.push(`  propertyBool${i}    Boolean?`);
}

// Generate selective indexes
const indexes = [];
// First 5 float fields
for (let i = 0; i < 5; i++) {
  indexes.push(`  @@index([workspaceId, propertyFloat${i}])`);
}
// First 10 string fields
for (let i = 0; i < 10; i++) {
  indexes.push(`  @@index([workspaceId, propertyString${i}])`);
}
// First 10 bool fields
for (let i = 0; i < 10; i++) {
  indexes.push(`  @@index([workspaceId, propertyBool${i}])`);
}

console.log("// Custom property slots - Float (30 slots for dates and numbers)");
console.log(floatFields.join("\n"));
console.log("\n// Custom property slots - String (50 slots)");
console.log(stringFields.join("\n"));
console.log("\n// Custom property slots - Boolean (20 slots for tags)");
console.log(boolFields.join("\n"));
console.log("\n// Selective indexes (only first 5 float, 10 string, 10 bool)");
console.log(indexes.join("\n"));
