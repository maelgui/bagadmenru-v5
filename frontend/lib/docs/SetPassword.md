
# SetPassword

Body of ``POST /auth/set_password`` (authenticated, no current password).  No confirmation field: the form has a show-password toggle, which is the modern guard against typos (NIST 800-63B dropped the double-entry recommendation once masking can be lifted).

## Properties

Name | Type
------------ | -------------
`password` | string

## Example

```typescript
import type { SetPassword } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "password": null,
} satisfies SetPassword

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SetPassword
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


