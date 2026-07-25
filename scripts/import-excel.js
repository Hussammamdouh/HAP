const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local file manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    });
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Supabase environment variables are not configured in .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Unpack cell value, supporting primitive types, Date objects, and Excel formulas
function getCellValue(cell) {
  if (!cell) return null;
  const val = cell.value;
  if (val === null || val === undefined) return null;
  if (val instanceof Date) {
    return val;
  }
  if (typeof val === 'object') {
    if (val.result !== undefined) {
      if (val.result && typeof val.result === 'object' && val.result.error) {
        return null; // Return null if it is an Excel error cell like #N/A or #VALUE!
      }
      return val.result;
    }
    return null;
  }
  return val;
}

// Helper to parse numeric values from Excel
function parseExcelNumber(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (str === '-' || str === '—' || str === '') return null;
  const num = Number(str);
  return isNaN(num) ? null : num;
}

// Helper to parse dates from Excel
function parseExcelDate(cellValue) {
  if (!cellValue) return null;
  if (cellValue instanceof Date) {
    if (isNaN(cellValue.getTime())) return null;
    return cellValue.toISOString().split('T')[0];
  }
  if (typeof cellValue === 'object' && cellValue.result) {
    return parseExcelDate(cellValue.result);
  }
  
  const str = String(cellValue).trim();
  if (!str || str === '—' || str === '-') return null;
  
  const num = Number(str);
  if (!isNaN(num) && num > 25569) {
    const date = new Date((num - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  const parsed = Date.parse(str.replace(/-/g, ' '));
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }
  return null;
}

async function importExcel(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at path: ${filePath}`);
    process.exit(1);
  }
  
  console.log(`Loading workbook: ${filePath}...`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const allTasks = [];
  const EXCLUDED_SHEETS = new Set([
    'cover',
    'portfolio dashboard',
    'project summary',
    'all projects summary',
    'refresh',
    'dashboard',
    'portfolio summary',
    'summary',
    'soa time frame',
    'soa'
  ]);
  
  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name;
    const lowerName = sheetName.toLowerCase().trim();
    if (EXCLUDED_SHEETS.has(lowerName)) {
      console.log(`  Skipping sheet "${sheetName}": matches exclusion list.`);
      return;
    }
    console.log(`Processing worksheet tab: "${sheetName}"...`);
    
    // Find the project name from Row 1, Column 1
    const rawProjectName = getCellValue(worksheet.getRow(1).getCell(1));
    const projectDisplayName = rawProjectName ? String(rawProjectName).trim() : sheetName;
    
    // Find the project-level variance from Row 1, Column 10 (Cell J1)
    const rawProjectVariance = getCellValue(worksheet.getRow(1).getCell(10));
    const projectVariance = Math.ceil(parseExcelNumber(rawProjectVariance) || 0);
    console.log(`  Project variance from Cell J1: ${projectVariance} days`);
    
    // Find the header row (the row where Col 1 equals "Phase")
    let headerRowNumber = -1;
    for (let r = 1; r <= 10; r++) {
      const val = String(getCellValue(worksheet.getRow(r).getCell(1)) || '').toLowerCase().trim();
      if (val === 'phase') {
        headerRowNumber = r;
        break;
      }
    }
    
    if (headerRowNumber === -1) {
      console.log(`  Skipping sheet "${sheetName}": could not locate "Phase" header row.`);
      return;
    }
    
    console.log(`  Detected headers at row ${headerRowNumber}. Reading tasks...`);
    let sheetTaskCount = 0;
    const blankStatusTasks = [];
    
    // Loop through all data rows under the header row
    // Tracks the priority (column M) of the most recent phase header row, so it can be
    // stamped onto the task rows that follow — the same phase name (Trade) can recur as
    // several separate blocks down a sheet, each with its own priority.
    let currentPhasePriority = null;
    for (let r = headerRowNumber + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const task = getCellValue(row.getCell(4));

      // If Task is blank/empty, it is a phase header row, not a task row
      if (!task || String(task).trim() === '') {
        const rowPriority = parseExcelNumber(getCellValue(row.getCell(13)));
        if (rowPriority !== null) currentPhasePriority = rowPriority;
        continue;
      }
      
      const projectVal = projectDisplayName;
      const tradeVal = getCellValue(row.getCell(2)) || 'General';
      const parentVal = getCellValue(row.getCell(3)) || 'General';
      const ownerVal = getCellValue(row.getCell(5));
      const consultantVal = getCellValue(row.getCell(6));
      
      const baselineFinish = parseExcelDate(getCellValue(row.getCell(7)));
      const actualFinish = parseExcelDate(getCellValue(row.getCell(8)));
      
      const rawStatus = String(getCellValue(row.getCell(9)) || '').trim().toLowerCase();
      let status = 'Not Started';
      if (rawStatus.includes('complete')) {
        status = 'Complete';
      } else if (rawStatus.includes('progress')) {
        status = 'In Progress';
      } else if (!rawStatus) {
        // Blank status cell defaults to "Not Started" but is flagged below so it doesn't
        // silently masquerade as an explicitly-confirmed status.
        blankStatusTasks.push(String(task).trim());
      }
      
      const slippage = parseExcelNumber(getCellValue(row.getCell(10)));
      const daysToFinish = parseExcelNumber(getCellValue(row.getCell(12)));
      
      allTasks.push({
        project: String(projectVal).trim(),
        mainframe: String(tradeVal).trim(),
        cluster: String(tradeVal).trim(),
        phase: String(tradeVal).trim(),
        phase_priority: currentPhasePriority,
        subproject: String(parentVal).trim(),
        task_name: String(task).trim(),
        owner: ownerVal ? String(ownerVal).trim() : null,
        consultant: consultantVal ? String(consultantVal).trim() : null,
        duration_days: slippage,
        duration_weeks: null,
        duration_months: projectVariance,
        baseline_start: null,
        baseline_finish: baselineFinish,
        duration_actual_weeks: daysToFinish,
        actual_start: null,
        actual_start_started: status === 'In Progress' || status === 'Complete',
        actual_finish: actualFinish,
        actual_finish_completed: status === 'Complete',
        status: status
      });
      
      sheetTaskCount++;
    }
    
    console.log(`  Parsed ${sheetTaskCount} tasks successfully.`);
    if (blankStatusTasks.length > 0) {
      console.log(`  WARNING: ${blankStatusTasks.length} task(s) have a blank Status cell and were defaulted to "Not Started":`);
      blankStatusTasks.forEach(name => console.log(`    - ${name}`));
    }
  });
  
  if (allTasks.length === 0) {
    console.log("No tasks parsed from workbook. Ingestion skipped.");
    return;
  }
  
  console.log(`Total parsed tasks: ${allTasks.length}. Re-seeding Supabase database...`);
  
  // Wipe out old tasks to prevent duplicates
  const { error: deleteError } = await supabase.from('tasks').delete().neq('project', '');
  if (deleteError) {
    console.error("Error clearing old database records:", deleteError);
    process.exit(1);
  }
  
  console.log("Cleared existing database records.");
  
  // Batch insert new tasks in chunks of 100 records
  const chunkSize = 100;
  for (let i = 0; i < allTasks.length; i += chunkSize) {
    const chunk = allTasks.slice(i, i + chunkSize);
    const { error: insertError } = await supabase.from('tasks').insert(chunk);
    if (insertError) {
      console.error(`Error inserting task chunk starting at index ${i}:`, insertError);
      process.exit(1);
    }
  }
  
  console.log(`Successfully imported ${allTasks.length} tasks to Supabase!`);
}

// Check arguments
const filePath = process.argv[2];
if (!filePath) {
  console.log("Usage: node scripts/import-excel.js <path_to_excel_file>");
  process.exit(1);
}

importExcel(filePath).catch(err => {
  console.error("Uncaught exception during excel import:", err);
  process.exit(1);
});
