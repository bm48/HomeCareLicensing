// checkout for more details: https://www.npmjs.com/package/next-sitemap

const siteUrl = 'https://home-care-licensing.vercel.app/'; // Replace with your website's URL

const config = {
    siteUrl: siteUrl,
    generateRobotsTxt: true, // Generates a robots.txt file
    outDir: './out',
    // additionalSitemaps: [`${siteUrl}/sitemap.xml`],
    // Additional configuration options can be added here

    // Customizing the sitemap paths
    transform: async (config: { siteUrl: any; }, path: any) => {
        return {
            loc: `${config.siteUrl}${path}`,
            lastmod: new Date().toISOString(),
            changefreq: 'daily',
            priority: 1.0,
        };
    },

    robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
            },
        ],
        additionalSitemaps: [`${siteUrl}/sitemap.xml`],
    },
};

export default config;
