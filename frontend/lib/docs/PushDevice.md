
# PushDevice

A push-subscribed device belonging to the current user.  Never exposes the encryption keys (p256dh/auth) nor the raw endpoint URL. The raw user_agent is returned so the frontend can render a friendly label; last_used_at is the time of the last successfully sent push (null if none sent yet). device_hash is a stable, non-reversible fingerprint of the push endpoint: the browser hashes its own endpoint the same way to recognise which row is \"this device\" without the endpoint ever being exposed.

## Properties

Name | Type
------------ | -------------
`id` | string
`userAgent` | string
`lastUsedAt` | Date
`createdAt` | Date
`deviceHash` | string

## Example

```typescript
import type { PushDevice } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "userAgent": null,
  "lastUsedAt": null,
  "createdAt": null,
  "deviceHash": null,
} satisfies PushDevice

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PushDevice
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


