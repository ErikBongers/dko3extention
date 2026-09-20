import {DBSchema, IDBPDatabase, openDB} from 'idb';
import {Repository} from "./repository";

//todo: use typed db: https://github.com/jakearchibald/idb#examples

const DB_VERSION = 1;
const SESSION_DB_PREFIX = 'sessionStorage';

export interface Ref {
    id: string;
}

export interface LesRef extends Ref {
    name: string;
    vak: string;
}

export interface AssetRef extends Ref {
    code: string;
}

export interface TeacherRef extends Ref {
    id: string;
    firstName: string;
    lastName: string;
}

export interface SessionDb extends DBSchema {
    LesRefs: {
        value: LesRef;
        key: string;
        indexes: {};
    },
    Loaded: {
        key: string;
        value: boolean;
        indexes: {};
    },
    AssetRefs: {
        key: string;
        value: AssetRef;
        indexes: {};
    },
    TeacherRefs: {
        key: string;
        value: TeacherRef;
        indexes: {};
    },

}

async function initializeSession() {
    if (!sessionStorage.getItem('session_active')) {
        let dbs = await indexedDB.databases();
        for(let db of dbs) {
            if(db.name?.startsWith(SESSION_DB_PREFIX)) {
                const deleteRequest = indexedDB.deleteDatabase(db.name);
                deleteRequest.onsuccess = () => {
                    console.log(`Database ${db.name} deleted successfully.`);
                };
            }
        }
        sessionStorage.setItem('session_active', 'true');
    }
}

let cacheMap: Map<string, SessionSchoolCache> = new Map();

export async function getSessionSchoolCache(schoolId: string) {
    let cache = cacheMap.get(schoolId);
    if(!cache) {
        cache = await SessionSchoolCache.get(schoolId);
        cacheMap.set(schoolId, cache);
    }
    return cache;
}

export class SessionSchoolCache {
    get AssetRefs(): Repository<SessionDb, "AssetRefs"> {
        return this._AssetRefs;
    }
    get Loaded(): Repository<SessionDb, "Loaded"> {
        return this._Loaded;
    }
    get LesRefs(): Repository<SessionDb, "LesRefs"> {
        return this._LesRefs;
    }
    get TeacherRefs(): Repository<SessionDb, "TeacherRefs"> {
        return this._TeacherRefs;
    }
    private readonly _LesRefs: Repository<SessionDb, "LesRefs">;
    private readonly _Loaded: Repository<SessionDb, "Loaded">;
    private readonly _AssetRefs: Repository<SessionDb, "AssetRefs">;
    private readonly _TeacherRefs: Repository<SessionDb, "TeacherRefs">;

    constructor(private schoolId: string, private db: IDBPDatabase<SessionDb>) {
        this._LesRefs = new Repository<SessionDb, "LesRefs">(this.db, 'LesRefs');
        this._Loaded = new Repository<SessionDb, "Loaded">(this.db, 'Loaded');
        this._AssetRefs = new Repository<SessionDb, "AssetRefs">(this.db, 'AssetRefs');
        this._TeacherRefs = new Repository<SessionDb, "TeacherRefs">(this.db, 'TeacherRefs');
    }

    private static getDbName(schoolId: string) {
        return `${SESSION_DB_PREFIX}_${schoolId}`;
    }

    static async get(schoolId: string) {
        await initializeSession();
        return new SessionSchoolCache(schoolId, await openDB<SessionDb>(SessionSchoolCache.getDbName(schoolId), DB_VERSION, {
            upgrade(db) {
                db.createObjectStore("LesRefs", {keyPath: "id"});
                db.createObjectStore("Loaded");
                db.createObjectStore("AssetRefs", {keyPath: "id"});
                db.createObjectStore("TeacherRefs", {keyPath: "id"});
            },
        }));
    }
}