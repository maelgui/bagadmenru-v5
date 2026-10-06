
# EventCreate


## Properties

Name | Type
------------ | -------------
`title` | string
`description` | string
`date` | Date
`costume` | [Costume](Costume.md)
`category` | string
`isInDoodle` | boolean

## Example

```typescript
import type { EventCreate } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "description": null,
  "date": null,
  "costume": null,
  "category": null,
  "isInDoodle": null,
} satisfies EventCreate

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EventCreate
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


