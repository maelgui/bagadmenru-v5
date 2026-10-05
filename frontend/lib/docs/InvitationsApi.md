# InvitationsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**acceptInvitationApiV1InvitationsTokenAcceptPost**](InvitationsApi.md#acceptinvitationapiv1invitationstokenacceptpost) | **POST** /api/v1/invitations/{token}/accept | Accept Invitation |
| [**createInvitationApiV1InvitationsPost**](InvitationsApi.md#createinvitationapiv1invitationspost) | **POST** /api/v1/invitations | Create Invitation |
| [**getInvitationApiV1InvitationsTokenGet**](InvitationsApi.md#getinvitationapiv1invitationstokenget) | **GET** /api/v1/invitations/{token} | Get Invitation |
| [**requestOtpApiV1InvitationsTokenOtpPost**](InvitationsApi.md#requestotpapiv1invitationstokenotppost) | **POST** /api/v1/invitations/{token}/otp | Request Otp |



## acceptInvitationApiV1InvitationsTokenAcceptPost

> Token acceptInvitationApiV1InvitationsTokenAcceptPost(token, invitationAccept)

Accept Invitation

Public: create the member account from the invitation and sign them in.  OTP is required unless the invitation email was backend-proven and the submitted email is unchanged. The account gets its instrument plus the default groups only (never a privileged role). On success the new member is signed in as an *additive* multi-account session (no other account is logged out) and becomes the active account - no password is set and no email is sent, the account is passkey-first.

### Example

```ts
import {
  Configuration,
  InvitationsApi,
} from 'bagad-client';
import type { AcceptInvitationApiV1InvitationsTokenAcceptPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new InvitationsApi();

  const body = {
    // string
    token: token_example,
    // InvitationAccept
    invitationAccept: ...,
  } satisfies AcceptInvitationApiV1InvitationsTokenAcceptPostRequest;

  try {
    const data = await api.acceptInvitationApiV1InvitationsTokenAcceptPost(body);
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
| **token** | `string` |  | [Defaults to `undefined`] |
| **invitationAccept** | [InvitationAccept](InvitationAccept.md) |  | |

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
| **201** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createInvitationApiV1InvitationsPost

> InvitationCreated createInvitationApiV1InvitationsPost(invitationCreate)

Create Invitation

Generate an invitation and (for the email channel) send it.

### Example

```ts
import {
  Configuration,
  InvitationsApi,
} from 'bagad-client';
import type { CreateInvitationApiV1InvitationsPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new InvitationsApi(config);

  const body = {
    // InvitationCreate
    invitationCreate: ...,
  } satisfies CreateInvitationApiV1InvitationsPostRequest;

  try {
    const data = await api.createInvitationApiV1InvitationsPost(body);
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
| **invitationCreate** | [InvitationCreate](InvitationCreate.md) |  | |

### Return type

[**InvitationCreated**](InvitationCreated.md)

### Authorization

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getInvitationApiV1InvitationsTokenGet

> InvitationInfo getInvitationApiV1InvitationsTokenGet(token)

Get Invitation

Public: return prefill data for the signup form (does not consume).

### Example

```ts
import {
  Configuration,
  InvitationsApi,
} from 'bagad-client';
import type { GetInvitationApiV1InvitationsTokenGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new InvitationsApi();

  const body = {
    // string
    token: token_example,
  } satisfies GetInvitationApiV1InvitationsTokenGetRequest;

  try {
    const data = await api.getInvitationApiV1InvitationsTokenGet(body);
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
| **token** | `string` |  | [Defaults to `undefined`] |

### Return type

[**InvitationInfo**](InvitationInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## requestOtpApiV1InvitationsTokenOtpPost

> requestOtpApiV1InvitationsTokenOtpPost(token, otpRequest)

Request Otp

Public: send a one-time code to the address the invitee entered.  A fresh code supersedes any previous one for this invitation, so only the latest is valid.

### Example

```ts
import {
  Configuration,
  InvitationsApi,
} from 'bagad-client';
import type { RequestOtpApiV1InvitationsTokenOtpPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new InvitationsApi();

  const body = {
    // string
    token: token_example,
    // OtpRequest
    otpRequest: ...,
  } satisfies RequestOtpApiV1InvitationsTokenOtpPostRequest;

  try {
    const data = await api.requestOtpApiV1InvitationsTokenOtpPost(body);
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
| **token** | `string` |  | [Defaults to `undefined`] |
| **otpRequest** | [OtpRequest](OtpRequest.md) |  | |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

