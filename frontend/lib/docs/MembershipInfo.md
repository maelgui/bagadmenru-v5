
# MembershipInfo

Membership status plus history for a member.

## Properties

Name | Type
------------ | -------------
`status` | [MembershipStatus](MembershipStatus.md)
`currentSeason` | string
`activeSeason` | string
`history` | [Array&lt;MembershipHistoryItem&gt;](MembershipHistoryItem.md)

## Example

```typescript
import type { MembershipInfo } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "status": null,
  "currentSeason": null,
  "activeSeason": null,
  "history": null,
} satisfies MembershipInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MembershipInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


