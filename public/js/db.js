const DB_NAME = "PasDerDB";
const DB_VERSION = 2; // Naikkan versi untuk membuat tabel paket

const dbManager = {
    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                // Tabel Destinasi
                if (!db.objectStoreNames.contains("destinations")) {
                    db.createObjectStore("destinations", { keyPath: "id", autoIncrement: true });
                }
                // Tabel Paket Wisata
                if (!db.objectStoreNames.contains("packages")) {
                    db.createObjectStore("packages", { keyPath: "id", autoIncrement: true });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    async getAll(storeName = "destinations") {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(storeName, "readonly");
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
        });
    },
    async getById(storeName, id) {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(storeName, "readonly");
            const request = tx.objectStore(storeName).get(parseInt(id));
            request.onsuccess = () => resolve(request.result);
        });
    },
    async save(storeName, data) {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(storeName, "readwrite");
            tx.objectStore(storeName).add(data);
            tx.oncomplete = () => resolve(true);
        });
    },
    async update(storeName, data) {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(storeName, "readwrite");
            tx.objectStore(storeName).put(data);
            tx.oncomplete = () => resolve(true);
        });
    },
    async delete(storeName, id) {
        const db = await this.open();
        return new Promise((resolve) => {
            const tx = db.transaction(storeName, "readwrite");
            tx.objectStore(storeName).delete(parseInt(id));
            tx.oncomplete = () => resolve(true);
        });
    }
};