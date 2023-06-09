import Joi from "joi";
import utils from "../utils/index.mjs";
import express from "express";
const Router = express.Router();
const wrapper = utils.wrapper;

class CRUD {
    validations = {}
    controller;
    model;
    callback = {};
    populateOptions = [];
    flat = false;
    defaultSort = {}
    useNumericId = false;
    #id
    middlewareVariables;
    modelInstance


    /**
     * 
     * @param {controller} param0 
     */

    constructor(props) {
        Object.assign(this, props);
        this.#id = this.useNumericId ? "id" : "_id";

    }

    joiFormat(message) {
        const regex = /["]+/g;
        return message.replace(regex, '');
    }
    create = wrapper(async (req) => {
        try {

            const body = req.body;
            const { unique, create } = this.validations;
            const { insert: callback } = this.callback;
            let query = {};
            const { where, create: createVariables = {}, query: opts = {} } = this.middlewareVariables;
            if (create) {
                const { error } = create.validate(body);
                if (error) {
                    return { code: 412, data: { error: this.joiFormat(error.details[0]?.message) } }
                }
            }
            if (where) {
                Object.keys(opts).forEach(value => query[value] = req[where][opts[value]])
                Object.keys(createVariables).forEach(value => {
                    if (value.includes(".")) {
                        const [mainKey, subKey] = value.split(".")
                        if (!body[mainKey]) {
                            body[mainKey] = {}
                        }
                        body[mainKey][subKey] = req[where][createVariables[value]]
                    } else {
                        body[value] = req[where][createVariables[value]]
                    }
                })
            }
            if (unique) {
                const value = body[unique];
                const recordCount = await this.model.isExist({ [unique]: value, ...query })
                if (recordCount > 0) {
                    return {
                        code: 412, data: { error: `${value} already exist` }
                    }

                }
            }
            const result = await this.model.create(body);
            if (callback) {
                return { callNext: true, result }
            }
            return { code: 201, data: { data: result } }
        } catch (e) {
            console.error(e);
            if (e.code) {
                return { code: 400, data: { error: e.error } }
            }
            return { code: 500, data: { error: "server error" } }
        }
    })

    update = wrapper(async (req) => {
        try {
            const { id } = req.params;
            let query = {};
            const { where, query: opts = {}, update: updateOpts = {} } = this.middlewareVariables;

            if (!id) {
                return { code: 400, data: { error: "id not set" } }
            }

            const data = req.body;
            const { unique, update } = this.validations;
            const { update: callback } = this.callback;
            if (update) {
                const { error } = update.validate(data);
                if (error) {
                    return { code: 412, data: { error: this.joiFormat(error.details[0]?.message) } }
                }
            }
            if (where) {
                Object.keys(opts).forEach(value => query[value] = req[where][opts[value]])
                Object.keys(updateOpts).forEach(value => data[value] = req[where][updateOpts[value]])
            }
            data.modifiedOn = new Date();
            if (unique) {
                const value = data[unique];
                const recordCount = await this.model.isExist({ [unique]: value, [this.#id]: { $ne: id }, ...query })
                if (recordCount > 0) {
                    return {
                        code: 412, data: { error: `${value} already exist` }
                    }

                }
            }
            const result = await this.model.findOneAndUpdate({ [this.#id]: id, isDeleted: false, ...query }, data, { new: true });
            if (callback) {
                return { callNext: true, result }
            }
            return { code: 200, data: { data: result, message: "update successful" } }
        } catch (e) {
            console.error(e);
            if (e.code) {
                return { code: 400, data: { error: e.error } }
            }
            return { code: 500, data: { error: "server error" } }
        }

    })

    fetch = wrapper(async (req) => {
        try {
            const { filter, sort = 'createdOn:-1', page, limit } = req.filter;
            let queryOpts = {};
            const { where, query: opts = {} } = this.middlewareVariables;
            if (where) {
                Object.keys(opts).forEach(value => queryOpts[value] = req[where][opts[value]])
            }
            const { get: callback } = this.callback;
            const query = await this.model.findAll({ query: { ...filter, isDeleted: false, ...queryOpts }, populateOptions: this.populateOptions, flat: this.flat, page, limit, sort });
            if (callback) {
                return { callNext: true, result: query }
            }
            return {
                code: 200,
                data: {
                    data: query
                }
            }
        } catch (e) {
            console.error(e);
            if (e.code) {
                return { code: 400, data: { error: e.error } }
            }
            return { code: 500, data: { error: "server error" } }
        }

    })

    view = wrapper(async (req) => {
        try {
            const { filter } = req.filter;
            const view = req.params.view;
            if (!view) {
                return {
                    code: 400,
                    data: {
                        error: "view name not sent"
                    }
                }
            }
            let queryOpts = {};
            const { where, query: opts = {} } = this.middlewareVariables;
            if (where) {
                Object.keys(opts).forEach(value => queryOpts[value] = req[where][opts[value]])
            }
            const viewOn = this.modelInstance.getModel(view);
            const { analysis: callback } = this.callback;
            const query = await viewOn.find({ ...queryOpts, ...filter });
            if (callback) {
                return { callNext: true, result: query }
            }
            return {
                code: 200,
                data: {
                    data: query
                }
            }
        } catch (e) {
            console.error(e);
            if (e.code) {
                return { code: 400, data: { error: e.error } }
            }
            return { code: 500, data: { error: "server error" } }
        }

    })

    fetchOne = wrapper(async (req) => {
        try {
            const { id } = req.params;
            const { filter } = req.filter;
            const { getOne: callback } = this.callback;
            let queryOpts = {};
            const { where, query: opts = {} } = this.middlewareVariables;
            if (where) {
                Object.keys(opts).forEach(value => queryOpts[value] = req[where][opts[value]])
            }
            const query = await this.model.getOne({ query: { [this.#id]: id, ...filter, isDeleted: false, ...queryOpts }, populateOptions: this.populateOptions, flat: this.flat });
            if (!query?.data) {
                return {
                    code: 404,
                    data: {
                        error: "record not found"
                    }
                }
            }
            if (callback) {
                return { callNext: true, result: query }
            }
            return {
                code: 200,
                data: query
            }
        } catch (e) {
            console.error(e);
            if (e.code) {
                return { code: 400, data: { error: e.error } }
            }
            return { code: 500, data: { error: "server error" } }
        }
    })
    delete = wrapper(async (req) => {
        try {
            const { filter } = req.filter;
            const { delete: callback } = this.callback;
            let queryOpts = {};
            const { where, query: opts = {} } = this.middlewareVariables;
            if (where) {
                Object.keys(opts).forEach(value => queryOpts[value] = req[where][opts[value]])
            }
            const query = await this.model.updateMany({ ...filter, ...queryOpts }, { isDeleted: true, isActive: false });
            if (callback) {
                return { callNext: true, result: query }
            }
            return {
                code: 200,
                data: {
                    message: "record(s) deleted"
                }
            }
        } catch (e) {
            console.error(e);
            if (e.code) {
                return { code: 400, data: { error: e.error } }
            }
            return { code: 500, data: { error: "server error" } }
        }
    })

    deleteOne = wrapper(async (req) => {
        try {
            const { id } = req.params;
            const { deleteOne: callback } = this.callback;
            let queryOpts = {};
            const { where, query: opts = {} } = this.middlewareVariables;
            if (where) {
                Object.keys(opts).forEach(value => queryOpts[value] = req[where][opts[value]])
            }
            const query = await this.model.updateOne({ [this.#id]: id, ...queryOpts }, { isDeleted: true, isActive: false });
            if (callback) {
                return { callNext: true, result: query }
            }
            return {
                code: 200,
                data: {
                    message: "record(s) deleted"
                }
            }
        } catch (e) {
            console.error(e);
            if (e.code) {
                return { code: 400, data: { error: e.error } }
            }
            return { code: 500, data: { error: "server error" } }
        }
    })

    export = wrapper(function (req, res) {

    })

    registerValidation(props) {
        Object.assign(this.validations, props)
    }

    registerRoutes({ otherRoutes, hide = [], middleware = {} }) {
        !hide.includes("create") && Router.post(`/${this.controller}/create`, middleware?.create || [], this.create, this.callback.insert || []);
        !hide.includes("update") && Router.patch(`/${this.controller}/update/:id`, middleware?.update || [], this.update, this.callback.update || []);
        !hide.includes("get") && Router.get(`/${this.controller}/list`, middleware?.get || [], this.fetch, this.callback.fetch || []);
        !hide.includes("getOne") && Router.get(`/${this.controller}/list/:id`, middleware?.getOne || [], this.fetchOne, this.callback.fetchOne || []);
        !hide.includes("delete") && Router.delete(`/${this.controller}/delete`, middleware?.delete || [], this.delete, this.callback.delete || []);
        !hide.includes("deleteOne") && Router.delete(`/${this.controller}/delete/:id`, middleware?.deleteOne || [], this.deleteOne, this.callback.deleteOne || []);
        !hide.includes("export") && Router.get(`/${this.controller}/export`, middleware?.export || [], this.export, this.callback.export || []);
        !hide.includes("metrics") && Router.get(`/${this.controller}/metrics/:view`, middleware?.metrics || [], this.view, this.callback.analysis || []);

        Router.use(`/${this.controller}`, otherRoutes || [], (req, res, next) => {
            res.status(404).send({
                success: false,
                error: "path not found"
            })
        })


        return Router;
    }
}

export default CRUD;