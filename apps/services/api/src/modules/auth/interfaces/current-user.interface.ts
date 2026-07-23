// auth/interfaces/current-user.interface.ts
import { UserRole } from "@training-ml/contracts";

export interface RequestUser {
  userId: string;
  role: UserRole;
}
