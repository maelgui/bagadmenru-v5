# HelloAssoApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**deleteMembershipApiV1HelloassoOrdersMembershipIdDelete**](HelloAssoApi.md#deletemembershipapiv1helloassoordersmembershipiddelete) | **DELETE** /api/v1/helloasso/orders/{membership_id} | Delete Membership |
| [**helloassoWebhookApiV1HelloassoWebhookPost**](HelloAssoApi.md#helloassowebhookapiv1helloassowebhookpost) | **POST** /api/v1/helloasso/webhook | Helloasso Webhook |
| [**linkMembershipApiV1HelloassoOrdersMembershipIdLinkPost**](HelloAssoApi.md#linkmembershipapiv1helloassoordersmembershipidlinkpost) | **POST** /api/v1/helloasso/orders/{membership_id}/link | Link Membership |
| [**listUnlinkedMembershipsApiV1HelloassoOrdersUnlinkedGet**](HelloAssoApi.md#listunlinkedmembershipsapiv1helloassoordersunlinkedget) | **GET** /api/v1/helloasso/orders/unlinked | List Unlinked Memberships |



## deleteMembershipApiV1HelloassoOrdersMembershipIdDelete

> deleteMembershipApiV1HelloassoOrdersMembershipIdDelete(membershipId)

Delete Membership

Delete a membership record (e.g. a duplicate or erroneous order).

### Example

```ts
import {
  Configuration,
  HelloAssoApi,
} from 'bagad-client';
import type { DeleteMembershipApiV1HelloassoOrdersMembershipIdDeleteRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new HelloAssoApi(config);

  const body = {
    // string
    membershipId: membershipId_example,
  } satisfies DeleteMembershipApiV1HelloassoOrdersMembershipIdDeleteRequest;

  try {
    const data = await api.deleteMembershipApiV1HelloassoOrdersMembershipIdDelete(body);
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
| **membershipId** | `string` |  | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## helloassoWebhookApiV1HelloassoWebhookPost

> any helloassoWebhookApiV1HelloassoWebhookPost(token, xHaSignature)

Helloasso Webhook

Receive a HelloAsso notification and persist membership items.  Always returns 200 for authentic, well-formed notifications (even when there is nothing to store), because any non-200 makes HelloAsso retry the delivery for up to 27 hours.

### Example

```ts
import {
  Configuration,
  HelloAssoApi,
} from 'bagad-client';
import type { HelloassoWebhookApiV1HelloassoWebhookPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new HelloAssoApi();

  const body = {
    // string (optional)
    token: token_example,
    // string (optional)
    xHaSignature: xHaSignature_example,
  } satisfies HelloassoWebhookApiV1HelloassoWebhookPostRequest;

  try {
    const data = await api.helloassoWebhookApiV1HelloassoWebhookPost(body);
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
| **token** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xHaSignature** | `string` |  | [Optional] [Defaults to `undefined`] |

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
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## linkMembershipApiV1HelloassoOrdersMembershipIdLinkPost

> UnlinkedMembership linkMembershipApiV1HelloassoOrdersMembershipIdLinkPost(membershipId, membershipLinkRequest)

Link Membership

Attach an unlinked membership row to a member.

### Example

```ts
import {
  Configuration,
  HelloAssoApi,
} from 'bagad-client';
import type { LinkMembershipApiV1HelloassoOrdersMembershipIdLinkPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new HelloAssoApi(config);

  const body = {
    // string
    membershipId: membershipId_example,
    // MembershipLinkRequest
    membershipLinkRequest: ...,
  } satisfies LinkMembershipApiV1HelloassoOrdersMembershipIdLinkPostRequest;

  try {
    const data = await api.linkMembershipApiV1HelloassoOrdersMembershipIdLinkPost(body);
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
| **membershipId** | `string` |  | [Defaults to `undefined`] |
| **membershipLinkRequest** | [MembershipLinkRequest](MembershipLinkRequest.md) |  | |

### Return type

[**UnlinkedMembership**](UnlinkedMembership.md)

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


## listUnlinkedMembershipsApiV1HelloassoOrdersUnlinkedGet

> Array&lt;UnlinkedMembership&gt; listUnlinkedMembershipsApiV1HelloassoOrdersUnlinkedGet()

List Unlinked Memberships

List membership rows not yet attached to a member (admin reconciliation).

### Example

```ts
import {
  Configuration,
  HelloAssoApi,
} from 'bagad-client';
import type { ListUnlinkedMembershipsApiV1HelloassoOrdersUnlinkedGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new HelloAssoApi(config);

  try {
    const data = await api.listUnlinkedMembershipsApiV1HelloassoOrdersUnlinkedGet();
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

[**Array&lt;UnlinkedMembership&gt;**](UnlinkedMembership.md)

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

