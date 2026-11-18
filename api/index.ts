/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless Function entrypoint handling all /api/* routes.
 */

import { createApp } from '../server/app.ts';

const app = createApp();

export default app;
