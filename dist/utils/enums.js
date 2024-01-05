"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.types = exports.mimeTypes = exports.middlewareVariables = exports.FILE_TYPES = void 0;
const types = {
  EXCEL: 'excel',
  CSV: 'csv',
  JSON: 'json',
  TXT: 'txt',
  PDF: 'pdf'
};
exports.types = types;
const mimeTypes = {
  json: 'application/json',
  pdf: 'application/pdf',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  xml: 'text/xml',
  html: 'text/html'
};
exports.mimeTypes = mimeTypes;
const FILE_TYPES = {
  CLOUDINARY: "cloudinary",
  AZURE: 'azure'
};
exports.FILE_TYPES = FILE_TYPES;
const middlewareVariables = {
  where: "user",
  create: {
    "companyID": "companyID",
    "createdBy": "userId"
  },
  update: {
    "lastUpdatedBy": "userId"
  },
  query: {
    "companyID": "companyID"
  }
};
exports.middlewareVariables = middlewareVariables;