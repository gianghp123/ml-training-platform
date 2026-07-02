import { UserRole } from "../enums/user-role.enum";

declare global {
  interface CustomJwtSessionClaims {
    role?: UserRole
  }
}
