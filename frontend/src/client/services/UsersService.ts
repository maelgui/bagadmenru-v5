/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Profile } from '../models/Profile';
import type { ProfileUpdate } from '../models/ProfileUpdate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class UsersService {

    /**
     * Get My Profile
     * @returns Profile Successful Response
     * @throws ApiError
     */
    public static getMyProfileApiV1ProfilesMeGet(): CancelablePromise<Profile> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/profiles/me',
        });
    }

    /**
     * Update My Profile
     * @param requestBody
     * @returns Profile Successful Response
     * @throws ApiError
     */
    public static updateMyProfileApiV1ProfilesMePut(
        requestBody: ProfileUpdate,
    ): CancelablePromise<Profile> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/profiles/me',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Profile
     * @param profileId
     * @returns Profile Successful Response
     * @throws ApiError
     */
    public static getProfileApiV1ProfilesProfileIdGet(
        profileId: string,
    ): CancelablePromise<Profile> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/profiles/{profile_id}',
            path: {
                'profile_id': profileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * List Profiles
     * @returns Profile Successful Response
     * @throws ApiError
     */
    public static listProfilesApiV1ProfilesGet(): CancelablePromise<Array<Profile>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/profiles/',
        });
    }

}
