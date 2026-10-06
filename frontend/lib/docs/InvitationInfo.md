
# InvitationInfo

Public prefill data returned when opening a signup link.  Contains no secrets. ``email_locked`` is true only when the invitation email was proven (EMAIL channel with a target address): the signup form then shows the address read-only and no OTP is needed as long as it is unchanged.

## Properties

Name | Type
------------ | -------------
`email` | string
`emailLocked` | boolean

## Example

```typescript
import type { InvitationInfo } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "email": null,
  "emailLocked": null,
} satisfies InvitationInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as InvitationInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


