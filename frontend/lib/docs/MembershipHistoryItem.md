
# MembershipHistoryItem

One membership record, as ingested from HelloAsso.

## Properties

Name | Type
------------ | -------------
`id` | string
`tierName` | string
`tierDescription` | string
`adherentFirstName` | string
`adherentLastName` | string
`amount` | number
`orderDate` | Date
`state` | string
`season` | string

## Example

```typescript
import type { MembershipHistoryItem } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "tierName": null,
  "tierDescription": null,
  "adherentFirstName": null,
  "adherentLastName": null,
  "amount": null,
  "orderDate": null,
  "state": null,
  "season": null,
} satisfies MembershipHistoryItem

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MembershipHistoryItem
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


