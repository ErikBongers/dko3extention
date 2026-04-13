export type NotificationLevel = "info" | "warning" | "error" | "running";

export type NotificationId =
    "FILE_POSTED" | "WOORD_ROSTERS_IS_DIFF" | "WOORD_ROSTER_CHANGED" | "WOORD_ROSTER_RUN"
    | "MUZIEK_ROSTERS_IS_DIFF" | "MUZIEK_ROSTER_CHANGED" | "MUZIEK_ROSTER_RUN"
    | "OTHER"; //todo: OTHER should eventually be removed, as we need to be able to indentify every notif in order to be able to remove it.

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

