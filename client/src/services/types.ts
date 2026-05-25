export type ApiResponse<T> = {
    success: boolean;
    statusCode?: number;
    message?: string;
    data: T;
    meta?: Record<string, unknown>;
};

