# InstrumentsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**listInstrumentsApiV1InstrumentsGet**](InstrumentsApi.md#listinstrumentsapiv1instrumentsget) | **GET** /api/v1/instruments | List Instruments |



## listInstrumentsApiV1InstrumentsGet

> Array&lt;PublicInstrument&gt; listInstrumentsApiV1InstrumentsGet()

List Instruments

Public: the instrument groups a member can be assigned to.  Returns only the &#x60;&#x60;PublicInstrument&#x60;&#x60; fields (id/name/color) and only groups flagged &#x60;&#x60;is_instrument&#x60;&#x60;, ordered by name - safe to expose unauthenticated. The response schema is a dedicated, closed shape (not a shared group schema) so this public surface cannot be widened by accident.

### Example

```ts
import {
  Configuration,
  InstrumentsApi,
} from 'bagad-client';
import type { ListInstrumentsApiV1InstrumentsGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new InstrumentsApi();

  try {
    const data = await api.listInstrumentsApiV1InstrumentsGet();
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

[**Array&lt;PublicInstrument&gt;**](PublicInstrument.md)

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

