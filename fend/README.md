# IIITK Admin Dashboard

This is the admin dashboard for IIITK, built with React, TypeScript, and Vite.

## 🚀 Quick Setup

1. Clone the repository
2. Create a `.env` file in the project root with required variables:
```env
VITE_SERVER_URL=your_backend_url_here
```

## 💻 Development

### Using Bun (Recommended)

```bash
# Install bun if not installed
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Start development server
bun run dev
```

### Using npm

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 🏗️ Self Hosting

1. Build the application:
```bash
bun run build
# or
npm run build
```

2. The build output will be in `temp_build/` directory (configured in vite.config.ts)

3. Serve the build:
```bash
# Using any static file server, e.g.:
npx serve temp_build
```

## 📦 Production Deployment

The application builds to `temp_build/` directory. You can deploy this directory to any static hosting service:

### 1. Using nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/temp_build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 2. Using Apache

Create a `.htaccess` file in the build directory:
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-l
RewriteRule . /index.html [L]
```

### 3. Using Static Hosting Services

The `temp_build` directory can be directly deployed to:
- Cloudflare Pages (Currently hosted at)
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting

Remember to:
1. Configure environment variables
2. Set up proper redirects for client-side routing
3. Configure CORS if needed for API communication

## 🔧 Environment Variables

Required environment variables in `.env`:
```env
VITE_SERVER_URL=your_backend_url_here
```