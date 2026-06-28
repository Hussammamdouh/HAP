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

// Color categorization helper
function classifyColor(argbHex) {
  if (!argbHex) return 'WHITE';
  
  const hex = argbHex.length === 8 ? argbHex.substring(2) : argbHex;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Detect grayish blue `#44546A`
  if (r === 68 && g === 84 && b === 106) return 'GRAYISH_BLUE';
  
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2 * 100;
  
  if (l < 15) return 'BLACK';
  if (l > 85) return 'WHITE';
  
  const d = max - min;
  const s = (l > 50 ? d / (2 - max - min) : d / (max + min)) * 100;
  
  let h = 0;
  if (d > 0) {
    if (max === r / 255) h = (g / 255 - b / 255) / d + (g < b ? 6 : 0);
    else if (max === g / 255) h = (b / 255 - r / 255) / d + 2;
    else h = (r / 255 - g / 255) / d + 4;
    h = (h / 6) * 360;
  }
  
  if (s < 15) return 'WHITE';
  
  if (h < 25 || h > 330) return 'RED';
  if (h >= 35 && h <= 120) return 'YELLOW_GREEN';
  if (h >= 170 && h <= 260) return 'BLUE';
  
  return 'WHITE';
}

function getRGB(argbString) {
  if (!argbString || argbString.length < 6) return null;
  const hex = argbString.length === 8 ? argbString.substring(2) : argbString;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

function getHSL(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function isCellFontGreen(cell) {
  const fontColor = cell.font?.color;
  if (!fontColor) return false;
  let argb = fontColor.argb;
  if (!argb && fontColor.theme !== undefined) {
    return fontColor.theme === 9; // Theme 9 standard green
  }
  if (!argb) return false;
  
  const rgb = getRGB(argb);
  if (!rgb) return false;
  const hsl = getHSL(rgb.r, rgb.g, rgb.b);
  return hsl.h >= 90 && hsl.h <= 160 && hsl.s > 20 && hsl.l > 15 && hsl.l < 85;
}

function isCellFontRed(cell) {
  const fontColor = cell.font?.color;
  if (!fontColor) return false;
  let argb = fontColor.argb;
  if (!argb && fontColor.theme !== undefined) {
    return fontColor.theme === 5; // Theme 5 standard red/orange
  }
  if (!argb) return false;
  
  const rgb = getRGB(argb);
  if (!rgb) return false;
  const hsl = getHSL(rgb.r, rgb.g, rgb.b);
  return (hsl.h < 25 || hsl.h > 330) && hsl.s > 20 && hsl.l > 15 && hsl.l < 85;
}

function getCellColor(cell) {
  const fill = cell.fill;
  if (!fill || fill.type !== 'pattern' || !fill.fgColor) return 'WHITE';
  
  let argb = fill.fgColor.argb;
  if (!argb && fill.fgColor.theme !== undefined) {
    const themeColors = {
      0: 'FFFFFFFF',
      1: 'FF000000',
      2: 'FFE7E6E6',
      3: 'FF44546A',
      4: 'FF5B9BD5',
      5: 'FFED7D31',
      6: 'FFA5A5A5',
      7: 'FFFFC000',
      8: 'FF4472C4',
      9: 'FF70AD47'
    };
    argb = themeColors[fill.fgColor.theme] || 'FFFFFFFF';
  }
  return classifyColor(argb);
}

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
  
  // Loop through all sheets in the workbook
  workbook.eachSheet((worksheet) => {
    const sheetName = worksheet.name;
    const lowerName = sheetName.toLowerCase().trim();
    if (EXCLUDED_SHEETS.has(lowerName)) {
      console.log(`  Skipping sheet "${sheetName}": matches exclusion list.`);
      return;
    }
    console.log(`Processing worksheet tab: "${sheetName}"...`);
    
    let headerRowNumber = -1;
    const colMap = {};
    
    // 1. Auto-detect Header Row (using score-based criteria to find the lowest sub-header row)
    let bestRowNumber = -1;
    let maxScore = -1;
    
    for (let r = 1; r <= Math.min(100, worksheet.rowCount); r++) {
      const row = worksheet.getRow(r);
      let score = 0;
      
      row.eachCell({ includeEmpty: true }, (cell) => {
        const val = String(cell.value || '').toLowerCase();
        if (val.includes('start') || val.includes('finish') || val.includes('owner') || val.includes('consultant')) {
          score += 10;
        }
        if (val.includes('baseline') || val.includes('actual') || val.includes('duration')) {
          score += 5;
        }
        if (val.includes('days') || val.includes('weeks') || val.includes('months')) {
          score += 5;
        }
      });
      
      if (score > maxScore && score >= 20) {
        maxScore = score;
        bestRowNumber = r;
      }
    }
    headerRowNumber = bestRowNumber;
    
    if (headerRowNumber === -1) {
      console.log(`  Skipping sheet "${sheetName}": could not auto-detect column headers.`);
      return;
    }
    
    console.log(`  Detected headers at row ${headerRowNumber}. Mapping columns...`);
    
    // 2. Dynamic Column Mapping
    const getMergedCellValue = (rowNum, colNum) => {
      const cell = worksheet.getRow(rowNum).getCell(colNum);
      return String(cell.value || '').trim();
    };
    
    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      if (colNum > 25) return;
      
      const bottomVal = String(cell.value || '').toLowerCase().trim();
      
      // Try to resolve using bottom-most row first (if it's not ambiguous)
      if (bottomVal.includes('owner')) {
        colMap.owner = colNum;
        return;
      }
      if (bottomVal.includes('consultant')) {
        colMap.consultant = colNum;
        return;
      }
      if (bottomVal.includes('baseline') && bottomVal.includes('start')) {
        colMap.baseline_start = colNum;
        return;
      }
      if (bottomVal.includes('baseline') && bottomVal.includes('finish')) {
        colMap.baseline_finish = colNum;
        return;
      }
      if (bottomVal.includes('actual') && bottomVal.includes('start')) {
        colMap.actual_start = colNum;
        return;
      }
      if (bottomVal.includes('actual') && bottomVal.includes('finish')) {
        colMap.actual_finish = colNum;
        return;
      }
      
      // If ambiguous, combine with parent rows
      const labels = [];
      for (let offset = -2; offset <= 0; offset++) {
        const rNum = headerRowNumber + offset;
        if (rNum > 0) {
          const v = getMergedCellValue(rNum, colNum);
          if (v) labels.push(v.toLowerCase());
        }
      }
      
      const combined = labels.join(' | ');
      
      if (combined.includes('consultant')) {
        colMap.consultant = colNum;
      } else if (combined.includes('owner')) {
        colMap.owner = colNum;
      } else if (combined.includes('baseline') && combined.includes('start')) {
        colMap.baseline_start = colNum;
      } else if (combined.includes('baseline') && combined.includes('finish')) {
        colMap.baseline_finish = colNum;
      } else if (combined.includes('actual') && combined.includes('start')) {
        colMap.actual_start = colNum;
      } else if (combined.includes('actual') && combined.includes('finish')) {
        colMap.actual_finish = colNum;
      } else if (combined.includes('duration') && combined.includes('days')) {
        colMap.duration_days = colNum;
      } else if (combined.includes('duration') && combined.includes('weeks')) {
        if (combined.includes('actual') || colMap.duration_weeks) {
          colMap.duration_actual_weeks = colNum;
        } else {
          colMap.duration_weeks = colNum;
        }
      } else if (combined.includes('duration') && combined.includes('months')) {
        colMap.duration_months = colNum;
      }
    });
    
    // Default task name/description column is Column G (index 7) if not overridden
    colMap.task_name = colMap.task_name || 7;
    
    console.log("  Column Index Map:", colMap);
    
    let currentProject = '';
    let currentMainframe = '';
    let currentCluster = '';
    let currentPhase = '';
    let currentSubproject = '';
    
    let sheetTaskCount = 0;
    
    // 3. Row parsing loop
    for (let r = headerRowNumber + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      
      // Find the name and cell containing it
      let categoryName = '';
      const descCell = row.getCell(colMap.task_name);
      const valG = String(descCell.value || '').trim();
      let targetCell = descCell;
      
      if (valG && valG.length > 2) {
        categoryName = valG;
      } else {
        // Scan Columns 1 to 10 for first string cell with length > 2
        for (let c = 1; c <= 10; c++) {
          const val = row.getCell(c).value;
          if (typeof val === 'string') {
            const cleaned = val.trim();
            if (cleaned.length > 2) {
              categoryName = cleaned;
              targetCell = row.getCell(c);
              break;
            }
          }
        }
      }
      
      if (!categoryName) {
        continue;
      }
      
      const bgColor = getCellColor(targetCell);
      
      if (bgColor === 'GRAYISH_BLUE') {
        currentProject = categoryName;
        currentMainframe = '';
        currentCluster = '';
        currentPhase = '';
        currentSubproject = '';
      } else if (bgColor === 'BLACK') {
        currentMainframe = categoryName;
      } else if (bgColor === 'BLUE') {
        currentCluster = categoryName;
      } else if (bgColor === 'RED') {
        currentPhase = categoryName;
        currentSubproject = ''; // Reset subproject when a new phase starts
      } else if (bgColor === 'YELLOW_GREEN') {
        currentSubproject = categoryName;
      } else if (bgColor === 'WHITE') {
        // WHITE background = Task row
        const owner = colMap.owner ? String(row.getCell(colMap.owner).value || '').trim() : null;
        const consultant = colMap.consultant ? String(row.getCell(colMap.consultant).value || '').trim() : null;
        
        const duration_days = colMap.duration_days ? Number(row.getCell(colMap.duration_days).value) : null;
        const duration_weeks = colMap.duration_weeks ? Number(row.getCell(colMap.duration_weeks).value) : null;
        const duration_months = colMap.duration_months ? Number(row.getCell(colMap.duration_months).value) : null;
        
        const baseline_start = colMap.baseline_start ? parseExcelDate(row.getCell(colMap.baseline_start).value) : null;
        const baseline_finish = colMap.baseline_finish ? parseExcelDate(row.getCell(colMap.baseline_finish).value) : null;
        
        const duration_actual_weeks = colMap.duration_actual_weeks ? Number(row.getCell(colMap.duration_actual_weeks).value) : null;
        
        const actualStartCell = colMap.actual_start ? row.getCell(colMap.actual_start) : null;
        const actual_start = actualStartCell ? parseExcelDate(actualStartCell.value) : null;
        const actual_start_started = actualStartCell ? isCellFontGreen(actualStartCell) : false;
        
        const actualFinishCell = colMap.actual_finish ? row.getCell(colMap.actual_finish) : null;
        const actual_finish = actualFinishCell ? parseExcelDate(actualFinishCell.value) : null;
        const actual_finish_completed = actualFinishCell ? isCellFontGreen(actualFinishCell) : false;
        
        // Status formula: Actual finish green = Complete, Actual start green = In Progress, else Not Started
        let status = 'Not Started';
        if (actual_finish && actual_finish_completed) {
          status = 'Complete';
        } else if (actual_start && actual_start_started) {
          status = 'In Progress';
        }
        
        allTasks.push({
          project: currentProject || sheetName,
          mainframe: currentMainframe || 'Overall Schedule',
          cluster: currentCluster || 'General',
          phase: currentPhase || 'General',
          subproject: currentSubproject || null,
          task_name: categoryName,
          owner: owner || null,
          consultant: consultant || null,
          duration_days: isNaN(duration_days) ? null : duration_days,
          duration_weeks: isNaN(duration_weeks) ? null : duration_weeks,
          duration_months: isNaN(duration_months) ? null : duration_months,
          baseline_start,
          baseline_finish,
          duration_actual_weeks: isNaN(duration_actual_weeks) ? null : duration_actual_weeks,
          actual_start,
          actual_start_started,
          actual_finish,
          actual_finish_completed,
          status
        });
        
        sheetTaskCount++;
      }
    }
    
    console.log(`  Parsed ${sheetTaskCount} tasks successfully.`);
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
