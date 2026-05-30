import dayjs from 'dayjs';
import gaziLogo from '@/assets/gaziLogo.svg';
import type { Order } from '@/services/ordersApi';

const SHOP_NAME = 'M/S.Gazi Traders';
const SHOP_SUBTITLE = 'Depot Invoice';
const SHOP_MOBILE = '01716781486';

interface Props {
    order: Order;
}

const DepotInvoiceContent = ({ order }: Props) => {
    const totalAmount = order.totalAmount;
    const rawPreviousDue = order.previousDue ?? 0;
    const paidAmount = order.paidAmount ?? 0;

    // Previous credit (depo owes distributor from a past depo_due → reduces what they pay now)
    const depoDuePrev = rawPreviousDue < 0 ? Math.abs(rawPreviousDue) : 0;
    // Previous distributor debt (distributor owed depo → adds to what they pay now)
    const distDuePrev = rawPreviousDue > 0 ? rawPreviousDue : 0;

    // Net amount distributor needs to pay for this invoice
    const subTotal = totalAmount - depoDuePrev + distDuePrev;

    // Balance after the online payment
    // positive → depo owes distributor (new Depo Due created by this transaction)
    // negative → distributor still owes depo
    const balance = paidAmount > 0 ? paidAmount - subTotal : 0;
    const newDepoDue = Math.max(0, balance);   // carry forward to next invoice

    // Detect which unit columns to show
    const hasDozen   = order.items.some(i => i.unit === 'Dozen');
    const hasCartoon = order.items.some(i => i.unit === 'Cartoon');
    // Column count for padding rows
    const colCount = 7 + (hasDozen ? 1 : 0) + (hasCartoon ? 1 : 0);

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', padding: '10px' }}>

            {/* ── Shop Header ── */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '6px' }}>
                <img src={gaziLogo} alt="Logo" style={{ height: '36px', marginBottom: '2px' }} />
                <div style={{ fontSize: '17px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{SHOP_NAME}</div>
                <div style={{ fontSize: '12px', fontWeight: '600' }}>{SHOP_SUBTITLE}</div>
                <div style={{ fontSize: '11px' }}>Mobile:{SHOP_MOBILE}</div>
            </div>

            {/* ── Customer + Date Row ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                <tbody>
                    <tr>
                        <td style={{ verticalAlign: 'top', width: '50%' }}>
                            <div><strong>Distributor:</strong> {order.customer?.name ?? 'Walk-in'}</div>
                            {order.customer?.address && (
                                <div><strong>Address:</strong> {order.customer.address}</div>
                            )}
                            {order.customer?.phone && (
                                <div><strong>Mobile:</strong> {order.customer.phone}</div>
                            )}
                        </td>
                        <td style={{ verticalAlign: 'top', textAlign: 'right', width: '50%' }}>
                            <div style={{ fontWeight: '700' }}>DATE {dayjs(order.createdAt).format('DD.MM.YY')}</div>
                            <div style={{ color: '#555', fontSize: '10px' }}>#{order.orderNumber}</div>
                            {order.supplierName && (
                                <div style={{ fontSize: '11px', fontWeight: '700', marginTop: '2px' }}>
                                    {order.supplierName}
                                </div>
                            )}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* ── Items Table ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                        <th style={th}>SL NO</th>
                        <th style={{ ...th, textAlign: 'left', minWidth: '130px' }}>Product Name</th>
                        <th style={th}>Category</th>
                        <th style={th}>Rate</th>
                        {hasDozen   && <th style={th}>Dozen</th>}
                        {hasCartoon && <th style={th}>Cartoon</th>}
                        <th style={th}>Quantity</th>
                        <th style={th}>Amount</th>
                        <th style={th}>Free</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, idx) => {
                        const isDozen   = item.unit === 'Dozen';
                        const isCartoon = item.unit === 'Cartoon';
                        const dozenVal   = isDozen   && item.inputQty ? item.inputQty : '';
                        const cartoonVal = isCartoon && item.inputQty ? item.inputQty : '';
                        const freeVal    = item.free && item.free > 0 ? item.free : '';

                        return (
                            <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                                <td style={td}>{idx + 1}</td>
                                <td style={{ ...td, textAlign: 'left' }}>{item.productName}</td>
                                <td style={td}>{item.categoryName || '—'}</td>
                                <td style={td}>{item.unitPrice.toFixed(2)}</td>
                                {hasDozen   && <td style={td}>{dozenVal}</td>}
                                {hasCartoon && <td style={td}>{cartoonVal}</td>}
                                <td style={td}>{item.quantity.toLocaleString()}</td>
                                <td style={{ ...td, textAlign: 'right' }}>
                                    {item.totalPrice > 0 ? item.totalPrice.toFixed(2) : ''}
                                </td>
                                <td style={td}>{freeVal}</td>
                            </tr>
                        );
                    })}
                    {/* Padding rows */}
                    {order.items.length < 5 && Array.from({ length: 5 - order.items.length }).map((_, i) => (
                        <tr key={`pad-${i}`}>
                            {Array.from({ length: colCount }).map((__, j) => (
                                <td key={j} style={{ ...td, height: '18px' }}></td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* ── Totals Footer ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', borderTop: 'none' }}>
                <tbody>
                    <TotalRow label="Total Taka" value={totalAmount.toFixed(2)} bold />

                    {/* Depo Due from previous orders (credit being applied) */}
                    {depoDuePrev > 0 && (
                        <TotalRow label="Depo Due" value={depoDuePrev.toFixed(2)} />
                    )}
                    {/* Depo Due created by THIS transaction (distributor overpaid) */}
                    {newDepoDue > 0 && depoDuePrev === 0 && (
                        <TotalRow label="Depo Due" value={newDepoDue.toFixed(2)} />
                    )}
                    {/* If no depo due at all, show blank Depo Due row for format consistency */}
                    {depoDuePrev === 0 && newDepoDue === 0 && (
                        <TotalRow label="Depo Due" value="" />
                    )}

                    <TotalRow label="Sub Total" value={subTotal.toFixed(2)} bold />

                    {/* Online payment line */}
                    {paidAmount > 0 && (
                        <TotalRow
                            label={dayjs(order.paymentDate ?? order.createdAt).format('DD.MM.YY') + ' Online'}
                            value={paidAmount.toFixed(2)}
                        />
                    )}

                    {/* Adjust = new Depo Due carry-forward (always positive or blank) */}
                    <TotalRow
                        label="Adjust"
                        value={newDepoDue > 0 ? newDepoDue.toFixed(2) : ''}
                    />
                    <TotalRow label="Others" value="" />
                </tbody>
            </table>

            {/* Notes */}
            {order.notes && (
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#555' }}>
                    <strong>Notes:</strong> {order.notes}
                </div>
            )}
        </div>
    );
};

const TotalRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <tr>
        <td style={{ width: '60%', border: '1px solid #000', padding: '3px 5px' }}></td>
        <td style={{
            textAlign: 'right',
            fontWeight: bold ? '700' : '400',
            border: '1px solid #000',
            padding: '3px 5px',
            whiteSpace: 'nowrap',
        }}>
            {label}
        </td>
        <td style={{
            textAlign: 'right',
            fontWeight: bold ? '700' : '400',
            border: '1px solid #000',
            padding: '3px 8px',
            minWidth: '80px',
        }}>
            {value}
        </td>
    </tr>
);

const th: React.CSSProperties = {
    border: '1px solid #000',
    padding: '3px 4px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '10px',
    whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
    border: '1px solid #ccc',
    padding: '2px 4px',
    textAlign: 'center',
    fontSize: '10px',
    whiteSpace: 'nowrap',
};

export default DepotInvoiceContent;
