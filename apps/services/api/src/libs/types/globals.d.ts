import { UserRole } from "@training-ml/contracts";

declare global {
  interface CustomJwtSessionClaims {
    role?: UserRole
  }
}
