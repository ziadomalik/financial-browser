import { ref, onMounted } from 'vue'
import * as z from 'zod'

// Function to convert JSON Schema to Zod schema
const convertJsonSchemaToZod = (jsonSchema: any): z.ZodTypeAny => {
  if (!jsonSchema) return z.any()

  // Handle different types
  if (jsonSchema.type === 'string') {
    let schema = z.string()
    if (jsonSchema.enum) {
      return z.enum(jsonSchema.enum as [string, ...string[]])
    }
    if (jsonSchema.format === 'date-time') {
      return z.string().datetime()
    }
    if (jsonSchema.pattern) {
      return schema.regex(new RegExp(jsonSchema.pattern))
    }
    return schema
  }

  if (jsonSchema.type === 'number' || jsonSchema.type === 'integer') {
    let schema = jsonSchema.type === 'integer' ? z.number().int() : z.number()
    if (jsonSchema.minimum !== undefined) {
      schema = schema.min(jsonSchema.minimum)
    }
    if (jsonSchema.maximum !== undefined) {
      schema = schema.max(jsonSchema.maximum)
    }
    return schema
  }

  if (jsonSchema.type === 'boolean') {
    return z.boolean()
  }

  if (jsonSchema.type === 'null') {
    return z.null()
  }

  if (jsonSchema.type === 'array') {
    const items = jsonSchema.items ? convertJsonSchemaToZod(jsonSchema.items) : z.any()
    let schema = z.array(items)
    if (jsonSchema.minItems !== undefined) {
      schema = schema.min(jsonSchema.minItems)
    }
    if (jsonSchema.maxItems !== undefined) {
      schema = schema.max(jsonSchema.maxItems)
    }
    return schema
  }

  if (jsonSchema.type === 'object' || jsonSchema.properties) {
    const shape: Record<string, z.ZodTypeAny> = {}

    if (jsonSchema.properties) {
      for (const [key, propSchema] of Object.entries(jsonSchema.properties)) {
        shape[key] = convertJsonSchemaToZod(propSchema)
      }
    }

    let schema = z.object(shape)

    // Handle required properties
    if (jsonSchema.required && Array.isArray(jsonSchema.required)) {
      const requiredShape: Record<string, z.ZodTypeAny> = {}

      for (const key of jsonSchema.required) {
        if (shape[key]) {
          requiredShape[key] = shape[key]
          delete shape[key]
        }
      }

      // Combine required and optional properties
      schema = z.object({
        ...requiredShape,
        ...Object.fromEntries(
          Object.entries(shape).map(([k, v]) => [k, v.optional()])
        )
      })
    }

    return schema
  }

  // Handle oneOf, anyOf, allOf
  if (jsonSchema.oneOf) {
    return z.union(jsonSchema.oneOf.map(convertJsonSchemaToZod))
  }

  if (jsonSchema.anyOf) {
    return z.union(jsonSchema.anyOf.map(convertJsonSchemaToZod))
  }

  if (jsonSchema.allOf) {
    return jsonSchema.allOf.reduce(
      (acc: z.ZodTypeAny, schema: any) => z.intersection(acc, convertJsonSchemaToZod(schema)),
      z.object({})
    )
  }

  // Default to any
  return z.any()
}

export const useAdaptiveSchema = () => {
  const loading = ref(true)
  const schema = ref<any>(null)
  const zodSchema = ref<z.ZodTypeAny | null>(null)
  const error = ref<Error | null>(null)

  const fetchSchema = async () => {
    loading.value = true
    error.value = null

    try {
      // Use our server API endpoint to get the schema
      const response = await $fetch('/api/adaptive-schema')
      schema.value = response

      // Convert JSON schema to Zod schema
      zodSchema.value = convertJsonSchemaToZod(response)
    } catch (err) {
      console.error('Error fetching adaptive card schema:', err)
      error.value = err instanceof Error ? err : new Error('Unknown error occurred')
    } finally {
      loading.value = false
    }
  }

  // Fetch the schema on initial load
  onMounted(() => {
    fetchSchema()
  })

  return {
    schema,
    zodSchema,
    loading,
    error,
    refresh: fetchSchema
  }
}
