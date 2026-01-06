import * as Print from 'expo-print';

type FuelLogEntry = {
  id: string;
  assetId: string;
  assetType: string;
  plantNumber?: string;
  registrationNumber?: string;
  fuelAmount: number;
  meterReading: number;
  meterType: 'HOUR_METER' | 'ODOMETER';
  date: string;
  loggedBy: string;
  loggedByName: string;
  siteId?: string;
  siteName?: string;
  masterAccountId: string;
  companyId?: string;
  ownerName?: string;
  ownerId?: string;
  ownerType?: 'company' | 'subcontractor';
  notes?: string;
};

type DieselReportOptions = {
  logs: FuelLogEntry[];
  dateRange: {
    from: Date;
    to: Date;
  };
  subcontractorFilter: string[];
  companyName: string;
};

const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export async function generateDieselReportPDF(options: DieselReportOptions): Promise<string> {
  const { logs, dateRange, subcontractorFilter, companyName } = options;

  console.log('[DieselReportPDF] Generating PDF for', logs.length, 'entries');

  const totalFuel = logs.reduce((sum, log) => sum + log.fuelAmount, 0);
  const uniqueAssets = new Set(logs.map(log => log.assetId)).size;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #1e293b;
      padding: 20px;
      background: #fff;
    }
    
    .header {
      margin-bottom: 24px;
      border-bottom: 2px solid #f59e0b;
      padding-bottom: 16px;
    }
    
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }
    
    .header .company {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 4px;
    }
    
    .header .date-range {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
    
    .summary {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    
    .summary-item {
      flex: 1;
    }
    
    .summary-item .label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .summary-item .value {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    
    .filters {
      margin-bottom: 20px;
      padding: 12px;
      background: #eff6ff;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
    }
    
    .filters .title {
      font-size: 11px;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 6px;
    }
    
    .filters .filter-item {
      font-size: 10px;
      color: #1e40af;
      margin-left: 12px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10px;
    }
    
    thead {
      background: #f8fafc;
    }
    
    th {
      text-align: left;
      padding: 10px 8px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    
    tbody tr:hover {
      background: #fefce8;
    }
    
    .fuel-amount {
      font-weight: 600;
      color: #f59e0b;
    }
    
    .notes-cell {
      font-size: 9px;
      color: #64748b;
      font-style: italic;
      max-width: 150px;
    }
    
    .total-row {
      background: #fef3c7 !important;
      font-weight: 700;
    }
    
    .total-row td {
      padding: 12px 8px;
      border-top: 2px solid #f59e0b;
      border-bottom: 2px solid #f59e0b;
    }
    
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
    }
    
    @media print {
      body {
        padding: 10px;
      }
      
      .summary {
        break-inside: avoid;
      }
      
      table {
        page-break-inside: auto;
      }
      
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      
      thead {
        display: table-header-group;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Diesel / Fuel Log Report</h1>
    <div class="company">${companyName}</div>
    <div class="date-range">
      ${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}
    </div>
  </div>
  
  <div class="summary">
    <div class="summary-item">
      <div class="label">Total Entries</div>
      <div class="value">${logs.length}</div>
    </div>
    <div class="summary-item">
      <div class="label">Unique Assets</div>
      <div class="value">${uniqueAssets}</div>
    </div>
    <div class="summary-item">
      <div class="label">Total Fuel</div>
      <div class="value">${totalFuel.toFixed(2)} L</div>
    </div>
  </div>
  
  ${subcontractorFilter.length > 0 ? `
    <div class="filters">
      <div class="title">Applied Filters:</div>
      <div class="filter-item">• Plant Owner: ${subcontractorFilter.join(', ')}</div>
    </div>
  ` : ''}
  
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Plant No.</th>
        <th>Site No.</th>
        <th>Owner</th>
        <th>Type</th>
        <th>Refueled By</th>
        <th>Machine Hours</th>
        <th>Fuel (L)</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${logs.map(log => `
        <tr>
          <td>${formatDate(log.date)}</td>
          <td>${log.plantNumber || '-'}</td>
          <td>${log.registrationNumber || '-'}</td>
          <td>${log.ownerName || '-'}</td>
          <td>${log.assetType}</td>
          <td>${log.loggedByName}</td>
          <td>${log.meterReading} ${log.meterType === 'HOUR_METER' ? 'hrs' : 'km'}</td>
          <td class="fuel-amount">${log.fuelAmount.toFixed(2)}</td>
          <td class="notes-cell">${log.notes || '-'}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="7" style="text-align: right;">TOTAL FUEL:</td>
        <td class="fuel-amount">${totalFuel.toFixed(2)} L</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  
  <div class="footer">
    Generated on ${formatDateTime(new Date())} | ${companyName}
  </div>
</body>
</html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    console.log('[DieselReportPDF] PDF generated successfully:', uri);
    return uri;
  } catch (error) {
    console.error('[DieselReportPDF] Error generating PDF:', error);
    throw new Error('Failed to generate diesel report PDF');
  }
}
