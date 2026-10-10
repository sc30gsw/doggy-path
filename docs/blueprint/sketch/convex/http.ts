/** HTTP routes: only Convex Auth's. */
import { httpRouter } from 'convex/server';

import { auth } from './auth';

const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
