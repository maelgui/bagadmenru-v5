/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { FileType } from './FileType';

export type File = {
    type: FileType;
    name: string;
    url?: string;
    id: number;
    is_root: boolean;
};

