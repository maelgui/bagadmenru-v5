
# PublicInstrument

Instrument as exposed on the *public* ``/instruments`` endpoint.  Deliberately a standalone schema (not derived from ``_GroupBase`` / ``MinimalGroup``) so that adding a field to a shared group schema can never silently widen this unauthenticated surface. Keep it to non-sensitive display data only; ``tests/api/v1/test_instruments.py`` freezes the exact field set.

## Properties

Name | Type
------------ | -------------
`id` | number
`name` | string
`color` | string

## Example

```typescript
import type { PublicInstrument } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "color": null,
} satisfies PublicInstrument

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PublicInstrument
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


