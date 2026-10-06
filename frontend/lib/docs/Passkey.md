
# Passkey


## Properties

Name | Type
------------ | -------------
`credentialId` | string
`signCount` | number
`transports` | string
`deviceType` | [CredentialDeviceType](CredentialDeviceType.md)
`backUp` | boolean
`aaguid` | string
`lastUseAt` | Date
`lastUseIp` | string
`lastUseUa` | string
`createdAt` | Date

## Example

```typescript
import type { Passkey } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "credentialId": null,
  "signCount": null,
  "transports": null,
  "deviceType": null,
  "backUp": null,
  "aaguid": null,
  "lastUseAt": null,
  "lastUseIp": null,
  "lastUseUa": null,
  "createdAt": null,
} satisfies Passkey

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Passkey
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


