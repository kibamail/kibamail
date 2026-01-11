# Kibamail SDK Examples

Interactive examples for testing the Kibamail Node.js SDK locally.

## Setup

```bash
cd examples
npm install
```

## Password Reset Email

Send a password reset email using react-email templates.

```bash
npm run password-reset
```

You'll be prompted for:
- **API Key**: Your Kibamail API key
- **API URL**: The API endpoint (e.g., `http://localhost:3456`)
- **From Email**: Sender email address (must be from a verified domain)
- **To Email**: Recipient email address
- **Username**: Name to personalize the email

## Adding New Examples

1. Create a new folder under `examples/`
2. Add your react-email template as a `.tsx` file
3. Add a `main.ts` entry point
4. Add a script to `package.json`
