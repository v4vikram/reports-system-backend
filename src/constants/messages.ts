export const ErrorMessages = {
  VALIDATION_FAILED: "Validation failed",
  NOT_FOUND: "Not found",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden",
  CONFLICT: "Resource already exists",
  EMAIL_ALREADY_REGISTERED: "Email is already registered",
  INVALID_CREDENTIALS: "Invalid email or password",
  INVALID_RESET_TOKEN: "Invalid or expired reset link",
  TOO_MANY_REQUESTS: "Too many requests, please try again later",
  INTERNAL_SERVER_ERROR: "Internal server error",
  CATEGORY_NAME_TAKEN: "A category with this name already exists under the same parent",
  CATEGORY_PARENT_NOT_FOUND: "Parent category not found",
  CATEGORY_CYCLE: "Cannot move a category under its own descendant",
  CATEGORY_HAS_CHILDREN: "Move or delete its subcategories first",
} as const;

export const SuccessMessages = {
  SUCCESS: "Success",
  CREATED: "Created successfully",
  UPDATED: "Updated successfully",
  DELETED: "Deleted successfully",
  FETCHED: "Fetched successfully",
  PASSWORD_RESET_EMAIL_SENT: "If that email is registered, a reset link has been sent",
  PASSWORD_RESET_SUCCESS: "Password has been reset — please log in again",
} as const;
