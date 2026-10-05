
# RecoveryGrant

Response of ``POST /auth/reset_password_request``.  ``grant_id`` publicly identifies the recovery request (RFC 8628\'s device_code/user_code split: the grant is the identifier, the emailed 6-digit code is the only secret). Unknown emails get a random, indistinguishable grant id so the response never reveals whether an account exists.

## Properties

Name | Type
------------ | -------------
`grantId` | string

## Example

```typescript
import type { RecoveryGrant } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "grantId": null,
} satisfies RecoveryGrant

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RecoveryGrant
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


