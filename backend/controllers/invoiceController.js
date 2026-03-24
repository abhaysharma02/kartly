const PDFDocument = require('pdfkit');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');

exports.generateInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId).populate('items.menuItemId');
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const vendor = await Vendor.findById(order.vendorId);
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

        // Initialize PDF Document
        const doc = new PDFDocument({ margin: 50 });

        // Pipe directly to the response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.tokenNumber}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).text(vendor.shopName || vendor.name, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('GSTIN: 27AABCU9603R1ZM (Sample)', { align: 'center' });
        doc.moveDown(2);

        // Order Info
        const orderDate = new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        
        doc.fontSize(10);
        doc.text(`Invoice No: INV-${order.tokenNumber}`);
        doc.text(`Date: ${orderDate}`);
        if (order.tableNumber) doc.text(`Table No: ${order.tableNumber}`);
        doc.text(`Payment Method: ${order.paymentMethod === 'CASH' ? 'Cash' : 'Online / UPI'}`);
        doc.moveDown(1.5);

        // Table Header
        const startY = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Item', 50, startY);
        doc.text('HSN', 250, startY);
        doc.text('Qty', 320, startY);
        doc.text('Rate', 380, startY);
        doc.text('Total', 480, startY);

        doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();
        doc.moveDown(1);

        doc.font('Helvetica');
        let currentY = startY + 25;

        // Items logic
        order.items.forEach(item => {
            doc.text(item.name.substring(0, 30), 50, currentY);
            doc.text('996331', 250, currentY); // Custom generic food service HSN
            doc.text(item.quantity.toString(), 320, currentY);
            doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 380, currentY);
            doc.text(`Rs. ${item.totalPrice.toFixed(2)}`, 480, currentY);
            currentY += 20;
        });

        doc.moveTo(50, currentY + 5).lineTo(550, currentY + 5).stroke();
        currentY += 15;

        // Totals mapping
        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', 380, currentY);
        doc.text(`Rs. ${order.subtotal.toFixed(2)}`, 480, currentY);
        currentY += 20;

        const cgst = order.taxAmount / 2;
        const sgst = order.taxAmount / 2;

        doc.font('Helvetica');
        doc.text('CGST (2.5%):', 380, currentY);
        doc.text(`Rs. ${cgst.toFixed(2)}`, 480, currentY);
        currentY += 15;

        doc.text('SGST (2.5%):', 380, currentY);
        doc.text(`Rs. ${sgst.toFixed(2)}`, 480, currentY);
        currentY += 20;

        doc.moveTo(380, currentY - 5).lineTo(550, currentY - 5).stroke();

        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Grand Total:', 380, currentY);
        doc.text(`Rs. ${order.totalAmount.toFixed(2)}`, 480, currentY);

        doc.moveDown(4);
        doc.fontSize(10).font('Helvetica-Oblique').text('Thank you for dining with us!', { align: 'center', y: doc.y });
        doc.text('This is a computer generated invoice.', { align: 'center' });

        // Finalize PDF file
        doc.end();

    } catch (error) {
        console.error('Invoice Generation Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Server error generating PDF invoice' });
        }
    }
};
