
# InboxEmail

An email from the inbox (headers only).

## Properties

Name | Type
------------ | -------------
`subject` | string
`datetime` | Date
`from` | string

## Example

```typescript
import type { InboxEmail } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "subject": null,
  "datetime": null,
  "from": null,
} satisfies InboxEmail

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as InboxEmail
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


