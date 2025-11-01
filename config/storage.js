

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'eolve', 
    allowed_formats: ['jpeg', 'jpg', 'png'], 
  },
});

const uploadMiddleware = multer({ storage: storage });

const deleteFile = async (publicId) => {
  try {
    if (!publicId) {
        console.warn('No publicId provided for deletion.');
        return;
    }

    await cloudinary.uploader.destroy(publicId);
    console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }
};

module.exports = {
  uploadMiddleware,
  deleteFile,
};