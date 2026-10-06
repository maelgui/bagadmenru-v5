# AuthenticationApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**deletePasskeyApiV1WebauthnCredentialIdDelete**](AuthenticationApi.md#deletepasskeyapiv1webauthncredentialiddelete) | **DELETE** /api/v1/webauthn/{credential_id} | Delete Passkey |
| [**listPasskeysApiV1WebauthnGet**](AuthenticationApi.md#listpasskeysapiv1webauthnget) | **GET** /api/v1/webauthn/ | List Passkeys |
| [**listSessionsApiV1AuthSessionsGet**](AuthenticationApi.md#listsessionsapiv1authsessionsget) | **GET** /api/v1/auth/sessions | List Sessions |
| [**loginWithCodeApiV1AuthLoginCodePost**](AuthenticationApi.md#loginwithcodeapiv1authlogincodepost) | **POST** /api/v1/auth/login_code | Login With Code |
| [**logoutApiV1AuthLogoutPost**](AuthenticationApi.md#logoutapiv1authlogoutpost) | **POST** /api/v1/auth/logout | Logout |
| [**prepareLoginApiV1AuthLoginGet**](AuthenticationApi.md#prepareloginapiv1authloginget) | **GET** /api/v1/auth/login | Prepare Login |
| [**preregisterPasskeyApiV1WebauthnPreregisterGet**](AuthenticationApi.md#preregisterpasskeyapiv1webauthnpreregisterget) | **GET** /api/v1/webauthn/preregister | Preregister Passkey |
| [**processLoginApiV1AuthLoginPost**](AuthenticationApi.md#processloginapiv1authloginpost) | **POST** /api/v1/auth/login | Process Login |
| [**registerPasskeyApiV1WebauthnRegisterPost**](AuthenticationApi.md#registerpasskeyapiv1webauthnregisterpost) | **POST** /api/v1/webauthn/register | Register Passkey |
| [**resetPasswordRequestApiV1AuthResetPasswordRequestPost**](AuthenticationApi.md#resetpasswordrequestapiv1authresetpasswordrequestpost) | **POST** /api/v1/auth/reset_password_request | Reset Password Request |
| [**setPasswordApiV1AuthSetPasswordPost**](AuthenticationApi.md#setpasswordapiv1authsetpasswordpost) | **POST** /api/v1/auth/set_password | Set Password |
| [**verifyEmailAccessApiV1AuthVerifyGet**](AuthenticationApi.md#verifyemailaccessapiv1authverifyget) | **GET** /api/v1/auth/verify | Verify Email Access |



## deletePasskeyApiV1WebauthnCredentialIdDelete

> PasskeySignal deletePasskeyApiV1WebauthnCredentialIdDelete(credentialId)

Delete Passkey

Delete a passkey and return the Signal API payload.  The response lists the credentials still valid for this user so the client can call &#x60;&#x60;PublicKeyCredential.signalAllAcceptedCredentials()&#x60;&#x60;: the passkey provider then deletes its local copy of the removed key immediately, instead of keeping an orphan that would be suggested at the next login and fail.

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { DeletePasskeyApiV1WebauthnCredentialIdDeleteRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AuthenticationApi(config);

  const body = {
    // string
    credentialId: credentialId_example,
  } satisfies DeletePasskeyApiV1WebauthnCredentialIdDeleteRequest;

  try {
    const data = await api.deletePasskeyApiV1WebauthnCredentialIdDelete(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **credentialId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**PasskeySignal**](PasskeySignal.md)

### Authorization

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listPasskeysApiV1WebauthnGet

> Array&lt;Passkey&gt; listPasskeysApiV1WebauthnGet()

List Passkeys

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { ListPasskeysApiV1WebauthnGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AuthenticationApi(config);

  try {
    const data = await api.listPasskeysApiV1WebauthnGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**Array&lt;Passkey&gt;**](Passkey.md)

### Authorization

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listSessionsApiV1AuthSessionsGet

> Array&lt;SessionInfo&gt; listSessionsApiV1AuthSessionsGet()

List Sessions

Return all accounts currently signed in this browser (multi-account).  Public endpoint (no auth dependency): it only reflects the cookies the caller already holds and never reveals anything about accounts whose signed session cookie is not present.

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { ListSessionsApiV1AuthSessionsGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new AuthenticationApi();

  try {
    const data = await api.listSessionsApiV1AuthSessionsGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**Array&lt;SessionInfo&gt;**](SessionInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## loginWithCodeApiV1AuthLoginCodePost

> Token loginWithCodeApiV1AuthLoginCodePost(loginCode)

Login With Code

Sign the member in from an emailed recovery grant (grant id + code).  Single consumption endpoint of the recovery email, for every account type. The grant id publicly identifies the request; the 6-digit code is the secret (RFC 8628\&#39;s device_code/user_code split). The email offers it two ways: the code to type into the page that requested it — the primary path, keeping the session (and the passkey ceremony that may follow) in a real browser instead of an email app\&#39;s WebView — and a link that is this same call with both fields prefilled in its URL (verification_uri_complete pattern). Also the landing of the welcome email sent when staff creates a member by hand.  Proving control of the email is a full authentication (same reasoning as the invitation-accept flow), so the member lands signed in (additive session cookies, becomes the active account) and the client offers how to secure the next sign-in: a passkey, or a new password for accounts that had one.  Guessing is bounded by the attempt counter (then the grant is revoked) and the grant\&#39;s short lifetime. Every failure returns the same 403 so the endpoint reveals nothing about account existence, pending recoveries, or grant-id validity (decoy grant ids answer identically).

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { LoginWithCodeApiV1AuthLoginCodePostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new AuthenticationApi();

  const body = {
    // LoginCode
    loginCode: ...,
  } satisfies LoginWithCodeApiV1AuthLoginCodePostRequest;

  try {
    const data = await api.loginWithCodeApiV1AuthLoginCodePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **loginCode** | [LoginCode](LoginCode.md) |  | |

### Return type

[**Token**](Token.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## logoutApiV1AuthLogoutPost

> Array&lt;SessionInfo&gt; logoutApiV1AuthLogoutPost(logoutRequest)

Logout

Sign out of a single account and return the remaining sessions.  Deletes only the targeted account\&#39;s session cookie (&#x60;&#x60;account_id&#x60;&#x60; in the body, defaulting to the active account). Other accounts stay signed in. When no sessions remain the &#x60;&#x60;active_account&#x60;&#x60; selector is cleared too. The legacy single-session &#x60;&#x60;access_token&#x60;&#x60; cookie is also cleared when it is the thing being logged out, for backward compatibility.  When &#x60;&#x60;all&#x60;&#x60; is true, every account signed in this browser is signed out at once (&#x60;&#x60;account_id&#x60;&#x60; is ignored) and an empty list is returned. This only clears cookies in the current browser; sessions on other devices are not revoked (tokens are stateless and carry no server-side session record).

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { LogoutApiV1AuthLogoutPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new AuthenticationApi();

  const body = {
    // LogoutRequest (optional)
    logoutRequest: ...,
  } satisfies LogoutApiV1AuthLogoutPostRequest;

  try {
    const data = await api.logoutApiV1AuthLogoutPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **logoutRequest** | [LogoutRequest](LogoutRequest.md) |  | [Optional] |

### Return type

[**Array&lt;SessionInfo&gt;**](SessionInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## prepareLoginApiV1AuthLoginGet

> any prepareLoginApiV1AuthLoginGet()

Prepare Login

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { PrepareLoginApiV1AuthLoginGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new AuthenticationApi();

  try {
    const data = await api.prepareLoginApiV1AuthLoginGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## preregisterPasskeyApiV1WebauthnPreregisterGet

> any preregisterPasskeyApiV1WebauthnPreregisterGet(flow)

Preregister Passkey

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { PreregisterPasskeyApiV1WebauthnPreregisterGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AuthenticationApi(config);

  const body = {
    // 'explicit' | 'silent' (optional)
    flow: flow_example,
  } satisfies PreregisterPasskeyApiV1WebauthnPreregisterGetRequest;

  try {
    const data = await api.preregisterPasskeyApiV1WebauthnPreregisterGet(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **flow** | `explicit`, `silent` |  | [Optional] [Defaults to `&#39;explicit&#39;`] [Enum: explicit, silent] |

### Return type

**any**

### Authorization

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## processLoginApiV1AuthLoginPost

> Token processLoginApiV1AuthLoginPost(loginData)

Process Login

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { ProcessLoginApiV1AuthLoginPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new AuthenticationApi();

  const body = {
    // LoginData
    loginData: ...,
  } satisfies ProcessLoginApiV1AuthLoginPostRequest;

  try {
    const data = await api.processLoginApiV1AuthLoginPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **loginData** | [LoginData](LoginData.md) |  | |

### Return type

[**Token**](Token.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## registerPasskeyApiV1WebauthnRegisterPost

> string registerPasskeyApiV1WebauthnRegisterPost(requestBody)

Register Passkey

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { RegisterPasskeyApiV1WebauthnRegisterPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AuthenticationApi(config);

  const body = {
    // { [key: string]: any | null; }
    requestBody: Object,
  } satisfies RegisterPasskeyApiV1WebauthnRegisterPostRequest;

  try {
    const data = await api.registerPasskeyApiV1WebauthnRegisterPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **requestBody** | `{ [key: string]: any | null; }` |  | |

### Return type

**string**

### Authorization

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## resetPasswordRequestApiV1AuthResetPasswordRequestPost

> RecoveryGrant resetPasswordRequestApiV1AuthResetPasswordRequestPost(resetPasswordRequest)

Reset Password Request

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { ResetPasswordRequestApiV1AuthResetPasswordRequestPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new AuthenticationApi();

  const body = {
    // ResetPasswordRequest
    resetPasswordRequest: ...,
  } satisfies ResetPasswordRequestApiV1AuthResetPasswordRequestPostRequest;

  try {
    const data = await api.resetPasswordRequestApiV1AuthResetPasswordRequestPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **resetPasswordRequest** | [ResetPasswordRequest](ResetPasswordRequest.md) |  | |

### Return type

[**RecoveryGrant**](RecoveryGrant.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## setPasswordApiV1AuthSetPasswordPost

> string setPasswordApiV1AuthSetPasswordPost(setPassword)

Set Password

Set (or replace) the signed-in member\&#39;s password.  Recovery successor of the old &#x60;&#x60;POST /auth/reset&#x60;&#x60;: proving control of the email (code or link) already signed the member in, so setting a new password is now an authenticated action instead of a token-bearing one. Deliberately does not require the current password — the flow exists precisely because it was forgotten. The trust boundary is kept at \&quot;proved email control recently\&quot; by requiring a FRESH session (see &#x60;&#x60;SET_PASSWORD_MAX_SESSION_AGE&#x60;&#x60;): without it, any live session (they last 90 days and cannot be revoked) could quietly take over the account with a password of its own. Also usable later from the account-security settings for members who want a fallback password, behind a fresh re-authentication.

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { SetPasswordApiV1AuthSetPasswordPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AuthenticationApi(config);

  const body = {
    // SetPassword
    setPassword: ...,
  } satisfies SetPasswordApiV1AuthSetPasswordPostRequest;

  try {
    const data = await api.setPasswordApiV1AuthSetPasswordPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **setPassword** | [SetPassword](SetPassword.md) |  | |

### Return type

**string**

### Authorization

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## verifyEmailAccessApiV1AuthVerifyGet

> verifyEmailAccessApiV1AuthVerifyGet()

Verify Email Access

Forward-auth gate for the Mailpit UI (beta).  Reachable through Traefik\&#39;s &#x60;&#x60;forwardAuth&#x60;&#x60; middleware, which replays the caller\&#39;s cookies here before serving the internal Mailpit service. A 204 means the browser holds a valid session whose role grants &#x60;&#x60;VIEW:EMAIL&#x60;&#x60; (staff/admin); the &#x60;&#x60;Authorization&#x60;&#x60; dependency raises 401/403 otherwise. The body is empty on purpose: only the status code matters to Traefik.

### Example

```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { VerifyEmailAccessApiV1AuthVerifyGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AuthenticationApi(config);

  try {
    const data = await api.verifyEmailAccessApiV1AuthVerifyGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

`void` (Empty response body)

### Authorization

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

