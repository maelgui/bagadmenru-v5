
# OtpRequest

Request an email verification code for the address the invitee entered.

## Properties

Name | Type
------------ | -------------
`email` | string

## Example

```typescript
import type { OtpRequest } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "email": null,
} satisfies OtpRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as OtpRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


