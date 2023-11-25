import mongoose, { Model, model } from "mongoose";
import rx from "rx";
import tunnel from "tunnel-ssh";
class mg {
    models = {}
    defaultModel = [{
        name: "counters",
        schema: {
            name: String,
            seq: Number
        },
        options: {
            _id: false
        }
    }]

    constructor({ url, models = [], sshCredentials }) {
        this.url = url;
        this.sshCredentials = sshCredentials;
        this.initialModel = models
        //this.setupModels(models)


        // while (!this.connection) { }

    }



    setupModels(models) {
        models = [...this.defaultModel, ...this.initialModel];
        this.connection = mongoose.createConnection(this.url)
        for (let model of models) {
            const { name, schema, options, views, hooks, statics = {}, virtuals, indexes = [] } = model;
            if (name === "counters") {
                this.connection.model(name, mongoose.Schema(schema));
                continue;
            }
            if (!name) {
                throw new Error(`schema does not have a name`);
            }
            let schemaCX = schema;
            if (!(schemaCX instanceof mongoose.Schema)) {
                schemaCX = new mongoose.Schema(schemaCX);
            }
            schemaCX.statics = {
                ...schemaCX.statics,
                ...defaultStatics,
                ...statics
            }
            if (hooks?.pre) {
                for (let items in hooks.pre) {
                    schemaCX.pre(items, hooks.pre[items])
                }
            }

            if (hooks?.post) {
                for (let items in hooks.post) {
                    schemaCX.post(items, hooks.post[items])
                }
            }
            if (indexes.length) {
                for (let { indexField, indexOptions } in indexes) {
                    schemaCX.index(indexField, indexOptions)
                }
            }
            schemaCX.add({ id: { type: Number, index: true, unique: true } });

            schemaCX.plugin(autoIncrement, { field: "id" });
            schemaCX.plugin(checkUpdate, {});
            //create model
            this.connection.model(name, schemaCX, name);
            if (views?.length) {
                (async () => {
                    views.forEach(async (value) => {
                        try {
                            await this.connection.dropCollection(value.name)
                        } catch (e) {
                            console.log(`could not delete view`)
                        }
                        const modelView = this.connection.model(value.name, value.schema, value.name);
                        await modelView.createCollection({
                            viewOn: name,
                            pipeline: value.pipeline
                        })
                    })

                })()
            }
        }
        console.log(`DB Setup Completed!`)
    }
    getModel(name) {
        return this.connection.models[name];
    }
}

var autoIncrement = function (schema, options) {
    var field = {
        _id: { type: Number, index: true, unique: true },
        createdOn: { type: Date, default: Date.now },
        modifiedOn: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false }
    };

    // swith to options field
    var fieldName = getField(options);
    if (fieldName !== "_id") {
        field[getField(options)] = { type: Number, index: true, unique: true };
        delete field._id;
    }
    schema.add(field);
    schema.pre("save", function (next) {
        var doc = this;
        if (!doc.createdOn) {
            doc.createdOn = Date.now();
        }
        if (doc.db && doc.isNew && typeof doc[fieldName] === "undefined") {
            getNextSeqObservable(doc.db, doc.collection.name)
                .retryWhen((err) => {
                    return err;
                })
                .subscribe((seq) => {
                    doc[fieldName] = seq;
                    next();
                });
        } else {
            next();
        }
    });
    schema.pre("insertMany", async function (next, docs) {
        var doc = this;
        const ObsPromise = (doc) => {
            return new Promise((resolve, reject) => {
                getNextSeqObservable(doc.db, doc.collection.name)
                    .retryWhen((err) => {
                        return err;
                    })
                    .subscribe((seq) => {
                        resolve(seq);
                    });
            })
        }
        if (doc.db) {
            docs = await Promise.all(docs.map(async (item) => {
                item.createdOn = Date.now();
                if (typeof item[fieldName] === "undefined") {
                    item[fieldName] = await ObsPromise(doc)
                }
                return item;
            }))
            next()
        } else {
            next()
        }
    });
};

var checkUpdate = function (schema, options) {
    schema.post("findOneAndUpdate", function (doc, next) {
        if (!doc) {
            return next({ code: 400, error: "record not found" })
        }
        return next()
    });
};

var getField = function (options) {
    if (options && options.field) return options.field;
    else return "_id";
};

var getNextSeqObservable = function (db, name) {
    return rx.Observable.create((o) => {
        db.collection("counters").findOneAndUpdate(
            { _id: name },
            { $inc: { seq: 1 } },
            { returnNewDocument: true, returnDocument: "after", upsert: true },
            function (err, ret) {
                if (err) {
                    console.log(err, "--------------------");
                    return o.onError(err);
                } else {

                    o.onNext(ret.value.seq);
                    return o.completed();
                }
            }
        );
    });
};
const defaultStatics = {
    findAll: async function ({ query, sort, limit = 10000000, page = 1, populateOptions, project, flat = false }) {
        const queryResult = this.find(query);
        const countResult = this.find(query);


        if (populateOptions) {
            queryResult.populate(populateOptions);
        }

        if (sort) {
            queryResult.collation({ locale: "en" }).sort(sort);
            countResult.sort(sort);
        }
        if (project) {
            queryResult.projection(project)
        }
        const countDoc = countResult.countDocuments();

        if (limit && page) {
            queryResult.skip((page - 1) * limit).limit(limit)
        }
        const data = queryResult.lean();
        const [dataResult, dataCount] = await Promise.all([data, countDoc]);
        if (flat && typeof flat === "object") {
            for (let [index, item] of dataResult.entries()) {
                for (let keys in flat) {
                    const columns = flat[keys];
                    const value = item[keys] || {};
                    for (let column in columns) {
                        dataResult[index] = {
                            ...dataResult[index],
                            [columns[column]]: value[column]
                        }
                    }
                    delete dataResult[index][keys]
                }
            }
        }
        return {
            data: dataResult
            , paging: {
                totalCount: dataCount,
                totalPages: !limit ? 0 : Math.ceil(dataCount / limit),
                currentPage: page || 1
            }
        }
    },
    getOne: async function ({ query, populateOptions, project, flat = false }) {
        const queryResult = this.findOne(query);

        if (populateOptions) {
            queryResult.populate(populateOptions);
        }
        if (project) {
            queryResult.projection(project)
        }
        const data = queryResult.lean();
        let dataResult = await data;
        if (flat && typeof flat === "object" && dataResult) {
            for (let keys in flat) {
                const columns = flat[keys];
                const value = dataResult[keys] || {};
                for (let column in columns) {
                    dataResult = {
                        ...dataResult,
                        [columns[column]]: value[column]
                    }
                }
                delete dataResult[keys]
            }
        }
        return {
            data: dataResult
        }
    },
    sqlQuery: async function () {
        //TODO: to be completed
        const model = this;
        let selectOptions = '';
        let query
        async function select({ columns: [] }) {
            selectOptions = columns.join(", ");
            return this;
        }
        async function where({ where: { } }) {
            query = this.find(where);
            selectOptions = columns.join(", ");
            return this;
        }

        return { select }
    },
    isExist: async function (props) {
        return await this.countDocuments(props);
    }
}


export default mg;