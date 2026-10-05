
# Res


## Properties

Name | Type
------------ | -------------
`event` | [Event](Event.md)
`user` | [MyProfileUpdate](MyProfileUpdate.md)
`response` | [Response](Response.md)

## Example

```typescript
import type { Res } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "event": null,
  "user": null,
  "response": null,
} satisfies Res

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Res
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


