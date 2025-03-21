import { JSONSchemaToZod } from '@dmitryrechkin/json-schema-to-zod'
import fs from 'fs'
import path from 'path'

/**
 * Preprocesses the Adaptive Card schema to remove input elements and other unnecessary
 * components for read-only dashboards.
 * @returns {Promise<object>} The simplified schema
 */
export async function getSimplifiedAdaptiveCardSchema() {
  // Read the schema file from the filesystem instead of using $fetch
  const schemaPath = path.resolve(process.cwd(), 'public/schemas/adaptive-card.json')
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
  const fullSchema = JSON.parse(schemaContent)

  // Dashboard is Read-Only 
  const elementsToKeep = [
    'Media',
    'Image',
    'Column',
    'FactSet',
    'ImageSet',
    'ColumnSet',
    'Container',
    'TextBlock',
    'RichTextBlock'
  ];

  // Create a deep copy of the schema to modify
  const simplifiedSchema = JSON.parse(JSON.stringify(fullSchema));

  // Filter the definitions to only include elements we want to keep
  if (simplifiedSchema.definitions) {
    const definitions = simplifiedSchema.definitions;

    // Keep only the necessary element definitions
    for (const key in definitions) {
      // Check if this definition is for an element type (ends with 'Element')
      if (key.endsWith('Element')) {
        const isKeeper = elementsToKeep.some(element =>
          key === `${element}` || key.includes(`${element}.`));

        if (!isKeeper) {
          delete definitions[key];
        }
      }
    }

    // Remove input-specific properties
    if (definitions.Input) delete definitions.Input;
    if (definitions.Action) delete definitions.Action;

    // Modify the element types to only include those we want to keep
    if (definitions.Element && definitions.Element.anyOf) {
      definitions.Element.anyOf = definitions.Element.anyOf.filter((ref: any) => {
        const refName = ref.$ref.split('/').pop();
        return elementsToKeep.some(element => refName === `${element}` || refName.includes(`${element}.`));
      });
    }
  }

  // Remove action references from the card
  if (simplifiedSchema.properties) {
    if (simplifiedSchema.properties.actions) {
      delete simplifiedSchema.properties.actions;
    }

    // Remove interactivity-related properties
    if (simplifiedSchema.properties.selectAction) {
      delete simplifiedSchema.properties.selectAction;
    }
  }

  // Add metadata about the simplification
  simplifiedSchema.simplified = {
    description: "Schema simplified for read-only dashboard generation",
    originalElements: (fullSchema as any).definitions ? Object.keys((fullSchema as any).definitions).length : 0,
    simplifiedElements: simplifiedSchema.definitions ? Object.keys(simplifiedSchema.definitions).length : 0
  };

  return JSONSchemaToZod.convert(simplifiedSchema);
}

