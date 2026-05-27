import dayjs from 'dayjs';
import gaziLogo from '@/assets/gaziLogo.svg';
import type { Order } from '@/services/ordersApi';

const formatMethod = (m?: string) =>
    m ? m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

const SHOP_NAME = 'M/S.Gazi Traders';
const SHOP_SUBTITLE = 'Depot Invoice';
const SHOP_MOBILE = '01716781486';

interface Props {
    order: Order;
}

const DepotInvoiceContent = ({ order }: Props) => {
    const totalAmount = order.totalAmount;
    const previousDue = order.previousDue ?? 0;
    const subTotal = totalAmount + previousDue;
    const paidAmount = order.paidAmount ?? 0;
    const adjust = subTotal - paidAmount;

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
                            {order.paymentMethod && (
                                <div style={{ fontSize: '10px', marginTop: '2px', color: '#555' }}>
                                    Payment: {order.paymentMethod.replace('_', ' ')}
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
                        <th style={th}>Dozen</th>
                        <th style={th}>Cartoon</th>
                        <th style={th}>Quantity</th>
                        <th style={th}>Amount</th>
                        <th style={th}>Free</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, idx) => {
                        const isDozen = item.unit === 'Dozen';
                        const isCartoon = item.unit === 'Cartoon';
                        const dozenVal = isDozen && item.inputQty ? item.inputQty : '';
                        const cartoonVal = isCartoon && item.inputQty ? item.inputQty : '';
                        const freeVal = item.free && item.free > 0 ? item.free : '';

                        return (
                            <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                                <td style={td}>{idx + 1}</td>
                                <td style={{ ...td, textAlign: 'left' }}>{item.productName}</td>
                                <td style={td}>{item.categoryName || '—'}</td>
                                <td style={td}>{item.unitPrice.toFixed(2)}</td>
                                <td style={td}>{dozenVal}</td>
                                <td style={td}>{cartoonVal}</td>
                                <td style={td}>{item.quantity.toLocaleString()}</td>
                                <td style={{ ...td, textAlign: 'right' }}>
                                    {item.totalPrice > 0 ? item.totalPrice.toFixed(2) : ''}
                                </td>
                                <td style={td}>{freeVal}</td>
                            </tr>
                        );
                    })}
                    {/* Padding rows for visual consistency */}
                    {order.items.length < 5 && Array.from({ length: 5 - order.items.length }).map((_, i) => (
                        <tr key={`pad-${i}`}>
                            {Array.from({ length: 9 }).map((__, j) => (
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
                    <TotalRow label="Depo Due" value={previousDue > 0 ? previousDue.toFixed(2) : ''} />
                    <TotalRow label="Sub Total" value={subTotal.toFixed(2)} bold />
                    {paidAmount > 0 && (
                        <TotalRow
                            label={[
                                dayjs(order.paymentDate ?? order.createdAt).format('DD.MM.YY'),
                                formatMethod(order.paymentMethod),
                            ].filter(Boolean).join(' ')}
                            value={paidAmount.toFixed(2)}
                        />
                    )}
                    <TotalRow label="Adjust" value={adjust !== subTotal ? adjust.toFixed(2) : ''} />
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
