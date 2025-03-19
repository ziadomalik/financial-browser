import { isAbortError, safeValidateTypes } from '@ai-sdk/provider-utils'

import type { FetchFunction } from '@ai-sdk/provider-utils'

import {
  isDeepEqualData,
  parsePartialJson,
  asSchema,
  type DeepPartial,
  type Schema
} from '@ai-sdk/ui-utils'
import { ref, computed, onUnmounted } from 'vue'
import type z from 'zod'

// use function to allow for mocking in tests:
const getOriginalFetch = () => fetch

export type Experimental_UseObjectOptions<RESULT> = {
  /**
   * The API endpoint. It should stream JSON that matches the schema as chunked text.
   */
  api: string

  /**
   * A Zod schema that defines the shape of the complete object.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.Schema<RESULT, z.ZodTypeDef, any> | Schema<RESULT>

  /**
   * An optional value for the initial object.
   */
  initialValue?: DeepPartial<RESULT>

  /**
   * Custom fetch implementation.
   */
  fetch?: FetchFunction

  /**
   * Callback that is called when the stream has finished.
   */
  onFinish?: (event: {
    object: RESULT | undefined
    error: Error | undefined
  }) => Promise<void> | void

  /**
   * Callback function to be called when an error is encountered.
   */
  onError?: (error: Error) => void

  /**
   * Additional HTTP headers to be included in the request.
   */
  headers?: Record<string, string> | Headers
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useObject<RESULT, INPUT = any>({
  api,
  schema,
  initialValue,
  fetch,
  onError,
  onFinish,
  headers
}: Experimental_UseObjectOptions<RESULT>) {
  const data = ref<DeepPartial<RESULT> | undefined>(initialValue)
  const error = ref<Error | undefined>(undefined)
  const isLoading = ref(false)
  const abortController = ref<AbortController | null>(null)

  const stop = () => {
    try {
      abortController.value?.abort()
    } catch {
      // Ignore abort errors.
    } finally {
      isLoading.value = false
      abortController.value = null
    }
  }

  const submit = async (input: INPUT) => {
    try {
      data.value = undefined
      isLoading.value = true
      error.value = undefined

      abortController.value = new AbortController()

      const actualFetch = fetch ?? getOriginalFetch()
      const response = await actualFetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: abortController.value.signal,
        body: JSON.stringify(input)
      })

      if (!response.ok) {
        throw new Error((await response.text()) ?? 'Failed to fetch the response.')
      }

      if (response.body == null) {
        throw new Error('The response body is empty.')
      }

      let accumulatedText = ''
      let latestObject: DeepPartial<RESULT> | undefined = undefined

      await response.body.pipeThrough(new TextDecoderStream()).pipeTo(
        new WritableStream<string>({
          write(chunk) {
            accumulatedText += chunk

            const { value } = parsePartialJson(accumulatedText)
            const currentObject = value as DeepPartial<RESULT>

            if (!isDeepEqualData(latestObject, currentObject)) {
              latestObject = currentObject
              data.value = currentObject
            }
          },

          close() {
            isLoading.value = false
            abortController.value = null

            if (onFinish != null) {
              const validationResult = safeValidateTypes({
                value: latestObject,
                schema: asSchema(schema)
              })

              onFinish(
                validationResult.success
                  ? { object: validationResult.value, error: undefined }
                  : { object: undefined, error: validationResult.error }
              )
            }
          }
        })
      )
    } catch (err) {
      if (isAbortError(err)) {
        return
      }

      if (onError && err instanceof Error) {
        onError(err)
      }

      isLoading.value = false
      error.value = err instanceof Error ? err : new Error(String(err))
    }
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    stop()
  })

  return {
    submit,
    object: computed(() => data.value),
    error: computed(() => error.value),
    isLoading: computed(() => isLoading.value),
    stop
  }
}
