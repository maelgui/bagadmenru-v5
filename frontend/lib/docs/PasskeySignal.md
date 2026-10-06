
# PasskeySignal

Payload for ``PublicKeyCredential.signalAllAcceptedCredentials()``.  Returned by the passkey DELETE endpoint so the client can tell the passkey provider (Keychain, Google Password Manager…) which credentials are still valid — the provider then deletes its copy of the removed one instead of keeping an orphan that would fail at the next login. All identifiers use base64url **without padding**, the encoding the WebAuthn Signal API expects (unlike ``Passkey.credential_id``, which keeps its historical padded form).

## Properties

Name | Type
------------ | -------------
`rpId` | string
`userHandle` | string
`remainingCredentialIds` | Array&lt;string&gt;

## Example

```typescript
import type { PasskeySignal } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "rpId": null,
  "userHandle": null,
  "remainingCredentialIds": null,
} satisfies PasskeySignal

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PasskeySignal
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


