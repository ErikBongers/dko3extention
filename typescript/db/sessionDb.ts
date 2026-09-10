import {DBSchema, openDB} from 'idb';
import {Repository} from "./repository";

//todo: use typed db: https://github.com/jakearchibald/idb#examples

const DB_VERSION = 1;
const DB_NAME = 'sessionStorage';

export interface LesRef {
    id: string;
    name: string;
}

interface SessionDb extends DBSchema {
    LesRefs: {
        value: LesRef;
        key: string;
        indexes: {};
    },
    Loaded: {
        key: string;
        value: boolean;
        indexes: {};
    }
}

const dbSession = initializeSession();

function initializeSession() {
    if (!sessionStorage.getItem('session_active')) {
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
        deleteRequest.onsuccess = () => {
            sessionStorage.setItem('session_active', 'true');
            console.log('Database deleted successfully');
        };
    }
    return openDB<SessionDb>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            db.createObjectStore("LesRefs", {keyPath: "id"});
            db.createObjectStore("Loaded");
        },
    });
}

export const SessionCache = {
    LesRefs: new Repository<SessionDb, "LesRefs">(dbSession, 'LesRefs'),
    Loaded: new Repository<SessionDb, "Loaded">(dbSession, 'Loaded'),
};
