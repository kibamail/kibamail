export const language = "bash";
export const label = "cURL";

export const code = `curl -X POST https://api.kibamail.com/v1/emails \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "hello@yourdomain.com",
    "to": "user@example.com",
    "subject": "Welcome to Kibamail",
    "html": "<h1>Hello World</h1>"
  }'
`;
