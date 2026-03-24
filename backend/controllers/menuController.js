const MenuItem = require('../models/MenuItem');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_URL) {
    console.log('[Cloudinary] Configured automatically via ENV');
}

exports.createMenuItem = async (req, res) => {
    try {
        const { categoryId, name, description, price, imageUrl } = req.body;
        const vendorId = req.vendorId;

        const item = new MenuItem({
            vendorId,
            categoryId,
            name,
            description: description || undefined,
            price,
            imageUrl
        });

        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: 'Server error creating menu item' });
    }
};

exports.getMenuItems = async (req, res) => {
    try {
        const targetVendorId = req.vendorId || req.params.vendorId;

        if (!targetVendorId) {
            return res.status(400).json({ error: 'Vendor ID required' });
        }

        const items = await MenuItem.find({ vendorId: targetVendorId, isAvailable: true });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching menu items' });
    }
};

exports.updateMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, imageUrl, isAvailable, categoryId } = req.body;
        const vendorId = req.vendorId;

        const item = await MenuItem.findOneAndUpdate(
            { _id: id, vendorId }, // Multi-tenant scoping
            {
                name,
                description: description || undefined,
                price,
                imageUrl,
                isAvailable,
                categoryId
            },
            { new: true }
        );

        if (!item) return res.status(404).json({ error: 'Item not found or unauthorized' });

        res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Server error updating menu item' });
    }
};

exports.uploadItemImage = async (req, res) => {
    try {
        const { itemId } = req.params;
        const vendorId = req.vendorId;

        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const menuItem = await MenuItem.findOne({ _id: itemId, vendorId });
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }

        let imageUrl = '';

        // Process with sharp (resize to max 800x800, convert to WebP)
        const webpBuffer = await sharp(req.file.buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();

        if (process.env.CLOUDINARY_URL) {
            // Upload to Cloudinary via stream
            imageUrl = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: `kartly/${vendorId}`, format: 'webp' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result.secure_url);
                    }
                );
                stream.end(webpBuffer);
            });
        } else {
            // Fallback: Local /uploads
            const uploadDir = path.join(__dirname, '..', 'uploads', vendorId.toString());
            await fs.mkdir(uploadDir, { recursive: true });
            
            const filename = `${itemId}-${Date.now()}.webp`;
            const filePath = path.join(uploadDir, filename);
            await fs.writeFile(filePath, webpBuffer);
            
            // Generate public URL
            const host = process.env.VITE_API_URL ? process.env.VITE_API_URL.replace('/api', '') : `${req.protocol}://${req.get('host')}`;
            imageUrl = `${host}/uploads/${vendorId.toString()}/${filename}`;
        }

        // Delete old local file if replacing (skip for Cloudinary MVP)
        if (menuItem.imageUrl && menuItem.imageUrl.includes('/uploads/')) {
            try {
                const oldFilename = menuItem.imageUrl.split('/').pop();
                const oldPath = path.join(__dirname, '..', 'uploads', vendorId.toString(), oldFilename);
                await fs.unlink(oldPath);
            } catch (e) { console.log('Old image cleanup failed (safe to ignore)'); }
        }

        menuItem.imageUrl = imageUrl;
        await menuItem.save();

        res.json({ success: true, imageUrl, message: 'Image uploaded successfully' });

    } catch (error) {
        console.error('Image Upload Error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
};

exports.deleteMenuItem = async (req, res) => {
    try {
        const { id } = req.params;
        const vendorId = req.vendorId;

        const item = await MenuItem.findOneAndDelete({ _id: id, vendorId });
        
        if (!item) return res.status(404).json({ error: 'Item not found' });

        // Clean up image if local
        if (item.imageUrl && item.imageUrl.includes('/uploads/')) {
            try {
                const filename = item.imageUrl.split('/').pop();
                const filePath = path.join(__dirname, '..', 'uploads', vendorId.toString(), filename);
                await fs.unlink(filePath);
            } catch (e) {}
        }

        res.json({ success: true, message: 'Item deleted safely' });
    } catch (error) {
        res.status(500).json({ error: 'Server error deleting menu item' });
    }
};
