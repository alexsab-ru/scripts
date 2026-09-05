export function leadAttempt<T>(owner: object, url: string, data: FormData, callback: () => Promise<T>): Promise<{ requestId?: string; calltouch: T }>;
export function finishLeadAttempt(owner: object): void;
