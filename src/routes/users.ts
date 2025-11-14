import { createServerFn } from "@tanstack/react-start";
import { fetchMutation } from "@/lib/auth-server";
import { api } from "../../convex/_generated/api";

type UpdatePasswordData = {
  currentPassword: string;
  newPassword: string;
};

export const updatePassword = createServerFn({ method: "POST" }).handler(
  async (ctx: any) => {
    const { currentPassword, newPassword } = ctx.data as UpdatePasswordData;
    await fetchMutation(api.users.updateUserPassword, {
      currentPassword,
      newPassword,
    });
  }
);