import axios from "axios";

const mimeTypes = {
    json: 'application/json',
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    xml: 'text/xml',
    html: 'text/html'
};
const types = {
  EXCEL: 'excel',
  CSV: 'csv',
  JSON: 'json',
  TXT: 'txt',
  PDF: 'pdf'
};

const OPERATOR = "operator";

const ensureArray = function (data) {
    if (!Array.isArray(data)) {
        return [data];
    }
    return data;
}



const acceptableMimeTypes = Object.entries(mimeTypes).map(([, value]) => value);

const responseTransformer = async function (req, res, next) {
    res.transform = async function (data, { responseType, fileName, code } = {}) {
        // if (!fileName) {
        //     fileName = `${req.path.substr(1).replace(/[^A-Za-z0-9-_]/g, '-')}-${dateFormat(new Date(), "isoDateTime").replace(/:/g, '')}`;
        // }
        if (data !== undefined && data !== null && typeof data === 'object') {
            if (!responseType) {
                responseType = req.accepts(acceptableMimeTypes) || 'application/json';
            }
        }
        if (responseType.indexOf('/') === -1) {
            responseType = mimeTypes[responseType];
        }

        let columns = {};
        switch (responseType) {
            case mimeTypes.csv:
                // data = ensureArray(data);
                // if (data.length > 0) {
                //     const csv = new ObjectsToCsv(data);
                //     res.set('Content-Type', responseType);
                //     return res.send(await csv.toString())
                // }
                break;
            case mimeTypes.json:
                res.set('Content-Type', 'application/json');
                return res.status(code).json(data);
            case mimeTypes.xlsx:
                columns = data.columns || {};
                data = data.data || data;
                data = ensureArray(data);
                if (data.length > 0) {
                    res.set('Content-Type', responseType);
                    res.set('Content-Disposition', `inline; filename="${fileName}.xlsx"`);
                    //  return await toExcel({ title: "Main", columns, rows: data, stream: res });
                }
                break;
            case mimeTypes.txt:
                break;
            case mimeTypes.xml:
                // res.set('Content-Type', 'text/xml');
                // return res.send(js2xmlparser.parse("root", data));
                break;
            case mimeTypes.html:
                // data = ensureArray(data);
                // if (data.length > 0) {
                //   //  return res.send(toHtmlTable(data));
                // }
                return data
                break;
            default:
                return res.send(data);
        }
        return res.send('No data');
    }
    next();
};
["=", ">=", "<=", "<", ">", ":", "~"]
const getOperator = (text) => {
    if (/\w(>=)\w/.test(text)) {
        return ">="
    } else if (/\w(<=)\w/.test(text)) {
        return "<="
    } else if (/\w(<)\w/.test(text)) {
        return "<"
    } else if (/\w(>)\w/.test(text)) {
        return ">"
    } else if (/\w(is)\w/.test(text)) {
        return "is"
    } else {
        return "="
    }
}
//^\d{ 2, 4 } [-|\/]\d{2,4}[-|\/]\d{2,4}$
const getValueType = (text) => {
    if (/^(true|false)$/.test(text)) {
        return text === 'true'
    } else if (/^[0-9][\.\d]*(,\d+)?$/.test(text)) {
        return Number(text);
    } else if (/\w,/.test(text)) {
        return text.split(",")
    } else if (/^(\w\?)+\.(\w)$/.test(text)) {
        return text.split(",")
    } else if (/^\d{2,4}[-|\/]\d{2,4}[-|\/]\d{2,4}$/.test(text)) {
        return new Date(text);
    }
    else {
        return text
    }
}
const buildMongoQuery = function (payload = {}) {
    let { filter, page, project, limit, sort = 'createdOn:-1', noSpinner, ...rest } = payload;
    let queryJson = {};
    let filterOptions = [];
    for (let key in rest) {
        queryJson[key] = {
            operator: "=", value: rest[key]
        }
    }
    let operatorValue = "$and";
    let queryOptions = [];
    if (payload.filter) {
        //case q is passed
        const query = JSON.parse(payload.filter);
        if (query.q) queryOptions = query?.q.split("&")
        delete payload.filter;
        delete queryJson.filter;
    }
    for (let items of queryOptions) {
        const operator = getOperator(items)
        let [field, value] = items.split(operator);
        if (!value) continue;
        if (field === "page") {
            page = value
            continue;
        }
        if (field === "limit") {
            limit = value;
            continue;
        }

        queryJson[field] = {
            operator, value
        }
    }
    if (queryJson[OPERATOR]) {
        const value = queryJson[OPERATOR].value.toUpperCase();
        if (value === "AND") {
            operatorValue = "$and";
        } else if (value === "OR") {
            operatorValue = "$or";
        }
        delete queryJson[OPERATOR];
    }
    for (let key in queryJson) {
        let { operator = "=", value } = queryJson[key];
        value = getValueType(value);
        let tempValue = {};
        if (operator === "=") {
            tempValue = {
                ...tempValue,
                ...getEqualQuery(key, value)
            }
        } else if (/>|</.test(operator)) {
            if (value instanceof Date || typeof value === "number") {
                tempValue[key] = {
                    [numericOps[operator]]: value
                }
            }
        }
        filterOptions.push(tempValue)
    }
    if (sort) {
        const [field, sortOpt] = sort?.split(":")
        sort = { [field]: sortOpt }
    }
    const filterOpts = filterOptions.length ? { [operatorValue]: filterOptions } : {};
    return { filter: filterOpts, sort, page, limit, project };
}

