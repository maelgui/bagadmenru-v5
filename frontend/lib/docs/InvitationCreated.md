
# InvitationCreated

Response after generating an invitation.  ``token`` and ``url`` are only meaningful for the ``LINK`` channel (the caller shares them). For the ``EMAIL`` channel the invitation was sent by the backend; the token is still returned for testing/debugging but the UI need not surface it.

## Properties

Name | Type
------------ | -------------
`token` | string
`url` | string
`channel` | [InvitationChannel](InvitationChannel.md)
`expiresIn` | number

## Example

```typescript
import type { InvitationCreated } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "token": null,
  "url": null,
  "channel": null,
  "expiresIn": null,
} satisfies InvitationCreated

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as InvitationCreated
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


