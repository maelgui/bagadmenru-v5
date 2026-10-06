# EventsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createEventApiV1EventsPost**](EventsApi.md#createeventapiv1eventspost) | **POST** /api/v1/events/ | Create Event |
| [**createResponseApiV1EventsEventIdResponsesPut**](EventsApi.md#createresponseapiv1eventseventidresponsesput) | **PUT** /api/v1/events/{event_id}/responses | Create Response |
| [**createResponseByTokenApiV1ResponsesLinkSavePut**](EventsApi.md#createresponsebytokenapiv1responseslinksaveput) | **PUT** /api/v1/responses/link/save | Create Response By Token |
| [**deleteEventApiV1EventsEventIdDelete**](EventsApi.md#deleteeventapiv1eventseventiddelete) | **DELETE** /api/v1/events/{event_id} | Delete Event |
| [**exportIcsApiV1EventsExportIcsGet**](EventsApi.md#exporticsapiv1eventsexporticsget) | **GET** /api/v1/events/export/ics | Export Ics |
| [**exportIcsMeApiV1EventsExportIcsMeGet**](EventsApi.md#exporticsmeapiv1eventsexporticsmeget) | **GET** /api/v1/events/export/ics/me | Export Ics Me |
| [**getEventApiV1EventsEventIdGet**](EventsApi.md#geteventapiv1eventseventidget) | **GET** /api/v1/events/{event_id} | Get Event |
| [**getResponseByTokenApiV1ResponsesLinkPrepareGet**](EventsApi.md#getresponsebytokenapiv1responseslinkprepareget) | **GET** /api/v1/responses/link/prepare | Get Response By Token |
| [**listEventsApiV1EventsGet**](EventsApi.md#listeventsapiv1eventsget) | **GET** /api/v1/events/ | List Events |
| [**listResponseChangesApiV1ResponsesChangesGet**](EventsApi.md#listresponsechangesapiv1responseschangesget) | **GET** /api/v1/responses/changes | List Response Changes |
| [**listResponsesApiV1ResponsesGet**](EventsApi.md#listresponsesapiv1responsesget) | **GET** /api/v1/responses/ | List Responses |
| [**updateEventApiV1EventsEventIdPut**](EventsApi.md#updateeventapiv1eventseventidput) | **PUT** /api/v1/events/{event_id} | Update Event |



## createEventApiV1EventsPost

> Event createEventApiV1EventsPost(eventCreate)

Create Event

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { CreateEventApiV1EventsPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventsApi(config);

  const body = {
    // EventCreate
    eventCreate: ...,
  } satisfies CreateEventApiV1EventsPostRequest;

  try {
    const data = await api.createEventApiV1EventsPost(body);
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
| **eventCreate** | [EventCreate](EventCreate.md) |  | |

### Return type

[**Event**](Event.md)

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


## createResponseApiV1EventsEventIdResponsesPut

> Response createResponseApiV1EventsEventIdResponsesPut(eventId, responseCreate)

Create Response

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { CreateResponseApiV1EventsEventIdResponsesPutRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventsApi(config);

  const body = {
    // number
    eventId: 56,
    // ResponseCreate
    responseCreate: ...,
  } satisfies CreateResponseApiV1EventsEventIdResponsesPutRequest;

  try {
    const data = await api.createResponseApiV1EventsEventIdResponsesPut(body);
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
| **eventId** | `number` |  | [Defaults to `undefined`] |
| **responseCreate** | [ResponseCreate](ResponseCreate.md) |  | |

### Return type

[**Response**](Response.md)

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


## createResponseByTokenApiV1ResponsesLinkSavePut

> Response createResponseByTokenApiV1ResponsesLinkSavePut(token, responseCreate)

Create Response By Token

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { CreateResponseByTokenApiV1ResponsesLinkSavePutRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new EventsApi();

  const body = {
    // string
    token: token_example,
    // ResponseCreate
    responseCreate: ...,
  } satisfies CreateResponseByTokenApiV1ResponsesLinkSavePutRequest;

  try {
    const data = await api.createResponseByTokenApiV1ResponsesLinkSavePut(body);
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
| **responseCreate** | [ResponseCreate](ResponseCreate.md) |  | |

### Return type

[**Response**](Response.md)

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


## deleteEventApiV1EventsEventIdDelete

> deleteEventApiV1EventsEventIdDelete(eventId)

Delete Event

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { DeleteEventApiV1EventsEventIdDeleteRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventsApi(config);

  const body = {
    // number
    eventId: 56,
  } satisfies DeleteEventApiV1EventsEventIdDeleteRequest;

  try {
    const data = await api.deleteEventApiV1EventsEventIdDelete(body);
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
| **eventId** | `number` |  | [Defaults to `undefined`] |

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


## exportIcsApiV1EventsExportIcsGet

> any exportIcsApiV1EventsExportIcsGet()

Export Ics

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { ExportIcsApiV1EventsExportIcsGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new EventsApi();

  try {
    const data = await api.exportIcsApiV1EventsExportIcsGet();
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


## exportIcsMeApiV1EventsExportIcsMeGet

> any exportIcsMeApiV1EventsExportIcsMeGet()

Export Ics Me

Authenticated ICS feed for the current member.  Reached either from a browser session (cookie/JWT) or from an API key whose &#x60;&#x60;authorized_permissions&#x60;&#x60; include &#x60;&#x60;view:calendar&#x60;&#x60; -- the key is read from the &#x60;&#x60;X-API-Key&#x60;&#x60; header or the &#x60;&#x60;api_key&#x60;&#x60; query parameter so a calendar app can subscribe by URL. Authentication is handled upstream in &#x60;&#x60;credentials&#x60;&#x60;; this endpoint requires the fine-grained &#x60;&#x60;view:calendar&#x60;&#x60; permission (distinct from &#x60;&#x60;view:event&#x60;&#x60;) so a calendar key is scoped to the feed alone and cannot list events.  Each event title is prefixed with the member\&#39;s participation status (present/absent/unanswered) so their responses are visible directly in the subscribed calendar; the public feed stays neutral.

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { ExportIcsMeApiV1EventsExportIcsMeGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventsApi(config);

  try {
    const data = await api.exportIcsMeApiV1EventsExportIcsMeGet();
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


## getEventApiV1EventsEventIdGet

> Event getEventApiV1EventsEventIdGet(eventId)

Get Event

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { GetEventApiV1EventsEventIdGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventsApi(config);

  const body = {
    // number
    eventId: 56,
  } satisfies GetEventApiV1EventsEventIdGetRequest;

  try {
    const data = await api.getEventApiV1EventsEventIdGet(body);
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
| **eventId** | `number` |  | [Defaults to `undefined`] |

### Return type

[**Event**](Event.md)

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


## getResponseByTokenApiV1ResponsesLinkPrepareGet

> Res getResponseByTokenApiV1ResponsesLinkPrepareGet(token)

Get Response By Token

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { GetResponseByTokenApiV1ResponsesLinkPrepareGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new EventsApi();

  const body = {
    // string
    token: token_example,
  } satisfies GetResponseByTokenApiV1ResponsesLinkPrepareGetRequest;

  try {
    const data = await api.getResponseByTokenApiV1ResponsesLinkPrepareGet(body);
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

[**Res**](Res.md)

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


## listEventsApiV1EventsGet

> Array&lt;Event&gt; listEventsApiV1EventsGet(limit, dateGte, dateLt, isInDoodle, ordering)

List Events

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { ListEventsApiV1EventsGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventsApi(config);

  const body = {
    // number (optional)
    limit: 56,
    // Date (optional)
    dateGte: 2013-10-20T19:20:30+01:00,
    // Date (optional)
    dateLt: 2013-10-20T19:20:30+01:00,
    // boolean (optional)
    isInDoodle: true,
    // string (optional)
    ordering: ordering_example,
  } satisfies ListEventsApiV1EventsGetRequest;

  try {
    const data = await api.listEventsApiV1EventsGet(body);
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
| **limit** | `number` |  | [Optional] [Defaults to `10`] |
| **dateGte** | `Date` |  | [Optional] [Defaults to `undefined`] |
| **dateLt** | `Date` |  | [Optional] [Defaults to `undefined`] |
| **isInDoodle** | `boolean` |  | [Optional] [Defaults to `undefined`] |
| **ordering** | `string` |  | [Optional] [Defaults to `&#39;date&#39;`] |

### Return type

[**Array&lt;Event&gt;**](Event.md)

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


## listResponseChangesApiV1ResponsesChangesGet

> Array&lt;ResponseChange&gt; listResponseChangesApiV1ResponsesChangesGet(dateGte, dateLt, userId)

List Response Changes

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { ListResponseChangesApiV1ResponsesChangesGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventsApi(config);

  const body = {
    // Date (optional)
    dateGte: 2013-10-20T19:20:30+01:00,
    // Date (optional)
    dateLt: 2013-10-20T19:20:30+01:00,
    // string (optional)
    userId: userId_example,
  } satisfies ListResponseChangesApiV1ResponsesChangesGetRequest;

  try {
    const data = await api.listResponseChangesApiV1ResponsesChangesGet(body);
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
| **dateGte** | `Date` |  | [Optional] [Defaults to `undefined`] |
| **dateLt** | `Date` |  | [Optional] [Defaults to `undefined`] |
| **userId** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;ResponseChange&gt;**](ResponseChange.md)

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


## listResponsesApiV1ResponsesGet

> Array&lt;Response&gt; listResponsesApiV1ResponsesGet(dateGte, dateLt, userId)

List Responses

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { ListResponsesApiV1ResponsesGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventsApi(config);

  const body = {
    // Date (optional)
    dateGte: 2013-10-20T19:20:30+01:00,
    // Date (optional)
    dateLt: 2013-10-20T19:20:30+01:00,
    // string (optional)
    userId: userId_example,
  } satisfies ListResponsesApiV1ResponsesGetRequest;

  try {
    const data = await api.listResponsesApiV1ResponsesGet(body);
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
| **dateGte** | `Date` |  | [Optional] [Defaults to `undefined`] |
| **dateLt** | `Date` |  | [Optional] [Defaults to `undefined`] |
| **userId** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;Response&gt;**](Response.md)

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


## updateEventApiV1EventsEventIdPut

> Event updateEventApiV1EventsEventIdPut(eventId, eventCreate)

Update Event

### Example

```ts
import {
  Configuration,
  EventsApi,
} from 'bagad-client';
import type { UpdateEventApiV1EventsEventIdPutRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new EventsApi(config);

  const body = {
    // number
    eventId: 56,
    // EventCreate
    eventCreate: ...,
  } satisfies UpdateEventApiV1EventsEventIdPutRequest;

  try {
    const data = await api.updateEventApiV1EventsEventIdPut(body);
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
| **eventId** | `number` |  | [Defaults to `undefined`] |
| **eventCreate** | [EventCreate](EventCreate.md) |  | |

### Return type

[**Event**](Event.md)

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

