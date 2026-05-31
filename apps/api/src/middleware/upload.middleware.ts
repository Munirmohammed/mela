import multer from 'multer'

/** In-memory single-image upload (5MB cap), field name "file". */
export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true)
    else cb(new Error('Only image uploads are allowed'))
  },
}).single('file')
