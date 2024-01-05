
const types = {
    EXCEL: 'excel',
    CSV: 'csv',
    JSON: 'json',
    TXT: 'txt',
    PDF: 'pdf'
};

const mimeTypes = {
    json: 'application/json',
    pdf: 'application/pdf',
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    xml: 'text/xml',
    html: 'text/html'
};

const FILE_TYPES = {
    CLOUDINARY: "cloudinary",
    AZURE: 'azure'
}
const middlewareVariables = {
    where: "user",
    create: { "companyID": "companyID", "createdBy": "userId" },
    update: { "lastUpdatedBy": "userId" },
    query: { "companyID": "companyID" },
};
export {
    types,
    mimeTypes,
    FILE_TYPES,
    middlewareVariables
}