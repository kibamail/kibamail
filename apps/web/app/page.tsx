import { signInAction } from "@/app/(auth)/actions/sign-in";
import { logtoConfig } from "@/config/logto";
import { signOutAction } from "@/app/(auth)/actions/sign-out";
import { AuthAction } from "@/app/(auth)/_components/auth-action";
import { getLogtoContext } from "@logto/next/server-actions";

export default async function Home() {
  const ctx = await getLogtoContext(logtoConfig, {
    fetchUserInfo: true,
  });

  // Auto-create workspace if user is authenticated but has no organizations
  // if (ctx.isAuthenticated && ctx.userInfo && (!ctx.organizations || ctx.organizations.length === 0)) {
  //   await logto.workspaces().create({
  //     name: `${ctx.userInfo.name || ctx.userInfo.username || "User"}'s Workspace`,
  //     description: "Default workspace",
  //   });
  // }

  return (
    <div className="w-full flex items-center h-screen justify-center">
      {ctx.isAuthenticated ? (
        <div className="flex flex-col gap-4">
          <h1 className="text-6xl font-bold">{ctx.claims?.sub}</h1>
          {/* {ctx.organizations && ctx.organizations.length > 0 && (
            <p className="text-sm text-gray-600">
              Organizations: {ctx.organizations.map(org => org.name).join(", ")}
            </p>
          )} */}

          <AuthAction onClick={signOutAction}>
            <button type="button" className="cursor-pointer">
              Sign out from the app
            </button>
          </AuthAction>
        </div>
      ) : (
        <AuthAction onClick={signInAction}>
          <button type="button" className="cursor-pointer">
            Sign into the app
          </button>
        </AuthAction>
      )}
    </div>
  );
}
