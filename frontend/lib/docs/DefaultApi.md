# DefaultApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**healthApiV1HealthGet**](DefaultApi.md#healthapiv1healthget) | **GET** /api/v1/health | Health |
| [**helloGet**](DefaultApi.md#helloget) | **GET** / | Hello |
| [**versionApiV1VersionGet**](DefaultApi.md#versionapiv1versionget) | **GET** /api/v1/version | Version |



## healthApiV1HealthGet

> HealthResponse healthApiV1HealthGet()

Health

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from 'bagad-client';
import type { HealthApiV1HealthGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.healthApiV1HealthGet();
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

[**HealthResponse**](HealthResponse.md)

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


## helloGet

> HealthResponse helloGet()

Hello

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from 'bagad-client';
import type { HelloGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.helloGet();
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

[**HealthResponse**](HealthResponse.md)

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


## versionApiV1VersionGet

> VersionResponse versionApiV1VersionGet()

Version

### Example

```ts
import {
  Configuration,
  DefaultApi,
} from 'bagad-client';
import type { VersionApiV1VersionGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new DefaultApi();

  try {
    const data = await api.versionApiV1VersionGet();
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

[**VersionResponse**](VersionResponse.md)

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

