
# ResponseChange


## Properties

Name | Type
------------ | -------------
`id` | number
`fromValue` | boolean
`toValue` | boolean
`changedAt` | Date
`event` | [Event](Event.md)
`user` | [ResponseChangeUser](ResponseChangeUser.md)

## Example

```typescript
import type { ResponseChange } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "fromValue": null,
  "toValue": null,
  "changedAt": null,
  "event": null,
  "user": null,
} satisfies ResponseChange

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ResponseChange
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


