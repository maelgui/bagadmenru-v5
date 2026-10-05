
# MyStats


## Properties

Name | Type
------------ | -------------
`nResponses` | number
`nPositiveResponses` | number
`avgResponseTime` | string
`nUpcommingResponses` | number

## Example

```typescript
import type { MyStats } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "nResponses": null,
  "nPositiveResponses": null,
  "avgResponseTime": null,
  "nUpcommingResponses": null,
} satisfies MyStats

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MyStats
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


