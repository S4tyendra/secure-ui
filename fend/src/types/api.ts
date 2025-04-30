// Types generated from OpenAPI spec

export interface ValidationError {
    loc: (string | number)[];
    msg: string;
    type: string;
}

export interface HTTPValidationError {
    detail?: ValidationError[];
}

// Auth Schemas
export interface UserLogin {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    username: string;
}

export interface UserProfileResponse {
    _id: string;
    username: string;
    email: string; // Assuming email format is handled by input validation
    created_at: string; // ISO date string
    disabled: boolean;
}

export interface UserCreate {
    username: string; // Add length constraints in validation if needed (3-50)
    email: string;
    password: string; // Add length constraints in validation if needed (min 8)
}

export interface UserResponse {
    username: string;
    email: string;
    id: string; // Matches _id from UserProfileResponse? Assuming yes.
    created_at: string; // ISO date string
    disabled?: boolean; // Default false
}

// Nginx Management Schemas
export interface SiteInfo {
    name: string;
    is_enabled: boolean;
    content?: string | null;
}

export interface SiteCreate {
    name: string; // Add pattern validation if needed (^[a-zA-Z0-9._-]+$)
    content: string;
}

export interface SiteUpdate {
    enable?: boolean | null;
    content?: string | null;
}

export interface NginxConf {
    content: string;
}

export interface LogInfo {
    name: string;
    size_bytes: number;
    last_modified: number; // timestamp (float in python, number in TS)
}

export interface SiteActionStatus {
    success: boolean;
    message: string;
    site_name: string;
    action: string;
}

export interface LogActionStatus {
    success: boolean;
    message: string;
    log_name: string;
    action: string;
}

export interface ConfActionStatus {
    success: boolean;
    message: string;
    action: string;
}

export interface NginxCommandStatus {
    success: boolean;
    command: string;
    stdout?: string | null;
    stderr?: string | null;
    return_code: number;
    message: string;
}

// Define a more specific type for API error data structure
// Based on FastAPI/Pydantic error responses and custom errors
export interface ApiErrorData {
    detail?: string | ValidationError[] | { msg?: string; [key: string]: unknown }; // Use unknown instead of any
    message?: string; // For custom NginxManagementError
     // Add other potential error structures if known
}