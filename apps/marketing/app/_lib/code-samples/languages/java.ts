export const language = "java";
export const label = "Java";

export const code = `import com.kibamail.Kibamail;
import com.kibamail.models.SendEmailRequest;

Kibamail kibamail = new Kibamail("your-api-key");

SendEmailRequest email = SendEmailRequest.builder()
    .from("hello@yourdomain.com")
    .to("user@example.com")
    .subject("Welcome to Kibamail")
    .html("<h1>Hello World</h1>")
    .build();

kibamail.emails().send(email);
`;
