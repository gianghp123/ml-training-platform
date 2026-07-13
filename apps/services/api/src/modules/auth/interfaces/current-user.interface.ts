// auth/interfaces/current-user.interface.ts
import { UserRole } from "@training-ml/contracts";

export interface CurrentUser {
  userId: string;
  role: UserRole;
}
