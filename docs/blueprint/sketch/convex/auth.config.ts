/** Convex Auth's JWT issuer config (standard @convex-dev/auth setup). */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
};
