# PushNotificationsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**deleteSubscriptionApiV1PushSubscriptionsSubscriptionIdDelete**](PushNotificationsApi.md#deletesubscriptionapiv1pushsubscriptionssubscriptioniddelete) | **DELETE** /api/v1/push/subscriptions/{subscription_id} | Delete Subscription |
| [**getVapidPublicKeyApiV1PushVapidPublicKeyGet**](PushNotificationsApi.md#getvapidpublickeyapiv1pushvapidpublickeyget) | **GET** /api/v1/push/vapid-public-key | Get Vapid Public Key |
| [**listSubscriptionsApiV1PushSubscriptionsGet**](PushNotificationsApi.md#listsubscriptionsapiv1pushsubscriptionsget) | **GET** /api/v1/push/subscriptions | List Subscriptions |
| [**subscribeApiV1PushSubscribePost**](PushNotificationsApi.md#subscribeapiv1pushsubscribepost) | **POST** /api/v1/push/subscribe | Subscribe |
| [**testPushApiV1PushTestPost**](PushNotificationsApi.md#testpushapiv1pushtestpost) | **POST** /api/v1/push/test | Test Push |
| [**unsubscribeApiV1PushUnsubscribeDelete**](PushNotificationsApi.md#unsubscribeapiv1pushunsubscribedelete) | **DELETE** /api/v1/push/unsubscribe | Unsubscribe |



## deleteSubscriptionApiV1PushSubscriptionsSubscriptionIdDelete

> deleteSubscriptionApiV1PushSubscriptionsSubscriptionIdDelete(subscriptionId)

Delete Subscription

Revoke one of the current user\&#39;s devices by id.  Used from the device list to remove a device other than the current browser (which uses /unsubscribe with its own endpoint).

### Example

```ts
import {
  Configuration,
  PushNotificationsApi,
} from 'bagad-client';
import type { DeleteSubscriptionApiV1PushSubscriptionsSubscriptionIdDeleteRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PushNotificationsApi(config);

  const body = {
    // string
    subscriptionId: subscriptionId_example,
  } satisfies DeleteSubscriptionApiV1PushSubscriptionsSubscriptionIdDeleteRequest;

  try {
    const data = await api.deleteSubscriptionApiV1PushSubscriptionsSubscriptionIdDelete(body);
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
| **subscriptionId** | `string` |  | [Defaults to `undefined`] |

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


## getVapidPublicKeyApiV1PushVapidPublicKeyGet

> VapidPublicKeyResponse getVapidPublicKeyApiV1PushVapidPublicKeyGet()

Get Vapid Public Key

Return the VAPID public key for the frontend to subscribe.

### Example

```ts
import {
  Configuration,
  PushNotificationsApi,
} from 'bagad-client';
import type { GetVapidPublicKeyApiV1PushVapidPublicKeyGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new PushNotificationsApi();

  try {
    const data = await api.getVapidPublicKeyApiV1PushVapidPublicKeyGet();
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

[**VapidPublicKeyResponse**](VapidPublicKeyResponse.md)

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


## listSubscriptionsApiV1PushSubscriptionsGet

> Array&lt;PushDevice&gt; listSubscriptionsApiV1PushSubscriptionsGet()

List Subscriptions

List the current user\&#39;s push-subscribed devices.  Encryption keys are never returned. Ordered most recently used first, falling back to creation time for devices that never received a push.

### Example

```ts
import {
  Configuration,
  PushNotificationsApi,
} from 'bagad-client';
import type { ListSubscriptionsApiV1PushSubscriptionsGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PushNotificationsApi(config);

  try {
    const data = await api.listSubscriptionsApiV1PushSubscriptionsGet();
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

[**Array&lt;PushDevice&gt;**](PushDevice.md)

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


## subscribeApiV1PushSubscribePost

> PushSubscriptionResponse subscribeApiV1PushSubscribePost(pushSubscriptionCreate, userAgent)

Subscribe

Register a push subscription for the current user.  A user can have multiple subscriptions (one per device/browser). Each device/browser generates a unique push endpoint URL. If the same endpoint already exists (same browser re-subscribing), we update the keys instead of creating a duplicate.

### Example

```ts
import {
  Configuration,
  PushNotificationsApi,
} from 'bagad-client';
import type { SubscribeApiV1PushSubscribePostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PushNotificationsApi(config);

  const body = {
    // PushSubscriptionCreate
    pushSubscriptionCreate: ...,
    // string (optional)
    userAgent: userAgent_example,
  } satisfies SubscribeApiV1PushSubscribePostRequest;

  try {
    const data = await api.subscribeApiV1PushSubscribePost(body);
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
| **pushSubscriptionCreate** | [PushSubscriptionCreate](PushSubscriptionCreate.md) |  | |
| **userAgent** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**PushSubscriptionResponse**](PushSubscriptionResponse.md)

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


## testPushApiV1PushTestPost

> any testPushApiV1PushTestPost()

Test Push

Send a test push notification to the current user.

### Example

```ts
import {
  Configuration,
  PushNotificationsApi,
} from 'bagad-client';
import type { TestPushApiV1PushTestPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PushNotificationsApi(config);

  try {
    const data = await api.testPushApiV1PushTestPost();
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

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## unsubscribeApiV1PushUnsubscribeDelete

> unsubscribeApiV1PushUnsubscribeDelete(pushSubscriptionCreate)

Unsubscribe

Remove a push subscription for the current user.

### Example

```ts
import {
  Configuration,
  PushNotificationsApi,
} from 'bagad-client';
import type { UnsubscribeApiV1PushUnsubscribeDeleteRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new PushNotificationsApi(config);

  const body = {
    // PushSubscriptionCreate
    pushSubscriptionCreate: ...,
  } satisfies UnsubscribeApiV1PushUnsubscribeDeleteRequest;

  try {
    const data = await api.unsubscribeApiV1PushUnsubscribeDelete(body);
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
| **pushSubscriptionCreate** | [PushSubscriptionCreate](PushSubscriptionCreate.md) |  | |

### Return type

`void` (Empty response body)

### Authorization

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

