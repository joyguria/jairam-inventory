// Inside your payment creation logic:
const fuelTx = await FuelTransaction.findById(req.body.fuelTransactionId);
const totalAlreadyPaid = await PaymentTransaction.aggregate([
    { $match: { fuelTransactionId: fuelTx._id, status: 'completed' } },
    { $group: { _id: null, total: { $sum: "$amountPaid" } } }
]);

const currentPaid = totalAlreadyPaid[0]?.total || 0;
if (currentPaid + req.body.amountPaid > fuelTx.netAmount) {
    return res.status(400).json({ error: "Payment exceeds the outstanding balance." });
}