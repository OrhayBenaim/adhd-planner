// apps/convex/convex/auth.config.ts
export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://affable-tiger-74.eu-west-1.convex.site",
      applicationID: "convex",
      algorithm: "RS256",
      jwks: "https://affable-tiger-74.eu-west-1.convex.site/api/auth/convex/jwks",
    },
  ],
};
