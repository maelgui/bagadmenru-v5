
# UnlinkedMembership

A membership row not yet attached to a member.

## Properties

Name | Type
------------ | -------------
`id` | string
`helloassoOrderId` | number
`helloassoItemId` | number
`payerEmail` | string
`payerFirstName` | string
`payerLastName` | string
`adherentFirstName` | string
`adherentLastName` | string
`adherentEmail` | string
`tierName` | string
`tierDescription` | string
`amount` | number
`orderDate` | Date
`state` | string

## Example

```typescript
import type { UnlinkedMembership } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "helloassoOrderId": null,
  "helloassoItemId": null,
  "payerEmail": null,
  "payerFirstName": null,
  "payerLastName": null,
  "adherentFirstName": null,
  "adherentLastName": null,
  "adherentEmail": null,
  "tierName": null,
  "tierDescription": null,
  "amount": null,
  "orderDate": null,
  "state": null,
} satisfies UnlinkedMembership

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UnlinkedMembership
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


