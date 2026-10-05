
# Profile


## Properties

Name | Type
------------ | -------------
`firstName` | string
`lastName` | string
`pictureKey` | string
`receivesEmails` | boolean
`receivesPush` | boolean
`email` | string
`id` | string
`groups` | [Array&lt;MinimalGroup&gt;](MinimalGroup.md)
`instrument` | [MinimalGroup](MinimalGroup.md)
`isActive` | boolean
`membershipStatus` | [MembershipStatus](MembershipStatus.md)
`membershipActiveSeason` | string
`hasPassword` | boolean
`pictureUrl` | string

## Example

```typescript
import type { Profile } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "firstName": null,
  "lastName": null,
  "pictureKey": null,
  "receivesEmails": null,
  "receivesPush": null,
  "email": null,
  "id": null,
  "groups": null,
  "instrument": null,
  "isActive": null,
  "membershipStatus": null,
  "membershipActiveSeason": null,
  "hasPassword": null,
  "pictureUrl": null,
} satisfies Profile

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Profile
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


