import withBundleAnalyzer from "@next/bundle-analyzer";
const nextConfig = {
    output: "standalone",
    /* config options here */
    typescript: {
        ignoreBuildErrors: true,
    },
    reactStrictMode: false,
};
const withAnalyzer = withBundleAnalyzer({
    enabled: process.env.ANALYZE === "true",
});
export default withAnalyzer(nextConfig);
