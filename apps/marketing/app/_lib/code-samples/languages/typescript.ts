export const language = "typescript";
export const label = "TypeScript";

export const code = `import { Kibamail, SendEmailRequest } from '@kibamail/sdk';

const kibamail = new Kibamail('your-api-key');

const email: SendEmailRequest = {
  from: 'hello@yourdomain.com',
  to: 'user@example.com',
  subject: 'Welcome to Kibamail',
  html: '<h1>Hello World</h1>',
};

await kibamail.emails.send(email);
`;
