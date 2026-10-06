# ProfilesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createGroupApiV1GroupsPost**](ProfilesApi.md#creategroupapiv1groupspost) | **POST** /api/v1/groups/ | Create Group |
| [**createMyApiKeyApiV1ProfilesMeApiKeysPost**](ProfilesApi.md#createmyapikeyapiv1profilesmeapikeyspost) | **POST** /api/v1/profiles/me/api-keys | Create My Api Key |
| [**createProfileApiV1ProfilesPost**](ProfilesApi.md#createprofileapiv1profilespost) | **POST** /api/v1/profiles/ | Create Profile |
| [**deleteProfileApiV1ProfilesProfileIdDelete**](ProfilesApi.md#deleteprofileapiv1profilesprofileiddelete) | **DELETE** /api/v1/profiles/{profile_id} | Delete Profile |
| [**getGlobalStatsApiV1StatsGet**](ProfilesApi.md#getglobalstatsapiv1statsget) | **GET** /api/v1/stats/ | Get Global Stats |
| [**getGroupApiV1GroupsGroupIdGet**](ProfilesApi.md#getgroupapiv1groupsgroupidget) | **GET** /api/v1/groups/{group_id} | Get Group |
| [**getMyMembershipApiV1ProfilesMeMembershipGet**](ProfilesApi.md#getmymembershipapiv1profilesmemembershipget) | **GET** /api/v1/profiles/me/membership | Get My Membership |
| [**getMyPermissionsApiV1ProfilesMePermissionsGet**](ProfilesApi.md#getmypermissionsapiv1profilesmepermissionsget) | **GET** /api/v1/profiles/me/permissions | Get My Permissions |
| [**getMyProfileApiV1ProfilesMeGet**](ProfilesApi.md#getmyprofileapiv1profilesmeget) | **GET** /api/v1/profiles/me | Get My Profile |
| [**getMyRolesApiV1ProfilesMeRolesGet**](ProfilesApi.md#getmyrolesapiv1profilesmerolesget) | **GET** /api/v1/profiles/me/roles | Get My Roles |
| [**getMyStatsApiV1StatsMeGet**](ProfilesApi.md#getmystatsapiv1statsmeget) | **GET** /api/v1/stats/me | Get My Stats |
| [**getProfileApiV1ProfilesProfileIdGet**](ProfilesApi.md#getprofileapiv1profilesprofileidget) | **GET** /api/v1/profiles/{profile_id} | Get Profile |
| [**getProfileMembershipApiV1ProfilesProfileIdMembershipGet**](ProfilesApi.md#getprofilemembershipapiv1profilesprofileidmembershipget) | **GET** /api/v1/profiles/{profile_id}/membership | Get Profile Membership |
| [**getUserRankingsApiV1StatsRankingsGet**](ProfilesApi.md#getuserrankingsapiv1statsrankingsget) | **GET** /api/v1/stats/rankings | Get User Rankings |
| [**listGroupsApiV1GroupsGet**](ProfilesApi.md#listgroupsapiv1groupsget) | **GET** /api/v1/groups/ | List Groups |
| [**listMyApiKeysApiV1ProfilesMeApiKeysGet**](ProfilesApi.md#listmyapikeysapiv1profilesmeapikeysget) | **GET** /api/v1/profiles/me/api-keys | List My Api Keys |
| [**listProfilesApiV1ProfilesGet**](ProfilesApi.md#listprofilesapiv1profilesget) | **GET** /api/v1/profiles/ | List Profiles |
| [**listRolesApiV1RolesGet**](ProfilesApi.md#listrolesapiv1rolesget) | **GET** /api/v1/roles/ | List Roles |
| [**revokeMyApiKeyApiV1ProfilesMeApiKeysKeyHashDelete**](ProfilesApi.md#revokemyapikeyapiv1profilesmeapikeyskeyhashdelete) | **DELETE** /api/v1/profiles/me/api-keys/{key_hash} | Revoke My Api Key |
| [**unsubscribeApiV1ProfilesProfileIdUnsubscribePost**](ProfilesApi.md#unsubscribeapiv1profilesprofileidunsubscribepost) | **POST** /api/v1/profiles/{profile_id}/unsubscribe | Unsubscribe |
| [**updateGroupApiV1GroupsGroupIdPut**](ProfilesApi.md#updategroupapiv1groupsgroupidput) | **PUT** /api/v1/groups/{group_id} | Update Group |
| [**updateMyProfileApiV1ProfilesMePut**](ProfilesApi.md#updatemyprofileapiv1profilesmeput) | **PUT** /api/v1/profiles/me | Update My Profile |
| [**updateProfileApiV1ProfilesProfileIdPut**](ProfilesApi.md#updateprofileapiv1profilesprofileidput) | **PUT** /api/v1/profiles/{profile_id} | Update Profile |
| [**uploadAvatarApiV1ProfilesMeAvatarPost**](ProfilesApi.md#uploadavatarapiv1profilesmeavatarpost) | **POST** /api/v1/profiles/me/avatar | Upload Avatar |



## createGroupApiV1GroupsPost

> Group createGroupApiV1GroupsPost(groupCreate)

Create Group

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { CreateGroupApiV1GroupsPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // GroupCreate
    groupCreate: ...,
  } satisfies CreateGroupApiV1GroupsPostRequest;

  try {
    const data = await api.createGroupApiV1GroupsPost(body);
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
| **groupCreate** | [GroupCreate](GroupCreate.md) |  | |

### Return type

[**Group**](Group.md)

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


## createMyApiKeyApiV1ProfilesMeApiKeysPost

> ApiKeyCreated createMyApiKeyApiV1ProfilesMeApiKeysPost(apiKeyCreate)

Create My Api Key

Mint a new API key for the current member.  The raw secret is returned exactly once, in this response; only its hash is stored, so it can never be retrieved again. Every requested permission must be one the member actually holds -- a key can never widen its owner\&#39;s rights.

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { CreateMyApiKeyApiV1ProfilesMeApiKeysPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // ApiKeyCreate
    apiKeyCreate: ...,
  } satisfies CreateMyApiKeyApiV1ProfilesMeApiKeysPostRequest;

  try {
    const data = await api.createMyApiKeyApiV1ProfilesMeApiKeysPost(body);
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
| **apiKeyCreate** | [ApiKeyCreate](ApiKeyCreate.md) |  | |

### Return type

[**ApiKeyCreated**](ApiKeyCreated.md)

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


## createProfileApiV1ProfilesPost

> Profile createProfileApiV1ProfilesPost(profileCreate)

Create Profile

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { CreateProfileApiV1ProfilesPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // ProfileCreate
    profileCreate: ...,
  } satisfies CreateProfileApiV1ProfilesPostRequest;

  try {
    const data = await api.createProfileApiV1ProfilesPost(body);
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
| **profileCreate** | [ProfileCreate](ProfileCreate.md) |  | |

### Return type

[**Profile**](Profile.md)

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


## deleteProfileApiV1ProfilesProfileIdDelete

> deleteProfileApiV1ProfilesProfileIdDelete(profileId)

Delete Profile

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { DeleteProfileApiV1ProfilesProfileIdDeleteRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // string
    profileId: profileId_example,
  } satisfies DeleteProfileApiV1ProfilesProfileIdDeleteRequest;

  try {
    const data = await api.deleteProfileApiV1ProfilesProfileIdDelete(body);
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
| **profileId** | `string` |  | [Defaults to `undefined`] |

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


## getGlobalStatsApiV1StatsGet

> GlobalStats getGlobalStatsApiV1StatsGet()

Get Global Stats

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { GetGlobalStatsApiV1StatsGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.getGlobalStatsApiV1StatsGet();
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

[**GlobalStats**](GlobalStats.md)

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


## getGroupApiV1GroupsGroupIdGet

> Group getGroupApiV1GroupsGroupIdGet(groupId)

Get Group

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { GetGroupApiV1GroupsGroupIdGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // number
    groupId: 56,
  } satisfies GetGroupApiV1GroupsGroupIdGetRequest;

  try {
    const data = await api.getGroupApiV1GroupsGroupIdGet(body);
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
| **groupId** | `number` |  | [Defaults to `undefined`] |

### Return type

[**Group**](Group.md)

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


## getMyMembershipApiV1ProfilesMeMembershipGet

> MembershipInfo getMyMembershipApiV1ProfilesMeMembershipGet()

Get My Membership

Return the current user\&#39;s membership status and history.

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { GetMyMembershipApiV1ProfilesMeMembershipGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.getMyMembershipApiV1ProfilesMeMembershipGet();
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

[**MembershipInfo**](MembershipInfo.md)

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


## getMyPermissionsApiV1ProfilesMePermissionsGet

> Array&lt;string | null&gt; getMyPermissionsApiV1ProfilesMePermissionsGet()

Get My Permissions

Returns all \&#39;action:resource\&#39; permission strings for the current user.

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { GetMyPermissionsApiV1ProfilesMePermissionsGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.getMyPermissionsApiV1ProfilesMePermissionsGet();
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

**Array<string | null>**

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


## getMyProfileApiV1ProfilesMeGet

> Profile getMyProfileApiV1ProfilesMeGet()

Get My Profile

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { GetMyProfileApiV1ProfilesMeGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.getMyProfileApiV1ProfilesMeGet();
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

[**Profile**](Profile.md)

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


## getMyRolesApiV1ProfilesMeRolesGet

> Array&lt;string | null&gt; getMyRolesApiV1ProfilesMeRolesGet()

Get My Roles

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { GetMyRolesApiV1ProfilesMeRolesGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.getMyRolesApiV1ProfilesMeRolesGet();
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

**Array<string | null>**

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


## getMyStatsApiV1StatsMeGet

> MyStats getMyStatsApiV1StatsMeGet()

Get My Stats

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { GetMyStatsApiV1StatsMeGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.getMyStatsApiV1StatsMeGet();
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

[**MyStats**](MyStats.md)

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


## getProfileApiV1ProfilesProfileIdGet

> Profile getProfileApiV1ProfilesProfileIdGet(profileId)

Get Profile

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { GetProfileApiV1ProfilesProfileIdGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // string
    profileId: profileId_example,
  } satisfies GetProfileApiV1ProfilesProfileIdGetRequest;

  try {
    const data = await api.getProfileApiV1ProfilesProfileIdGet(body);
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
| **profileId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**Profile**](Profile.md)

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


## getProfileMembershipApiV1ProfilesProfileIdMembershipGet

> MembershipInfo getProfileMembershipApiV1ProfilesProfileIdMembershipGet(profileId)

Get Profile Membership

Return a member\&#39;s membership status and history (staff/admin only).

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { GetProfileMembershipApiV1ProfilesProfileIdMembershipGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // string
    profileId: profileId_example,
  } satisfies GetProfileMembershipApiV1ProfilesProfileIdMembershipGetRequest;

  try {
    const data = await api.getProfileMembershipApiV1ProfilesProfileIdMembershipGet(body);
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
| **profileId** | `string` |  | [Defaults to `undefined`] |

### Return type

[**MembershipInfo**](MembershipInfo.md)

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


## getUserRankingsApiV1StatsRankingsGet

> UserRankings getUserRankingsApiV1StatsRankingsGet()

Get User Rankings

Rank active members by how they engage with events, per season.  For each season (plus an all-time window) members are ranked on three metrics, in order of the values we want to encourage:  * **Reactivity** — median delay between an event being published and the   member answering it (yes or no). Answering quickly lets the bagad commit   to organisers, so this is the primary metric. * **Response rate** — share of the season\&#39;s answerable events the member   responded to. Per-season only (a cross-season rate is meaningless), so   it is omitted from the all-time window. * **Positive responses** — absolute count of \&quot;yes\&quot; answers, i.e. turnouts.   Secondary, but tracked because outings keep the group alive.  Only members with at least :data:&#x60;MIN_POSITIVE_RESPONSES&#x60; positive responses all-time appear, to avoid ranking one-off participants.

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { GetUserRankingsApiV1StatsRankingsGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.getUserRankingsApiV1StatsRankingsGet();
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

[**UserRankings**](UserRankings.md)

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


## listGroupsApiV1GroupsGet

> Array&lt;Group&gt; listGroupsApiV1GroupsGet()

List Groups

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { ListGroupsApiV1GroupsGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.listGroupsApiV1GroupsGet();
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

[**Array&lt;Group&gt;**](Group.md)

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


## listMyApiKeysApiV1ProfilesMeApiKeysGet

> Array&lt;ApiKey&gt; listMyApiKeysApiV1ProfilesMeApiKeysGet()

List My Api Keys

List the current member\&#39;s API keys (never exposes the raw secret).

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { ListMyApiKeysApiV1ProfilesMeApiKeysGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.listMyApiKeysApiV1ProfilesMeApiKeysGet();
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

[**Array&lt;ApiKey&gt;**](ApiKey.md)

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


## listProfilesApiV1ProfilesGet

> Array&lt;Profile&gt; listProfilesApiV1ProfilesGet()

List Profiles

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { ListProfilesApiV1ProfilesGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.listProfilesApiV1ProfilesGet();
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

[**Array&lt;Profile&gt;**](Profile.md)

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


## listRolesApiV1RolesGet

> Array&lt;Role&gt; listRolesApiV1RolesGet()

List Roles

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { ListRolesApiV1RolesGetRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.listRolesApiV1RolesGet();
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

[**Array&lt;Role&gt;**](Role.md)

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


## revokeMyApiKeyApiV1ProfilesMeApiKeysKeyHashDelete

> revokeMyApiKeyApiV1ProfilesMeApiKeysKeyHashDelete(keyHash)

Revoke My Api Key

Revoke one of the current member\&#39;s API keys.

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { RevokeMyApiKeyApiV1ProfilesMeApiKeysKeyHashDeleteRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // string
    keyHash: keyHash_example,
  } satisfies RevokeMyApiKeyApiV1ProfilesMeApiKeysKeyHashDeleteRequest;

  try {
    const data = await api.revokeMyApiKeyApiV1ProfilesMeApiKeysKeyHashDelete(body);
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
| **keyHash** | `string` |  | [Defaults to `undefined`] |

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


## unsubscribeApiV1ProfilesProfileIdUnsubscribePost

> any unsubscribeApiV1ProfilesProfileIdUnsubscribePost(profileId, token)

Unsubscribe

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { UnsubscribeApiV1ProfilesProfileIdUnsubscribePostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const api = new ProfilesApi();

  const body = {
    // string
    profileId: profileId_example,
    // string
    token: token_example,
  } satisfies UnsubscribeApiV1ProfilesProfileIdUnsubscribePostRequest;

  try {
    const data = await api.unsubscribeApiV1ProfilesProfileIdUnsubscribePost(body);
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
| **profileId** | `string` |  | [Defaults to `undefined`] |
| **token** | `string` |  | [Defaults to `undefined`] |

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


## updateGroupApiV1GroupsGroupIdPut

> Group updateGroupApiV1GroupsGroupIdPut(groupId, groupUpdate)

Update Group

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { UpdateGroupApiV1GroupsGroupIdPutRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // number
    groupId: 56,
    // GroupUpdate
    groupUpdate: ...,
  } satisfies UpdateGroupApiV1GroupsGroupIdPutRequest;

  try {
    const data = await api.updateGroupApiV1GroupsGroupIdPut(body);
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
| **groupId** | `number` |  | [Defaults to `undefined`] |
| **groupUpdate** | [GroupUpdate](GroupUpdate.md) |  | |

### Return type

[**Group**](Group.md)

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


## updateMyProfileApiV1ProfilesMePut

> Profile updateMyProfileApiV1ProfilesMePut(myProfileUpdate)

Update My Profile

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { UpdateMyProfileApiV1ProfilesMePutRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // MyProfileUpdate
    myProfileUpdate: ...,
  } satisfies UpdateMyProfileApiV1ProfilesMePutRequest;

  try {
    const data = await api.updateMyProfileApiV1ProfilesMePut(body);
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
| **myProfileUpdate** | [MyProfileUpdate](MyProfileUpdate.md) |  | |

### Return type

[**Profile**](Profile.md)

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


## updateProfileApiV1ProfilesProfileIdPut

> Profile updateProfileApiV1ProfilesProfileIdPut(profileId, profileUpdate)

Update Profile

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { UpdateProfileApiV1ProfilesProfileIdPutRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  const body = {
    // string
    profileId: profileId_example,
    // ProfileUpdate
    profileUpdate: ...,
  } satisfies UpdateProfileApiV1ProfilesProfileIdPutRequest;

  try {
    const data = await api.updateProfileApiV1ProfilesProfileIdPut(body);
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
| **profileId** | `string` |  | [Defaults to `undefined`] |
| **profileUpdate** | [ProfileUpdate](ProfileUpdate.md) |  | |

### Return type

[**Profile**](Profile.md)

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


## uploadAvatarApiV1ProfilesMeAvatarPost

> GetUploadUrlResponse uploadAvatarApiV1ProfilesMeAvatarPost()

Upload Avatar

### Example

```ts
import {
  Configuration,
  ProfilesApi,
} from 'bagad-client';
import type { UploadAvatarApiV1ProfilesMeAvatarPostRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new ProfilesApi(config);

  try {
    const data = await api.uploadAvatarApiV1ProfilesMeAvatarPost();
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

[**GetUploadUrlResponse**](GetUploadUrlResponse.md)

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

