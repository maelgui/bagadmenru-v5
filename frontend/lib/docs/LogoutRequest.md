
# LogoutRequest

Optional logout body naming which account to sign out.  Defaults to the active account when omitted. When ``all`` is true, every account signed in this browser is signed out (``account_id`` is ignored); this only clears cookies in the current browser and does not revoke sessions on other devices.

## Properties

Name | Type
------------ | -------------
`accountId` | string
`all` | boolean

## Example

```typescript
import type { LogoutRequest } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "accountId": null,
  "all": null,
} satisfies LogoutRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LogoutRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


