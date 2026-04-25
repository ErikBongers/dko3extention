export type NotificationLevel = "info" | "warning" | "error" | "running";

export type NotificationId =
    "FILE_POSTED";

export interface Notification {
    level: NotificationLevel;
    id: NotificationId;
    message: string;
    data: string;
}

export interface Notifications {
    instance: number;
    notifications: {
        [key in NotificationId]?: Notification;
    }
}

export type CheckName  = "WOORD_ROSTERS";

export interface CheckStatus {
    status: "INITIAL" | "RUNNING" | "FINISHED" | "FAILED";
    date: string;
    errors: string[];
}

