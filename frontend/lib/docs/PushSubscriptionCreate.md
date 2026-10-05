
# PushSubscriptionCreate

Schema for creating a push subscription.

## Properties

Name | Type
------------ | -------------
`endpoint` | string
`p256dh` | string
`auth` | string

## Example

```typescript
import type { PushSubscriptionCreate } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "endpoint": null,
  "p256dh": null,
  "auth": null,
} satisfies PushSubscriptionCreate

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PushSubscriptionCreate
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


