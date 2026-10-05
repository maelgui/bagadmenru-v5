
# LoginCode

Body of ``POST /auth/login_code`` (single recovery sign-in endpoint).  ``via`` only labels the funnel metric (code typed by hand vs the emailed link, which is the same call with both fields prefilled in its URL). It is client-declared and carries no security meaning.

## Properties

Name | Type
------------ | -------------
`grantId` | string
`code` | string
`via` | string

## Example

```typescript
import type { LoginCode } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "grantId": null,
  "code": null,
  "via": null,
} satisfies LoginCode

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LoginCode
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


