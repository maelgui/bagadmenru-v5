# FilesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createFolderApiV1FilesFolderIdPost**](FilesApi.md#createfolderapiv1filesfolderidpost) | **POST** /api/v1/files/{folder_id} | Create Folder |
| [**deleteFileApiV1FilesFileIdDelete**](FilesApi.md#deletefileapiv1filesfileiddelete) | **DELETE** /api/v1/files/{file_id} | Delete File |
| [**getBreadcrumbApiV1FilesFileIdBreadcrumbGet**](FilesApi.md#getbreadcrumbapiv1filesfileidbreadcrumbget) | **GET** /api/v1/files/{file_id}/breadcrumb | Get Breadcrumb |
| [**getFileApiV1FilesFileIdGet**](FilesApi.md#getfileapiv1filesfileidget) | **GET** /api/v1/files/{file_id} | Get File |
| [**getRootApiV1FilesRootGet**](FilesApi.md#getrootapiv1filesrootget) | **GET** /api/v1/files/root | Get Root |
| [**listChildrenApiV1FilesFolderIdChildrenGet**](FilesApi.md#listchildrenapiv1filesfolderidchildrenget) | **GET** /api/v1/files/{folder_id}/children | List Children |
| [**listFilesApiV1FilesGet**](FilesApi.md#listfilesapiv1filesget) | **GET** /api/v1/files/ | List Files |
| [**updateFileApiV1FilesFileIdPut**](FilesApi.md#updatefileapiv1filesfileidput) | **PUT** /api/v1/files/{file_id} | Update File |
| [**uploadFileApiV1FilesFolderIdUploadPost**](FilesApi.md#uploadfileapiv1filesfolderiduploadpost) | **POST** /api/v1/files/{folder_id}/upload | Upload File |



## createFolderApiV1FilesFolderIdPost

> FileOrFolder createFolderApiV1FilesFolderIdPost(folderId, folderCreate)

Create Folder

Create a new folder.

### Example

```ts
import {
  Configuration,
  FilesApi,
} from 'bagad-client';
import type { CreateFolderApiV1FilesFolderIdPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new FilesApi(config);

  const body = {
    // number
    folderId: 56,
    // FolderCreate
    folderCreate: ...,
  } satisfies CreateFolderApiV1FilesFolderIdPostRequest;

  try {
    const data = await api.createFolderApiV1FilesFolderIdPost(body);
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
| **folderId** | `number` |  | [Defaults to `undefined`] |
| **folderCreate** | [FolderCreate](FolderCreate.md) |  | |

### Return type

[**FileOrFolder**](FileOrFolder.md)

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


## deleteFileApiV1FilesFileIdDelete

> deleteFileApiV1FilesFileIdDelete(fileId)

Delete File

Delete an existing file or folder.

### Example

```ts
import {
  Configuration,
  FilesApi,
} from 'bagad-client';
import type { DeleteFileApiV1FilesFileIdDeleteRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new FilesApi(config);

  const body = {
    // number
    fileId: 56,
  } satisfies DeleteFileApiV1FilesFileIdDeleteRequest;

  try {
    const data = await api.deleteFileApiV1FilesFileIdDelete(body);
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
| **fileId** | `number` |  | [Defaults to `undefined`] |

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


## getBreadcrumbApiV1FilesFileIdBreadcrumbGet

> Array&lt;FileOrFolder&gt; getBreadcrumbApiV1FilesFileIdBreadcrumbGet(fileId)

Get Breadcrumb

Get breadcrumb for a file.

### Example

```ts
import {
  Configuration,
  FilesApi,
} from 'bagad-client';
import type { GetBreadcrumbApiV1FilesFileIdBreadcrumbGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new FilesApi(config);

  const body = {
    // number
    fileId: 56,
  } satisfies GetBreadcrumbApiV1FilesFileIdBreadcrumbGetRequest;

  try {
    const data = await api.getBreadcrumbApiV1FilesFileIdBreadcrumbGet(body);
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
| **fileId** | `number` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;FileOrFolder&gt;**](FileOrFolder.md)

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


## getFileApiV1FilesFileIdGet

> FileOrFolder getFileApiV1FilesFileIdGet(fileId)

Get File

Get a file or folder by id.

### Example

```ts
import {
  Configuration,
  FilesApi,
} from 'bagad-client';
import type { GetFileApiV1FilesFileIdGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new FilesApi(config);

  const body = {
    // number
    fileId: 56,
  } satisfies GetFileApiV1FilesFileIdGetRequest;

  try {
    const data = await api.getFileApiV1FilesFileIdGet(body);
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
| **fileId** | `number` |  | [Defaults to `undefined`] |

### Return type

[**FileOrFolder**](FileOrFolder.md)

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


## getRootApiV1FilesRootGet

> FileOrFolder getRootApiV1FilesRootGet()

Get Root

Get root folder entity.

### Example

```ts
import {
  Configuration,
  FilesApi,
} from 'bagad-client';
import type { GetRootApiV1FilesRootGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new FilesApi(config);

  try {
    const data = await api.getRootApiV1FilesRootGet();
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

[**FileOrFolder**](FileOrFolder.md)

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


## listChildrenApiV1FilesFolderIdChildrenGet

> Array&lt;FileOrFolder&gt; listChildrenApiV1FilesFolderIdChildrenGet(folderId)

List Children

Get all chidren of a folder.

### Example

```ts
import {
  Configuration,
  FilesApi,
} from 'bagad-client';
import type { ListChildrenApiV1FilesFolderIdChildrenGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new FilesApi(config);

  const body = {
    // number
    folderId: 56,
  } satisfies ListChildrenApiV1FilesFolderIdChildrenGetRequest;

  try {
    const data = await api.listChildrenApiV1FilesFolderIdChildrenGet(body);
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
| **folderId** | `number` |  | [Defaults to `undefined`] |

### Return type

[**Array&lt;FileOrFolder&gt;**](FileOrFolder.md)

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


## listFilesApiV1FilesGet

> Array&lt;FileOrFolder&gt; listFilesApiV1FilesGet(t, limit)

List Files

List recent files.

### Example

```ts
import {
  Configuration,
  FilesApi,
} from 'bagad-client';
import type { ListFilesApiV1FilesGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new FilesApi(config);

  const body = {
    // FileOrFolderType (optional)
    t: ...,
    // number (optional)
    limit: 56,
  } satisfies ListFilesApiV1FilesGetRequest;

  try {
    const data = await api.listFilesApiV1FilesGet(body);
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
| **t** | `FileOrFolderType` |  | [Optional] [Defaults to `undefined`] [Enum: DIR, FILE] |
| **limit** | `number` |  | [Optional] [Defaults to `10`] |

### Return type

[**Array&lt;FileOrFolder&gt;**](FileOrFolder.md)

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


## updateFileApiV1FilesFileIdPut

> FileOrFolder updateFileApiV1FilesFileIdPut(fileId, fileOrFolderUpdate)

Update File

Update an existing file or folder

### Example

```ts
import {
  Configuration,
  FilesApi,
} from 'bagad-client';
import type { UpdateFileApiV1FilesFileIdPutRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new FilesApi(config);

  const body = {
    // number
    fileId: 56,
    // FileOrFolderUpdate
    fileOrFolderUpdate: ...,
  } satisfies UpdateFileApiV1FilesFileIdPutRequest;

  try {
    const data = await api.updateFileApiV1FilesFileIdPut(body);
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
| **fileId** | `number` |  | [Defaults to `undefined`] |
| **fileOrFolderUpdate** | [FileOrFolderUpdate](FileOrFolderUpdate.md) |  | |

### Return type

[**FileOrFolder**](FileOrFolder.md)

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


## uploadFileApiV1FilesFolderIdUploadPost

> FileOrFolder uploadFileApiV1FilesFolderIdUploadPost(folderId, file, force)

Upload File

Upload a file.

### Example

```ts
import {
  Configuration,
  FilesApi,
} from 'bagad-client';
import type { UploadFileApiV1FilesFolderIdUploadPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new FilesApi(config);

  const body = {
    // number
    folderId: 56,
    // Blob
    file: BINARY_DATA_HERE,
    // boolean (optional)
    force: true,
  } satisfies UploadFileApiV1FilesFolderIdUploadPostRequest;

  try {
    const data = await api.uploadFileApiV1FilesFolderIdUploadPost(body);
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
| **folderId** | `number` |  | [Defaults to `undefined`] |
| **file** | `Blob` |  | [Defaults to `undefined`] |
| **force** | `boolean` |  | [Optional] [Defaults to `false`] |

### Return type

[**FileOrFolder**](FileOrFolder.md)

### Authorization

[HTTPBearer](../README.md#HTTPBearer)

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

