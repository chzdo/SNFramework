"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _axios = _interopRequireDefault(require("axios"));
var _httpErrors = require("./http-errors.js");
var _enums = require("./enums.js");
var _export = _interopRequireDefault(require("../controllers/export.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const OPERATOR = "operator";
const ensureArray = function (rows, cols) {
  let tempRows = [];
  const headers = Object.keys(cols).map(col => ({
    label: col,
    index: cols[col].index || 0
  })).sort((a, b) => {
    if (a.index > b.index) return 1;
    return -1;
  }).map(val => val.label);
  for (let row of rows) {
    let tempRow = {};
    for (let key of headers) {
      const config = cols[key];
      tempRow[key] = row[key];
      if (typeof config.getValue === 'function') {
        tempRow[key] = config.getValue(row);
      }
    }
    tempRows.push(tempRow);
  }
  return tempRows;
};
const acceptableMimeTypes = Object.entries(_enums.mimeTypes).map(([, value]) => value);
const responseTransformer = async function (req, res, next) {
  res.transform = async function (data, {
    responseType,
    fileName,
    code
  } = {}) {
    // if (!fileName) {
    //     fileName = `${req.path.substr(1).replace(/[^A-Za-z0-9-_]/g, '-')}-${dateFormat(new Date(), "isoDateTime").replace(/:/g, '')}`;
    // }
    if (data !== undefined && data !== null && typeof data === 'object') {
      if (!responseType) {
        responseType = req.accepts(acceptableMimeTypes) || 'application/json';
      }
    }
    if (responseType.indexOf('/') === -1) {
      responseType = _enums.mimeTypes[responseType];
    }
    let columns = data.columns || {};
    ;
    let rows = data.data?.data || data;
    switch (responseType) {
      case _enums.mimeTypes.txt:
      case _enums.mimeTypes.csv:
        // data = ensureArray(data);
        // if (data.length > 0) {
        //     const csv = new ObjectsToCsv(data);
        //     res.set('Content-Type', responseType);
        //     return res.send(await csv.toString())
        // }
        break;
      case _enums.mimeTypes.pdf:
        rows = data.data?.data || data;
        rows = ensureArray(rows, columns);
        res.set('Content-Type', responseType);
        res.set('Content-Disposition', `inline; filename="${fileName}.pdf"`);
        res.set("access-control-expose-headers", "Content-Disposition");
        return (0, _export.default)({
          settings: {
            data: rows,
            columns
          },
          fileName,
          stream: res,
          reportType: _enums.types.PDF
        });
      case _enums.mimeTypes.json:
        res.set('Content-Type', 'application/json');
        return res.status(code).json(data);
      case _enums.mimeTypes.xlsx:
        rows = ensureArray(rows, columns);
        if (rows.length > 0) {
          res.set('Content-Type', responseType);
          res.set('Content-Disposition', `inline; filename="${fileName}.xlsx"`);
          res.set("access-control-expose-headers", "Content-Disposition");
          return (0, _export.default)({
            sheets: [{
              title: data.title,
              columns,
              rows
            }],
            fileName,
            stream: res,
            reportType: _enums.types.EXCEL
          });
        }
        break;
      case _enums.mimeTypes.xml:
        // res.set('Content-Type', 'text/xml');
        // return res.send(js2xmlparser.parse("root", data));
        break;
      case _enums.mimeTypes.html:
        // data = ensureArray(data);
        // if (data.length > 0) {
        //   //  return res.send(toHtmlTable(data));
        // }
        return data;
        break;
      default:
        return res.send(data);
    }
    return res.send('No data');
  };
  next();
};
["=", ">=", "<=", "<", ">", ":", "~"];
const getOperator = text => {
  if (/\w(>=)\w/.test(text)) {
    return ">=";
  } else if (/\w(<=)\w/.test(text)) {
    return "<=";
  } else if (/\w(<)\w/.test(text)) {
    return "<";
  } else if (/\w(>)\w/.test(text)) {
    return ">";
  } else {
    return "=";
  }
};
//^\d{ 2, 4 } [-|\/]\d{2,4}[-|\/]\d{2,4}$
const getValueType = text => {
  if (/^(true|false)$/.test(text)) {
    return text === 'true';
  } else if (/^[0-9][\.\d]*(,\d+)?$/.test(text)) {
    return Number(text);
  } else if (/\w,/.test(text)) {
    return text.split(",");
  } else if (/^(\w\?)+\.(\w)$/.test(text)) {
    return text.split(",");
  } else if (/^\d{2,4}[-|\/]\d{2,4}[-|\/]\d{2,4}$/.test(text)) {
    return new Date(text);
  } else {
    return text;
  }
};
const buildMongoQuery = function (payload = {}) {
  let {
    filter,
    page,
    project,
    limit,
    sort = 'createdOn:-1',
    noSpinner,
    ...rest
  } = payload;
  let queryJson = {};
  let filterOptions = [];
  for (let key in rest) {
    queryJson[key] = {
      operator: "=",
      value: rest[key]
    };
  }
  let operatorValue = "$and";
  let queryOptions = [];
  if (payload.filter) {
    //case q is passed
    const query = JSON.parse(payload.filter);
    if (query.q) queryOptions = query?.q.split("&");
    delete payload.filter;
    delete queryJson.filter;
  }
  for (let items of queryOptions) {
    const operator = getOperator(items);
    let [field, value] = items.split(operator);
    if (!value) continue;
    if (field === "page") {
      page = value;
      continue;
    }
    if (field === "limit") {
      limit = value;
      continue;
    }
    queryJson[field] = {
      operator,
      value
    };
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
    let {
      operator = "=",
      value
    } = queryJson[key];
    value = getValueType(value);
    let tempValue = {};
    if (operator === "=") {
      tempValue = {
        ...tempValue,
        ...getEqualQuery(key, value)
      };
    } else if (/[><]/.test(operator)) {
      if (value instanceof Date || typeof value === "number") {
        tempValue[key] = {
          [numericOps[operator]]: value
        };
      }
    }
    filterOptions.push(tempValue);
  }
  if (sort) {
    const [field, sortOpt] = sort?.split(":");
    sort = {
      [field]: sortOpt
    };
  }
  const filterOpts = filterOptions.length ? {
    [operatorValue]: filterOptions
  } : {};
  return {
    filter: filterOpts,
    sort,
    page,
    limit,
    project
  };
};
const numericOps = {
  "<=": "$lte",
  ">=": "$gte",
  ">": "$gt",
  "<": "$lt"
};
const getRegex = value => {
  let [_, firstPart, word, lastPart] = /(~)?([\w\s]+)(~|\$)?/i.exec(value);
  word = word.trim();
  let regex = '';
  if (firstPart && lastPart === "$") {
    regex = `^${word}$`;
  } else if (firstPart && !lastPart) {
    regex = `^${word}`;
  } else {
    regex = word;
  }
  return new RegExp(regex, "i");
};
const v = /^\w+\??[\w\.?]+\^[\w\s]+(~|\$|\:)?$/;
const getEqualQuery = (key, value) => {
  let tempValue = {};
  if (Array.isArray(value)) {
    tempValue[key] = {
      $in: value
    };
  } else if (value instanceof Date) {
    let otherDate = new Date(value);
    otherDate.setDate(value.getDate() + 1);
    tempValue[key] = {
      $gte: value,
      $lt: otherDate
    };
  } else if (typeof value === "string" && v.test(value)) {
    const [columns, values] = value.split("^");
    tempValue["$or"] = [];
    const tValue = getValueType(values);
    columns.split("?").forEach(col => {
      if (!col) return;
      tempValue["$or"].push({
        ...getEqualQuery(col, tValue)
      });
    });
  } else if (typeof value === "string" && value.includes(":")) {
    let [firstValue, secondValue] = value.split(":");
    firstValue = getValueType(firstValue);
    secondValue = getValueType(secondValue);
    if (firstValue && secondValue) {
      tempValue[key] = {
        $gte: firstValue,
        $lte: secondValue
      };
    }
  } else if (typeof value === "string" && value.includes("|")) {
    let [operator, numb] = value.split("|");
    numb = getValueType(numb);
    if (operator && numb) {
      tempValue[key] = {
        [`$${operator}`]: numb
      };
    }
  } else if (typeof value === "string" && value.includes("~")) {
    tempValue[key] = getRegex(value);
  } else {
    tempValue[key] = value;
  }
  return tempValue;
};
const buildQuery = function (payload) {
  return buildMongoQuery(payload);
};
const wrapper = function (callback, buildFilter = true) {
  return async function (req, res, next) {
    try {
      const {
        responseType,
        ...rest
      } = {
        ...req.query,
        ...req.params
      };
      if (buildFilter) {
        req.filter = buildQuery(req.query);
        req.isFile = isFileRequest(req);
        req.filter.limit = req.isFile ? Number.MAX_SAFE_INTEGER : req.filter.limit;
      }
      const result = await callback(req, next);
      if (result.callNext) {
        req[result.key || "data"] = result?.result;
        return next();
      }
      result.data.success = !(result.code > 299);
      return res.transform(result.data, {
        responseType: req.accepts()[0],
        config: result.config,
        fileName: result.data.fileName,
        code: result.code || 200
      });
    } catch (err) {
      next(err);
    }
  };
};
const makeRequest = async function ({
  url,
  method,
  body,
  query,
  headers
}) {
  try {
    const result = await (0, _axios.default)({
      url,
      method,
      data: body,
      params: query,
      headers
    });
    return {
      success: true,
      code: result.status,
      data: result.data
    };
  } catch (err) {
    console.log(err.message);
    return {
      success: false,
      error: err?.response?.data,
      code: err.response?.status
    };
  }
};
const request = {
  post: async ({
    url,
    body,
    headers
  }) => {
    return await makeRequest({
      url,
      body,
      headers,
      method: "POST"
    });
  },
  get: async ({
    url,
    query,
    headers
  }) => {
    return await makeRequest({
      url,
      query,
      headers,
      method: "GET"
    });
  },
  put: async ({
    url,
    body,
    headers
  }) => {
    return await makeRequest({
      url,
      body,
      headers,
      method: "PUT"
    });
  },
  patch: async ({
    url,
    body,
    headers
  }) => {
    return await makeRequest({
      url,
      body,
      headers,
      method: "PATCH"
    });
  }
};
const aggregatePaging = (limit, page) => {
  return [{
    $facet: {
      paging: [{
        $count: "totalCount"
      }, {
        $addFields: {
          totalPages: {
            $ceil: {
              $divide: ["$totalCount", limit]
            }
          },
          currentPage: page
        }
      }],
      data: [{
        $skip: (page - 1) * limit
      }, {
        $limit: limit
      }]
    }
  }, {
    $addFields: {
      paging: {
        $cond: [{
          $eq: [{
            $size: "$paging"
          }, 0]
        }, {
          totalCount: 0,
          currentPage: 1,
          totalPages: 0
        }, "$paging"]
      }
    }
  }, {
    $unwind: {
      path: "$paging"
    }
  }];
};
function joiFormat(message) {
  const regex = /["]+/g;
  return message.replace(regex, '');
}
const getPayloadFromRoute = ({
  query,
  values,
  where
}) => {
  let body = {};
  Object.keys(query).forEach(value => body[value] = values[query[value]]);
  return body;
};
const getCreatePayloadFromRoute = ({
  query,
  values
}) => {
  let body = {};
  Object.keys(query).forEach(value => {
    if (value.includes(".")) {
      const [mainKey, subKey] = value.split(".");
      if (!body[mainKey]) {
        body[mainKey] = {};
      }
      body[mainKey][subKey] = values[query[value]];
    } else {
      body[value] = values[query[value]];
    }
  });
  return body;
};
const isFileRequest = req => {
  const accept = req.accepts()[0];
  return accept !== _enums.mimeTypes.json;
};
var _default = {
  responseTransformer,
  wrapper,
  request,
  aggregatePaging,
  FILE_TYPES: _enums.FILE_TYPES,
  types: _enums.types,
  routeVariables: _enums.middlewareVariables,
  joiFormat,
  codes: _httpErrors.codes,
  getPayloadFromRoute,
  getCreatePayloadFromRoute,
  buildQuery,
  isFileRequest
};
exports.default = _default;