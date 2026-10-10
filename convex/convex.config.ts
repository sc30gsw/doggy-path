import { defineApp } from 'convex/server';
import { v } from 'convex/values';

export default defineApp({
  env: {
    TYPESAFE_API_KEY: v.string(),
    ORS_API_KEY: v.string(),
    OVERPASS_API_URL: v.optional(v.string()),
    JWT_PRIVATE_KEY: v.string(),
    JWKS: v.string(),
    SITE_URL: v.string(),
  },
});
