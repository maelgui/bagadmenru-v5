/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_create_file_api_v1_files__post } from '../models/Body_create_file_api_v1_files__post';
import type { File } from '../models/File';
import type { FileUpdate } from '../models/FileUpdate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class FilesService {

    /**
     * Get Root
     * @returns File Successful Response
     * @throws ApiError
     */
    public static getRootApiV1FilesGet(): CancelablePromise<File> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/files/',
        });
    }

    /**
     * Create File
     * @param formData
     * @returns File Successful Response
     * @throws ApiError
     */
    public static createFileApiV1FilesPost(
        formData: Body_create_file_api_v1_files__post,
    ): CancelablePromise<File> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/files/',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get File
     * @param fileId
     * @returns File Successful Response
     * @throws ApiError
     */
    public static getFileApiV1FilesFileIdGet(
        fileId: string,
    ): CancelablePromise<File> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/files/{file_id}',
            path: {
                'file_id': fileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update File
     * @param fileId
     * @param requestBody
     * @returns File Successful Response
     * @throws ApiError
     */
    public static updateFileApiV1FilesFileIdPut(
        fileId: string,
        requestBody: FileUpdate,
    ): CancelablePromise<File> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/files/{file_id}',
            path: {
                'file_id': fileId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Delete File
     * @param fileId
     * @returns void
     * @throws ApiError
     */
    public static deleteFileApiV1FilesFileIdDelete(
        fileId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/files/{file_id}',
            path: {
                'file_id': fileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * List Children
     * @param fileId
     * @returns File Successful Response
     * @throws ApiError
     */
    public static listChildrenApiV1FilesFileIdChildrenGet(
        fileId: string,
    ): CancelablePromise<Array<File>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/files/{file_id}/children',
            path: {
                'file_id': fileId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
