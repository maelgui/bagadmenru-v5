
# InvitationCreate

Request to generate an invitation (authenticated member action).  ``channel`` selects delivery: ``LINK`` returns the signup link/QR to the caller; ``EMAIL`` sends the invitation to ``email`` (which then must be provided). ``first_name`` is optional and only used to personalise the emailed invitation - it is not persisted on the token nor used to prefill the signup form (the invitee fills in their own profile).

## Properties

Name | Type
------------ | -------------
`channel` | [InvitationChannel](InvitationChannel.md)
`email` | string
`firstName` | string

## Example

```typescript
import type { InvitationCreate } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "channel": null,
  "email": null,
  "firstName": null,
} satisfies InvitationCreate

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as InvitationCreate
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


