import {DBSchema, IDBPDatabase, openDB, StoreKey, StoreNames, StoreValue} from 'idb';

//todo: use typed db: https://github.com/jakearchibald/idb#examples

const DB_VERSION = 1;

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
        const deleteRequest = indexedDB.deleteDatabase('Session_DB');
        deleteRequest.onsuccess = () => {
            sessionStorage.setItem('session_active', 'true');
            console.log('Database deleted successfully');
        };
    }
    return openDB<SessionDb>('sessionStorage', DB_VERSION, {
        upgrade(db) {
            db.createObjectStore("LesRefs", {keyPath: "id"});
            db.createObjectStore("Loaded");
        },
    });
}

export class Repository<Schema, K extends StoreNames<Schema>> {
    constructor(private dbPromise: Promise<IDBPDatabase<Schema>>, private storeName: K) {
    }

    async get(id: StoreKey<Schema, K>): Promise<StoreValue<Schema, K> | undefined> {
        return (await this.dbPromise).get(this.storeName, id);
    }
    async put(data: StoreValue<Schema, K>, key?: StoreKey<Schema, K>) {
        return (await this.dbPromise).put(this.storeName, data, key);
    }

    async bulkPut(items: StoreValue<Schema, K>[]): Promise<void> {
        let db = await this.dbPromise;
        let tx = db.transaction(this.storeName, 'readwrite');
        let putPromises = items.map(item => tx.store.put(item));

        await Promise.all([...putPromises, tx.done]);
    }

    async findMatches(match: (item: StoreValue<Schema, K>)=> boolean) {
        let db = await this.dbPromise;
        let allRecords = await db.getAll(this.storeName);

        return allRecords.filter(match);
    }
}

export const SessionCache = {
    LesRefs: new Repository<SessionDb, "LesRefs">(dbSession, 'LesRefs'),
    Loaded: new Repository<SessionDb, "Loaded">(dbSession, 'Loaded'),
};
