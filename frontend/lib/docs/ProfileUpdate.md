
# ProfileUpdate


## Properties

Name | Type
------------ | -------------
`firstName` | string
`lastName` | string
`pictureKey` | string
`receivesEmails` | boolean
`receivesPush` | boolean
`instrumentId` | number
`groupIds` | Array&lt;number&gt;

## Example

```typescript
import type { ProfileUpdate } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "firstName": null,
  "lastName": null,
  "pictureKey": null,
  "receivesEmails": null,
  "receivesPush": null,
  "instrumentId": null,
  "groupIds": null,
} satisfies ProfileUpdate

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ProfileUpdate
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


