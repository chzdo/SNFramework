import CRUD from "./controllers/index.mjs";
import mg from "./controllers/mg.mjs"
import utils from "./utils/index.mjs";
import Mailer from "./controllers/mailers.mjs";
import UploadFile from "./controllers/files.mjs";
import MessageQueue from "./controllers/message-queue.mjs";
import getFile from "./controllers/export.mjs";
class framework {
    utils = utils
    static utils = utils
    modelInstance
    MessageQueue = MessageQueue
    constructor() { }

    async setMG({ url, models = [], sshCredentials = null }) {
        if (!url) {
            throw new Error(`mongo db url not defined`)
        }
        if (!models) {
            throw new Error(`models not defined`)
        }
        this.mg = new mg({ url, sshCredentials, models })
        await this.mg.setupModels()
        this.modelInstance = this.mg;
        return this;

    }

    createController({
        name,
        model,
        validations = {},
        callback = {},
        populateOptions = [],
        flat = false,
        defaultSort = {},
        middlewareVariables = {
            where: "",
            create: {},
            query: {},
        },
    }) {
        if (!(name && model && validations)) {
            throw new Error(`incomplete parameters`)
        }
        return new CRUD({ model, controller: name, validations, callback, populateOptions, flat, defaultSort, middlewareVariables, modelInstance: this.modelInstance });
        // return this]];
    }

    static setMailer({ KEY, DOMAIN, FROM, HOST, PORT, AUTH, useHandleBars }) {
        if (!((KEY && DOMAIN) || (HOST && PORT && AUTH))) {
            throw Error(`mail credentials not set`)
        }
        return new Mailer({ KEY, DOMAIN, FROM, HOST, PORT, AUTH, useHandleBars })
    }

    fileUploader() {
        return UploadFile
    }

    export({ config, reportType = defaultFileType,  title, stream, sheets, settings}) {     
      return getFile({ config, reportType ,  title, stream, sheets, settings})
    }
}

export default framework