
# Event


## Properties

Name | Type
------------ | -------------
`title` | string
`description` | string
`date` | Date
`costume` | [Costume](Costume.md)
`category` | string
`isInDoodle` | boolean
`id` | number

## Example

```typescript
import type { Event } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "description": null,
  "date": null,
  "costume": null,
  "category": null,
  "isInDoodle": null,
  "id": null,
} satisfies Event

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Event
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


