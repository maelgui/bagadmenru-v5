
# CredentialDeviceType

A determination of the number of devices a credential can be used from  Members:     `SINGLE_DEVICE`: A credential that is bound to a single device     `MULTI_DEVICE`: A credential that can be used from multiple devices (e.g. passkeys)  https://w3c.github.io/webauthn/#sctn-credential-backup (L3 Draft)

## Properties

Name | Type
------------ | -------------

## Example

```typescript
import type { CredentialDeviceType } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
} satisfies CredentialDeviceType

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CredentialDeviceType
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


