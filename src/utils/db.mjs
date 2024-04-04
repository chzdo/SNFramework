import { MongoClient } from "mongodb"
import config from "dotenv";
config.config()
const dbUrl = process.env.AUTH_DB;
let db
try {
    db = new MongoClient(dbUrl)
} catch (e) {
    console.warn("auth db not specified - ignore if you do not intend to use the auth")
}
const dbName = 'myxalary'


class DB {
    #db
    constructor() {
        if (db) {
            this.#connect()
        }
    }

    async #connect() {
        await db.connect();
        this.#db = db.db(dbName);
    }

    get Users() {
        return this.#db.collection('users')
    }

    get Company() {
        return this.#db.collection('companies')
    }

    get Employee() {
        return this.#db.collection('employees')
    }

    get Role() {
        return this.#db.collection('roles')
    }
}

export default new DB()