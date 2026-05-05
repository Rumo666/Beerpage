import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            rolle: string;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        rolle: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        rolle: string;
    }
}