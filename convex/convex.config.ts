import { defineApp } from 'convex/server';
import { v } from 'convex/values';

export default defineApp({
  env: {
    JWT_PRIVATE_KEY: v.string(),
    JWKS: v.string(),
    SITE_URL: v.string(),
  },
});
