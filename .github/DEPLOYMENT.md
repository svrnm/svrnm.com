# Deployment Guide

This repository uses GitHub Actions to automatically deploy the Hugo site to GitHub Pages.

## Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository settings on GitHub
2. Navigate to **Pages** in the left sidebar
3. Under **Source**, select **GitHub Actions**
4. Save the changes

### 2. Configure Custom Domain

The `static/CNAME` file contains your custom domain (`svrnm.com`). This file is automatically included in the build.

**Additional DNS Configuration Required:**

1. **Add DNS Records** (at your domain registrar):
   - Type: `A` records pointing to GitHub Pages IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
   - OR use a `CNAME` record pointing to: `svrnm.github.io` (if using a subdomain)

2. **Enable HTTPS** (automatic):
   - GitHub Pages automatically provisions SSL certificates for custom domains
   - This may take a few minutes after DNS propagation

3. **Verify Domain**:
   - GitHub will verify the domain ownership
   - Check the repository settings → Pages → Custom domain

### 3. Workflow Behavior

- **Automatic Deployment**: Pushes to `main` branch trigger automatic deployment
- **Manual Deployment**: Use the "Run workflow" button in the Actions tab
- **Concurrency**: Only one deployment runs at a time (previous ones are cancelled)

### 4. Security Features

This deployment follows OpenSSF security best practices:

- ✅ Pinned action versions
- ✅ Least privilege permissions
- ✅ OIDC authentication
- ✅ Dependency review
- ✅ Regular security scans

## Troubleshooting

### Build Failures

- Check the Actions tab for error messages
- Verify Hugo version compatibility
- Ensure all required files are committed

### Domain Not Working

- Verify DNS records are correct (use `dig` or `nslookup`)
- Wait for DNS propagation (can take up to 48 hours)
- Check GitHub Pages settings for domain verification status
- Ensure `static/CNAME` file exists and contains the correct domain

### SSL Certificate Issues

- GitHub automatically provisions certificates, but it may take time
- Ensure DNS is correctly configured
- Check repository settings → Pages → Custom domain
