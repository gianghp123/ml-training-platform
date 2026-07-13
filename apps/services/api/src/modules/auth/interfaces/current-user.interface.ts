// auth/interfaces/current-user.interface.ts
import { UserRole } from "src/libs/enums/user-role.enum";

export interface CurrentUser {
  userId: string;
  role: UserRole;
}
