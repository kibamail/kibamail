export const language = "java";
export const label = "Spring";

export const code = `@Service
public class EmailService {

    @Autowired
    private Kibamail kibamail;

    public void sendWelcomeEmail(User user) {
        SendEmailRequest email = SendEmailRequest.builder()
            .from("hello@yourdomain.com")
            .to(user.getEmail())
            .subject("Welcome to Kibamail")
            .html("<h1>Hello World</h1>")
            .build();

        kibamail.emails().send(email);
    }
}
`;
