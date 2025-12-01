export const language = "ruby";
export const label = "Rails";

export const code = `class UserMailer < ApplicationMailer
  default from: 'hello@yourdomain.com'

  def welcome_email(user)
    @user = user

    mail(
      to: @user.email,
      subject: 'Welcome to Kibamail'
    )
  end
end

# In your controller:
UserMailer.welcome_email(@user).deliver_later
`;
