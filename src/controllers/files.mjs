import express from "express";
import fileUpload from "express-fileupload"
import cloudinary from "cloudinary"
import streamifier from "streamifier"
import AzureStorageBlob from "@azure/storage-blob"
import utils from "../utils/index.mjs";

const Router = express.Router();

let azure;


const cloudUpload = function (file) {
    let resource_type = 'raw'
    if (file.mimetype.includes("image") || file.mimetype.includes("video")) {
        resource_type = 'auto';
    }
    return new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream({ folder: UploadFile.folder, resource_type },
            function (error, result) {
                if (error) {
                    reject(error);
                    return;
                }
                resolve({ ...result })
            })
        streamifier.createReadStream(file.data).pipe(stream);
    })
}

const azureUpload = async function (file) {
    const regex = /(.([a-z]+))$/gmi.exec(file.name)
    const uploadPath = `${UploadFile.folder}/${file.name}`;
    // create blobClient for container
    const blobClient = azure.getBlockBlobClient(uploadPath);

    // set mimetype as determined from browser with file upload control
    const options = { blobHTTPHeaders: { blobContentType: file.mimetype } };
    // upload file
    await blobClient.uploadData(file.data, options);
    return {
        url: blobClient.url,
        type: file.mimetype,
        name: file.name,
        format: regex[2],
        secure_url: blobClient.url,
        filePath: uploadPath
    }

}

const uploadFile = utils.wrapper(async (req, res) => {
    try {
        const files = req.files;
        if (!files) {
            return {
                code: 400,
                data: {
                    error: `Please attach a file`
                }
            }
        }
        let uploaded = {};
        for (let file in files) {
            let fileObj = files[file];
            if (Array.isArray(fileObj)) {
                fileObj = fileObj.map(async (file) => {
                    return await UploadFile.selectedService(file)
                })
            } else {
                fileObj = UploadFile.selectedService(fileObj);
            }
            uploaded[file] = await (Array.isArray(fileObj) ? Promise.all(fileObj) : fileObj)
        }
        return {
            code: 201,
            data: {
                data: uploaded
            }
        }
    } catch (error) {
        console.log(error);
        return {
            code: 500,
            data: {
                error: "server error"
            }
        }
    }
})
const UploadFile = {
    selectedService: null,
    azureUpload,
    cloudUpload,
    folder: null,
    setup: function ({ type = utils.FILE_TYPES.AZURE, options, folder = 'my_folder' }) {
        this.folder = folder
        if (type === utils.FILE_TYPES.CLOUDINARY) {
            cloudinary.config(options);
            this.selectedService = cloudUpload
        } else {
            azure = new AzureStorageBlob.BlobServiceClient(options.url).getContainerClient(options.container);
            this.selectedService = azureUpload
        }

        return this;
    },
    addUploadFileRoute() {
        Router.post("/files", [fileUpload({
        })], uploadFile)
        return Router;
    }
}


export default UploadFile