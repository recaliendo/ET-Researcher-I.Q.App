import type { NextConfig } from 'next';
// 'unsafe-eval' is needed only by the development server (React refresh). Production builds omit it.
const dev=process.env.NODE_ENV!=='production';
const csp=["default-src 'self'",`script-src 'self' 'unsafe-inline'${dev?" 'unsafe-eval'":''}`,"style-src 'self' 'unsafe-inline'","img-src 'self' data:","connect-src 'self'","font-src 'self'","object-src 'none'","frame-ancestors 'none'","base-uri 'self'","form-action 'self'"].join('; ');
const config: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  poweredByHeader: false,
  async headers() { return [{source:'/:path*',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=(), usb=()'},
    {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
    {key:'Cross-Origin-Resource-Policy',value:'same-origin'},
    ...(dev?[]:[{key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}]),
    {key:'Content-Security-Policy',value:csp}
  ]},{source:'/api/:path*',headers:[{key:'Cache-Control',value:'no-store'},{key:'X-Robots-Tag',value:'noindex'}]}]; }
};
export default config;
