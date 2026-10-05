
# Group


## Properties

Name | Type
------------ | -------------
`name` | string
`color` | string
`id` | number
`isInstrument` | boolean
`mailingList` | string
`roles` | [Array&lt;Role&gt;](Role.md)
`members` | [Array&lt;Profile&gt;](Profile.md)

## Example

```typescript
import type { Group } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "color": null,
  "id": null,
  "isInstrument": null,
  "mailingList": null,
  "roles": null,
  "members": null,
} satisfies Group

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Group
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


