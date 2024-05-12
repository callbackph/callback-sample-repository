import { UserModel } from "@/app/models/User";
import sendEmail from "@/lib/email";
import clientPromise from "@/lib/mongodb/client";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import { NextAuthOptions } from "next-auth";
import Email from "next-auth/providers/email";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      userinfo: {
        url: "https://graph.facebook.com/v19.0/me",
        params: {
          fields: "id,name,email,first_name,last_name",
        },
        async request({ tokens, client, provider }) {
          // eslint-disable-next-line
          return await client.userinfo(tokens.access_token!, {
            // @ts-expect-error
            params: provider.userinfo?.params,
          });
        },
      },
      profile: (_profile) => {
        return {
          id: _profile.id,
          firstName: _profile.first_name,
          lastName: _profile.last_name,
          email: _profile.email,
          registrationType: "facebook",
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      profile: (_profile) => {
        return {
          id: _profile.sub,
          firstName: _profile.given_name,
          lastName: _profile.family_name,
          email: _profile.email,
          registrationType: "google",
        };
      },
    }),
    Email({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({
        identifier: email,
        url: urlString,
        token,
        provider,
      }) => {
        const url: URL = new URL(urlString);
        let firstName;
        const callbackUrl = new URL(url.searchParams.get("callbackUrl")!);

        if (callbackUrl.searchParams.get("firstName") == null) {
          // if login
          const user = await UserModel.findOne({ email });
          firstName = user.firstName;
        } else {
          // if register
          firstName = callbackUrl.searchParams.get("firstName");
        }
        // Customize the email content here with the user's name
        const subject = "Verify your email address";
        const text = `text`;
        const html = `<div style="align-items: center; padding: 1.25rem; max-width: 600px ; margin: 0 auto;">
            <div style="margin-bottom: 1rem; text-align: center">
            <img src='https://callbackpdfphotobucket.s3.ap-southeast-1.amazonaws.com/blacklogo.png' alt="image" style="width: 100px;  margin-bottom: 1.5rem;" />
            </div>
            <div style="text-align: center; text-color: black;">
                <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;">Hello ${firstName}, </h1>
                <p style="font-size: 0.75rem; font-weight: bold;">Welcome to Callback!</p>
            </div>
            <div style="margin-bottom: 1rem; text-align: center">
            <img src='https://callbackpdfphotobucket.s3.ap-southeast-1.amazonaws.com/callbackemailicon.png' alt="image" style="width: 200px;  margin-bottom: 1.5rem;" />
            </div>
            <div style="text-align: center; text-color: black;">
                <h1 style="font-size: 1rem; font-weight: bold; margin-bottom: 0.5rem;">You’re almost there!</h1>
                <p style="font-size: 0.75rem; font-weight: bold;">simply click the button below to sign in:</p>
                <a href=${urlString} style="font-size: 1rem; background-color: #F5E809; color: black; border-radius: 9999px; padding: 0.75rem 1.125rem; text-decoration: none; display: inline-block; margin-top: 1.5rem;">Verify Email</a>
            </div>
            <div style="background-color: #f3f4f6; width: 100%; text-align: center; padding: 1rem 1.5rem; margin-top: 1.5rem;">
                <p style="font-weight: bold; font-size: 1rem">Or try using this link:</p>
                <a href=${urlString} style="text-decoration: none; color: inherit; word-break: break-word; font-size: 0.8rem;">${urlString}</a>
            </div>
            
            <hr style="width: 100%; margin-top: 15px; margin-left: auto; margin-right: auto;">
      
            <div style="font-size: 1rem; width: 100%; margin-top: 1.5rem; text-align: center; color: gray;">
                <p style="font-weight: bold;">Need assistance Contact our support team:</p>
                <p style="text-decoration: none;">support@callback.ph</p>
            </div>
          </div>
          `;

        // Send the email using SendGrid or your preferred email service
        await sendEmail({ to: email, subject, text, html });
      },
    }),
  ],
  pages: {
    signIn: "/register",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/new-user",
  },
  session: {
    strategy: "jwt",
  },
  jwt: {
    secret: process.env.NEXTAUTH_JWT_SECRET,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
