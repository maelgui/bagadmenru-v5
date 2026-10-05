# UtilsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getEmailsApiV1UtilsEmailsGet**](UtilsApi.md#getemailsapiv1utilsemailsget) | **GET** /api/v1/utils/emails | Get Emails |



## getEmailsApiV1UtilsEmailsGet

> Array&lt;InboxEmail&gt; getEmailsApiV1UtilsEmailsGet()

Get Emails

### Example

```ts
import {
  Configuration,
  UtilsApi,
} from 'bagad-client';
import type { GetEmailsApiV1UtilsEmailsGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new UtilsApi(config);

  try {
    const data = await api.getEmailsApiV1UtilsEmailsGet();
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

[**Array&lt;InboxEmail&gt;**](InboxEmail.md)

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

