
# InvitationAccept

Finalize a signup: create the account from the invitation.  ``code`` is the 6-digit OTP; it is required whenever the email is not proven (link/QR, or an EMAIL-channel invitation whose address was changed on the form). It is ignored when the email is proven and unchanged.

## Properties

Name | Type
------------ | -------------
`firstName` | string
`lastName` | string
`email` | string
`instrumentId` | number
`code` | string

## Example

```typescript
import type { InvitationAccept } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "firstName": null,
  "lastName": null,
  "email": null,
  "instrumentId": null,
  "code": null,
} satisfies InvitationAccept

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as InvitationAccept
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


