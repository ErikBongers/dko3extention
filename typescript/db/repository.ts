import {IDBPDatabase, StoreKey, StoreNames, StoreValue} from "idb";

export class Repository<Schema, K extends StoreNames<Schema>> {
    constructor(private db: IDBPDatabase<Schema>, private storeName: K) {
    }

    async get(id: StoreKey<Schema, K>): Promise<StoreValue<Schema, K> | undefined> {
        return this.db.get(this.storeName, id);
    }

    async put(data: StoreValue<Schema, K>, key?: StoreKey<Schema, K>) {
        return this.db.put(this.storeName, data, key);
    }

    async bulkPut(items: StoreValue<Schema, K>[]): Promise<void> {
        let tx = this.db.transaction(this.storeName, 'readwrite');
        let putPromises = items.map(item => tx.store.put(item));

        await Promise.all([...putPromises, tx.done]);
    }

    async findMatches(match: (item: StoreValue<Schema, K>) => boolean) {
        let allRecords = await this.db.getAll(this.storeName);

        return allRecords.filter(match);
    }
}