const numericOps = {
    "<=": "$lte",
    ">=": "$gte",
    ">": "$gt",
    "<": "$lt"
}
const getRegex = (value) => {
    let [_, firstPart, word, lastPart] = /(~)?([\w\s]+)(~|\$)?/i.exec(value);
    word = word.trim();
    let regex = '';
    if (firstPart && lastPart === "$") {
        regex = `^${word}$`
    } else if (firstPart && !lastPart) {
        regex = `^${word}`
    } else {
        regex = word;
    }
    return new RegExp(regex, "i")
}
const v = /^\w+\??[\w\.?]+\^[\w\s]+(~|\$|\:)?$/
const getEqualQuery = (key, value) => {
    let tempValue = {};
    if (Array.isArray(value)) {
        tempValue[key] = {
            $in: value
        }
    } else if (value instanceof Date) {
        let otherDate = new Date(value);
        otherDate.setDate(value.getDate() + 1)
        tempValue[key] = {
            $gte: value,
            $lt: otherDate
        }
    } else if (typeof value === "string" && v.test(value)) {
        const [columns, values] = value.split("^");
        tempValue["$or"] = [];
        const tValue = getValueType(values)
        columns.split("?").forEach((col) => {
            if (!col) return;
            tempValue["$or"].push({
                ...getEqualQuery(col, tValue)
            })
        })
    } else if (typeof value === "string" && value.includes(":")) {
        let [firstValue, secondValue] = value.split(":");
        firstValue = getValueType(firstValue)
        secondValue = getValueType(secondValue)
        if (firstValue && secondValue) {
            tempValue[key] = {
                $gte: firstValue,
                $lte: secondValue
            }
        }
    }
    else if (typeof value === "string" && value.includes("~")) {
        tempValue[key] = getRegex(value)
    }
    else {
        tempValue[key] = value
    }

    return tempValue
}
const buildQuery = function (payload) {
    return buildMongoQuery(payload)
}

const wrapper = function (callback, buildFilter = true) {
    return async function (req, res, next) {
        try {
            const { responseType, ...rest } = { ...req.query, ...req.params };
            if (buildFilter) {
                req.filter = buildQuery(req.query)
            }
            const result = await callback(req, next);

            if (result.callNext) {
                req[result.key || "data"] = result?.result;
                return next()
            }
            result.data.success = !(result.code > 299)
            return res.transform(result.data, { responseType, fileName: result.fileName, code: result.code || 200 });
        } catch (err) {
            next(err);
        }
    };
};

const makeRequest = async function ({ url, method, body, query, headers }) {
    try {
        const result = await axios({
            url,
            method,
            data: body,
            params: query,
            headers
        })
        return {
            success: true,
            code: result.status,
            data: result.data
        }
    } catch (err) {
        console.log(err.message)
        return {
            success: false,
            error: err?.response.data,
            code: err.response.status
        }
    }

}
const request = {
    post: async ({ url, body, headers }) => {
        return await makeRequest({ url, body, headers, method: "POST" })
    },
    get: async ({ url, query, headers }) => {
        return await makeRequest({ url, query, headers, method: "GET" })
    },
    put: async ({ url, body, headers }) => {
        return await makeRequest({ url, body, headers, method: "PUT" })
    },
    patch: async ({ url, body, headers }) => {
        return await makeRequest({ url, body, headers, method: "PATCH" })
    }
}

const aggregatePaging = (limit, page) => {
    return [
        {
            $facet:
            {
                paging: [
                    {
                        $count: "totalCount",
                    },
                    {
                        $addFields: {
                            totalPages: {
                                $ceil: {
                                    $divide: ["$totalCount", limit],
                                },
                            },
                            currentPage: page,
                        },
                    },
                ],
                data: [
                    {
                        $skip: (page - 1) * limit,
                    },
                    {
                        $limit: limit,
                    },
                ],
            },
        },
        {
            $addFields:
            {
                paging: {
                    $cond: [
                        {
                            $eq: [
                                {
                                    $size: "$paging",
                                },
                                0,
                            ],
                        },
                        {
                            totalCount: 0,
                            currentPage: 1,
                            totalPages: 0,
                        },
                        "$paging",
                    ],
                },
            },
        },
        {
            $unwind:
            {
                path: "$paging",
            },
        },
    ]
}

const FILE_TYPES = {
    CLOUDINARY: "cloudinary",
    AZURE: 'azure'
}

export default {
    responseTransformer,
    wrapper,
    request,
    aggregatePaging,
    FILE_TYPES,
    types
}