/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://ppmechanicalllc.com',
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/api/*', '/admin', '/admin/*', '/thank-you'],
  robotsTxtOptions: {
    policies: [
      // /admin is the authenticated commercial estimating system and must
      // never be crawled or indexed.
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/admin/'] },
    ],
  },
};
