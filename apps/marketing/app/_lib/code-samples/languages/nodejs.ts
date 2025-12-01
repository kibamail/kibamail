export const language = "javascript";
export const label = "Node.js";

export const code = `import { Kibamail } from '@kibamail/sdk';

const kibamail = new Kibamail('your-api-key');

await kibamail.emails.send({
  from: 'hello@yourdomain.com',
  to: 'user@example.com',
  subject: 'Welcome to Kibamail',
  html: '<h1>Hello World</h1>',
});
`;
