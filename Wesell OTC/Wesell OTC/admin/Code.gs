/**
 * Google Apps Script backend for OTC Consignment System
 * Author: Antigravity AI
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.view = e.parameter.v || 'login'; // 'login', 'admin', 'mobile'
  return template.evaluate()
    .setTitle('ระบบฝากขาย OTC')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Configure Spreadsheet and Drive folder IDs
 */
function initDatabase(spreadsheetId, driveFolderId) {
  var sId = spreadsheetId || '1Hom_v3gs5SA82Vr7EGlc1o9nyPb3LuOfIdwJ-odD0Pk';
  var fId = driveFolderId || '1NnfPnnvbC6yXfFgVLqmSJTTcaj6SPh6G';
  
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', sId);
  PropertiesService.getScriptProperties().setProperty('DRIVE_FOLDER_ID', fId);
  
  var ss = getSpreadsheet();
  
  // Tab structures & primary headers
  var tabs = {
    'tb_users': ['UserID', 'Username', 'Password', 'FullName', 'Role', 'Status'],
    'tb_products': ['ProductID', 'SKU', 'ProductName', 'Price', 'StartDate', 'EndDate', 'Status'],
    'tb_stores': ['StoreID', 'StoreName', 'Location', 'Assigned_UserID'],
    'tb_inventory': ['InvID', 'ProductID', 'LocationType', 'LocationID', 'Quantity'],
    'tb_transactions': ['DocNo', 'DocType', 'ReturnSubtype', 'ProductID', 'Quantity', 'LocationID', 'CreatedBy', 'Timestamp', 'Status', 'EvidenceImg', 'ApprovedBy', 'ApprovedTimestamp', 'Remark']
  };
  
  var results = {};
  for (var tabName in tabs) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      results[tabName] = 'Created';
    } else {
      results[tabName] = 'Updated Headers';
    }
    // Always format and enforce headers on Row 1
    sheet.getRange(1, 1, 1, tabs[tabName].length)
         .setValues([tabs[tabName]])
         .setFontWeight("bold")
         .setBackground("#F3F4F6")
         .setHorizontalAlignment("center");
         
    // Format Column A as plain text to preserve leading zeros in IDs
    sheet.getRange("A:A").setNumberFormat("@");
  }
  
  // Seed initial Admin user if empty
  var userSheet = ss.getSheetByName('tb_users');
  if (userSheet.getLastRow() <= 1) {
    userSheet.appendRow(['EMP001', 'admin', 'admin1234', 'System Administrator', 'System_Admin', 'Active']);
  }
  
  // --- Fix existing dates in tb_products to dd-mm-yyyy ---
  try {
    var prodSheet = ss.getSheetByName('tb_products');
    if (prodSheet && prodSheet.getLastRow() > 1) {
      prodSheet.getRange("E:F").setNumberFormat("@"); // Force plain text format
      var dataRange = prodSheet.getRange(2, 5, prodSheet.getLastRow() - 1, 2);
      var dates = dataRange.getValues();
      var changed = false;
      for (var r = 0; r < dates.length; r++) {
        for (var c = 0; c < 2; c++) {
          var val = String(dates[r][c] || "").trim();
          if (val.match(/^\d{4}-\d{2}-\d{2}$/)) {
            var p = val.split('-');
            dates[r][c] = p[2] + '-' + p[1] + '-' + p[0];
            changed = true;
          } else if (val.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            var p = val.split('/');
            dates[r][c] = p[0] + '-' + p[1] + '-' + p[2];
            changed = true;
          } else if (dates[r][c] instanceof Date) {
            var d = dates[r][c];
            var dd = String(d.getDate()).padStart(2, '0');
            var mm = String(d.getMonth() + 1).padStart(2, '0');
            var yyyy = d.getFullYear();
            dates[r][c] = dd + '-' + mm + '-' + yyyy;
            changed = true;
          }
        }
      }
      if (changed) {
        dataRange.setValues(dates);
      }
    }
  } catch(e) {
    // Ignore error in fixing dates
  }
  
  return {
    status: 'success',
    message: 'Database initialized successfully!',
    details: results
  };
}

/**
 * Get Sheet reference
 */
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID') || '1Hom_v3gs5SA82Vr7EGlc1o9nyPb3LuOfIdwJ-odD0Pk';
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch(e) {
    throw new Error("Spreadsheet ID is not configured. Please execute initDatabase with a valid Sheet ID first.");
  }
}

/**
 * Get Google Drive Folder reference for Uploads
 */
function getDriveFolder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DRIVE_FOLDER_ID') || '1NnfPnnvbC6yXfFgVLqmSJTTcaj6SPh6G';
  if (id) {
    return DriveApp.getFolderById(id);
  }
  throw new Error("Google Drive Folder ID is not configured. Please execute initDatabase with a valid Folder ID first.");
}

/**
 * Read sheets as array of objects
 */
function getSheetData(tabName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || '').trim(); });
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  return values.map(function(row) {
    var obj = {};
    headers.forEach(function(header, idx) {
      var val = row[idx];
      // Format dates to string dd-mm-yyyy
      if (val instanceof Date) {
        var d = val.getDate().toString().padStart(2, '0');
        var m = (val.getMonth() + 1).toString().padStart(2, '0');
        var y = val.getFullYear();
        obj[header] = d + '-' + m + '-' + y;
      } else if (header.indexOf('ID') !== -1 || header === 'CreatedBy' || header === 'ApprovedBy' || header === 'DocNo' || header === 'SKU' || header === 'Username' || header === 'Password') {
        obj[header] = (val === null || val === undefined) ? '' : String(val).replace(/^'/, '');
      } else {
        obj[header] = val;
      }
    });
    return obj;
  });
}

/**
 * User Login Validation
 */
function loginUser(username, password) {
  var users = getSheetData('tb_users');
  var inputUname = (username || "").toString().toLowerCase();
  var inputPwd = (password || "").toString();
  
  for (var i = 0; i < users.length; i++) {
    var dbUname = (users[i].Username || "").toString().toLowerCase();
    var dbPwd = (users[i].Password || "").toString();
    
    if (dbUname === inputUname && dbPwd === inputPwd) {
      if (users[i].Status === 'Inactive') {
        return { success: false, message: 'บัญชีนี้ถูกปิดการใช้งานแล้ว' };
      }
      return {
        success: true,
        user: {
          UserID: users[i].UserID,
          Username: users[i].Username,
          FullName: users[i].FullName,
          Role: users[i].Role,
          Status: users[i].Status || 'Active'
        }
      };
    }
  }
  return { success: false, message: 'Invalid username or password' };
}

/**
 * Master Data Read APIs
 */
function getProducts() { return getSheetData('tb_products'); }
function getStores() { return getSheetData('tb_stores'); }
function getUsers() { return getSheetData('tb_users'); }
function getInventory() { return getSheetData('tb_inventory'); }

function getTransactions() {
  var txs = getSheetData('tb_transactions');
  // Sort descending by timestamp/DocNo
  return txs.reverse();
}

function getAllMobileData() {
  try {
    var dataStr = JSON.stringify({
      products: getProducts(),
      stores: getStores(),
      inventory: getInventory(),
      transactions: getTransactions()
    });
    return dataStr.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  } catch(e) {
    return JSON.stringify({ error: e.toString(), stack: e.stack });
  }
}

/**
 * Master Data Write APIs
 */
function saveProduct(product) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_products');
  var data = getSheetData('tb_products');
  
  // Validate SKU and ProductName duplicates
  var newSku = (product.SKU || "").toString();
  var newName = (product.ProductName || "").toString().toLowerCase();
  for (var i = 0; i < data.length; i++) {
    var existingSku = (data[i].SKU || "").toString();
    var existingName = (data[i].ProductName || "").toString().toLowerCase();
    
    if (existingSku === newSku && data[i].ProductID !== product.ProductID) {
      throw new Error("SKU " + product.SKU + " มีการใช้งานแล้ว");
    }
    if (existingName === newName && data[i].ProductID !== product.ProductID) {
      throw new Error("ชื่อสินค้า " + product.ProductName + " มีการใช้งานแล้ว");
    }
  }
  
  if (!product.ProductID) {
    // Generate ProductID (PROD-XXXX)
    var maxId = 0;
    data.forEach(function(p) {
      var idStr = String(p.ProductID || '');
      var num = parseInt(idStr.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    product.ProductID = 'PROD-' + String(maxId + 1).padStart(4, '0');
    sheet.appendRow(["'" + product.ProductID, "'" + product.SKU, product.ProductName, Number(product.Price), product.StartDate, product.EndDate, product.Status]);
  } else {
    // Update existing
    var rowIndex = -1;
    for (var j = 0; j < data.length; j++) {
      if (data[j].ProductID === product.ProductID) {
        rowIndex = j + 2;
        break;
      }
    }
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 2, 1, 6).setValues([["'" + product.SKU, product.ProductName, Number(product.Price), product.StartDate, product.EndDate, product.Status]]);
    }
  }
  SpreadsheetApp.flush();
  return { success: true, product: product };
}

function updateProductStatus(productId, status) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_products');
  var data = getSheetData('tb_products');
  
  var rowIndex = -1;
  for (var i = 0; i < data.length; i++) {
    if (data[i].ProductID === productId) {
      rowIndex = i + 2;
      break;
    }
  }
  
  if (rowIndex !== -1) {
    // Status is column 7 (1-based index)
    sheet.getRange(rowIndex, 7).setValue(status);
    SpreadsheetApp.flush();
    return { success: true };
  } else {
    throw new Error("ไม่พบข้อมูลสินค้า");
  }
}

function saveStore(store) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_stores');
  var data = getSheetData('tb_stores');
  
  if (!store.StoreID) {
    var maxId = 0;
    data.forEach(function(s) {
      var idStr = String(s.StoreID || '');
      var num = parseInt(idStr.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    store.StoreID = 'STORE-' + String(maxId + 1).padStart(4, '0');
    sheet.appendRow(["'" + store.StoreID, store.StoreName, store.Location, "'" + store.Assigned_UserID]);
  } else {
    var rowIndex = -1;
    for (var i = 0; i < data.length; i++) {
      if (data[i].StoreID === store.StoreID) {
        rowIndex = i + 2;
        break;
      }
    }
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 2, 1, 3).setValues([[store.StoreName, store.Location, "'" + store.Assigned_UserID]]);
    }
  }
  SpreadsheetApp.flush();
  return { success: true, store: store };
}

function saveUser(user) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_users');
  var data = getSheetData('tb_users');
  
  // Validate Username duplicates
  var newUname = (user.Username || "").toString().toLowerCase();
  for (var i = 0; i < data.length; i++) {
    var existingUname = (data[i].Username || "").toString().toLowerCase();
    if (existingUname === newUname && data[i].UserID !== user.UserID) {
      throw new Error("Username " + user.Username + " is already in use.");
    }
  }
  
  if (!user.UserID) {
    // Should not happen now since it's required, but just in case
    var maxId = 0;
    data.forEach(function(u) {
      var idStr = String(u.UserID || '');
      var num = parseInt(idStr.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    user.UserID = 'U' + String(maxId + 1).padStart(3, '0');
    sheet.appendRow(["'" + user.UserID, "'" + user.Username, "'" + user.Password, user.FullName, user.Role, user.Status]);
  } else {
    // Check if updating existing or inserting new with manual ID
    var rowIndex = -1;
    for (var j = 0; j < data.length; j++) {
      if (data[j].UserID === user.UserID) {
        rowIndex = j + 2;
        break;
      }
    }
    
    if (rowIndex !== -1) {
      // Update existing
      sheet.getRange(rowIndex, 2, 1, 5).setValues([["'" + user.Username, "'" + user.Password, user.FullName, user.Role, user.Status]]);
    } else {
      // Insert new with manual ID
      sheet.appendRow(["'" + user.UserID, "'" + user.Username, "'" + user.Password, user.FullName, user.Role, user.Status]);
    }
  }
  SpreadsheetApp.flush();
  return { success: true, user: user };
}

function updateUserStatus(userId, status) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_users');
  var data = getSheetData('tb_users');
  
  var rowIndex = -1;
  for (var i = 0; i < data.length; i++) {
    if (data[i].UserID === userId) {
      rowIndex = i + 2;
      break;
    }
  }
  
  if (rowIndex !== -1) {
    // Status is column 6 (1-based index)
    sheet.getRange(rowIndex, 6).setValue(status);
    SpreadsheetApp.flush();
    return { success: true };
  } else {
    throw new Error("ไม่พบข้อมูลผู้ใช้งาน");
  }
}

/**
 * Reassign Store Owner (Admin Transfer)
 */
function transferStore(storeId, newUserId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_stores');
  var data = getSheetData('tb_stores');
  
  var rowIndex = -1;
  for (var i = 0; i < data.length; i++) {
    if (data[i].StoreID === storeId) {
      rowIndex = i + 2;
      break;
    }
  }
  
  if (rowIndex !== -1) {
    sheet.getRange(rowIndex, 4).setValue(newUserId);
    SpreadsheetApp.flush();
    return { success: true };
  }
  throw new Error("Store ID " + storeId + " not found");
}

/**
 * Submit Transaction Request
 * items: Array of { ProductID: string, Quantity: number }
 */
function submitTransaction(docType, returnSubtype, locationId, items, base64Image, fileName, remark) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_transactions');
  
  // Generate DocNo: TXN-YYYYMMDD-XXXX
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  var txs = getSheetData('tb_transactions');
  var count = 1;
  txs.forEach(function(tx) {
    var txDocNo = (tx.DocNo || "").toString();
    if (txDocNo.indexOf("TXN-" + dateStr) === 0) {
      var parts = txDocNo.split("-");
      var num = parseInt(parts[2], 10);
      if (!isNaN(num) && num >= count) count = num + 1;
    }
  });
  var docNo = "TXN-" + dateStr + "-" + String(count).padStart(4, '0');
  
  // Upload evidence image if provided
  var imgUrl = "";
  if (base64Image && base64Image.indexOf(",") !== -1) {
    try {
      var folder = getDriveFolder();
      var contentType = base64Image.split(",")[0].split(":")[1].split(";")[0];
      var base64Data = base64Image.split(",")[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, fileName || (docNo + ".jpg"));
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      imgUrl = file.getUrl();
    } catch(err) {
      throw new Error("Failed to upload evidence image: " + err.message);
    }
  }
  
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  
  // Insert flat rows for each product
  items.forEach(function(item) {
    sheet.appendRow([
      docNo,
      docType,
      returnSubtype || 'N/A',
      item.ProductID,
      Number(item.Quantity),
      locationId,
      item.CreatedBy || '',
      timestamp,
      'Pending',
      imgUrl,
      '', // ApprovedBy
      '', // ApprovedTimestamp
      remark || '' // Remark
    ]);
  });
  
  SpreadsheetApp.flush();
  return { success: true, docNo: docNo };
}

/**
 * Approve Transaction
 */
function approveTransaction(docNo, adminUserId) {
  var ss = getSpreadsheet();
  var txSheet = ss.getSheetByName('tb_transactions');
  var txs = getSheetData('tb_transactions');
  
  // Find all pending records for this DocNo
  var targetRows = [];
  txs.forEach(function(tx, idx) {
    if (tx.DocNo === docNo && tx.Status === 'Pending') {
      targetRows.push({
        rowIndex: idx + 2, // 1-based index + header
        data: tx
      });
    }
  });
  
  if (targetRows.length === 0) {
    throw new Error("No pending transaction found with Document Number: " + docNo);
  }
  
  // Perform stock validation and reservation first
  // We process stock change variables in memory to prevent partial updates
  var inventoryChanges = [];
  
  targetRows.forEach(function(rowObj) {
    var tx = rowObj.data;
    var qty = Number(tx.Quantity);
    var pId = tx.ProductID;
    var locId = tx.LocationID;
    
    if (tx.DocType === 'Restock') {
      // Sale Stock +Qty
      inventoryChanges.push({ locType: 'Sale_Stock', locId: locId, pId: pId, delta: qty });
    } 
    else if (tx.DocType === 'Consign') {
      // Sale Stock -Qty, Pharmacy Stock +Qty
      var saleUser = tx.CreatedBy; // Sale who requested
      inventoryChanges.push({ locType: 'Sale_Stock', locId: saleUser, pId: pId, delta: -qty });
      inventoryChanges.push({ locType: 'Pharmacy_Stock', locId: locId, pId: pId, delta: qty });
    } 
    else if (tx.DocType === 'Sale') {
      // Pharmacy Stock -Qty
      inventoryChanges.push({ locType: 'Pharmacy_Stock', locId: locId, pId: pId, delta: -qty });
    } 
    else if (tx.DocType === 'Return') {
      if (tx.ReturnSubtype === 'Pharmacy_to_Sale') {
        // Pharmacy Stock -Qty, Sale Stock +Qty
        var saleUserForReturn = tx.CreatedBy;
        inventoryChanges.push({ locType: 'Pharmacy_Stock', locId: locId, pId: pId, delta: -qty });
        inventoryChanges.push({ locType: 'Sale_Stock', locId: saleUserForReturn, pId: pId, delta: qty });
      } else if (tx.ReturnSubtype === 'Sale_to_Company') {
        // Sale Stock -Qty
        inventoryChanges.push({ locType: 'Sale_Stock', locId: locId, pId: pId, delta: -qty });
      }
    }
  });
  
  // Dry run stock validations
  try {
    inventoryChanges.forEach(function(change) {
      adjustStock(change.locType, change.locId, change.pId, change.delta, true);
    });
  } catch (err) {
    throw new Error("Approval rejected: " + err.message);
  }
  
  // Execute stock updates
  inventoryChanges.forEach(function(change) {
    adjustStock(change.locType, change.locId, change.pId, change.delta, false);
  });
  
  // Mark transaction rows as Approved
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
  targetRows.forEach(function(rowObj) {
    txSheet.getRange(rowObj.rowIndex, 9).setValue('Approved');
    txSheet.getRange(rowObj.rowIndex, 11).setValue("'" + adminUserId);
    txSheet.getRange(rowObj.rowIndex, 12).setValue("'" + timestamp);
  });
  
  return { success: true, docNo: docNo };
}

/**
 * Cancel Transaction (supports Rollback if Approved)
 */
function cancelTransaction(docNo, adminUserId) {
  var ss = getSpreadsheet();
  var txSheet = ss.getSheetByName('tb_transactions');
  var txs = getSheetData('tb_transactions');
  
  var targetRows = [];
  txs.forEach(function(tx, idx) {
    if (tx.DocNo === docNo) {
      targetRows.push({
        rowIndex: idx + 2,
        data: tx
      });
    }
  });
  
  if (targetRows.length === 0) {
    throw new Error("Transaction " + docNo + " not found.");
  }
  
  var currentStatus = targetRows[0].data.Status;
  
  if (currentStatus === 'Cansaleed') {
    throw new Error("Transaction " + docNo + " is already Cansaleed.");
  }
  
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
  
  if (currentStatus === 'Approved') {
    // We must reverse (rollback) the approved stock additions/deductions
    var rollbackChanges = [];
    
    targetRows.forEach(function(rowObj) {
      var tx = rowObj.data;
      var qty = Number(tx.Quantity);
      var pId = tx.ProductID;
      var locId = tx.LocationID;
      
      if (tx.DocType === 'Restock') {
        // Reverse Restock: Sale Stock -Qty
        rollbackChanges.push({ locType: 'Sale_Stock', locId: locId, pId: pId, delta: -qty });
      } 
      else if (tx.DocType === 'Consign') {
        // Reverse Consign: Sale Stock +Qty, Pharmacy Stock -Qty
        var saleUser = tx.CreatedBy;
        rollbackChanges.push({ locType: 'Sale_Stock', locId: saleUser, pId: pId, delta: qty });
        rollbackChanges.push({ locType: 'Pharmacy_Stock', locId: locId, pId: pId, delta: -qty });
      } 
      else if (tx.DocType === 'Sale') {
        // Reverse Sale: Pharmacy Stock +Qty
        rollbackChanges.push({ locType: 'Pharmacy_Stock', locId: locId, pId: pId, delta: qty });
      } 
      else if (tx.DocType === 'Return') {
        if (tx.ReturnSubtype === 'Pharmacy_to_Sale') {
          // Reverse Pharmacy_to_Sale: Pharmacy Stock +Qty, Sale Stock -Qty
          var saleUserForReturn = tx.CreatedBy;
          rollbackChanges.push({ locType: 'Pharmacy_Stock', locId: locId, pId: pId, delta: qty });
          rollbackChanges.push({ locType: 'Sale_Stock', locId: saleUserForReturn, pId: pId, delta: -qty });
        } else if (tx.ReturnSubtype === 'Sale_to_Company') {
          // Reverse Sale_to_Company: Sale Stock +Qty
          rollbackChanges.push({ locType: 'Sale_Stock', locId: locId, pId: pId, delta: qty });
        }
      }
    });
    
    // Validate rollback doesn't push inventory into negative values
    try {
      rollbackChanges.forEach(function(change) {
        adjustStock(change.locType, change.locId, change.pId, change.delta, true);
      });
    } catch (err) {
      throw new Error("Rollback rejected: " + err.message + ". Stock configuration might have changed.");
    }
    
    // Execute rollback
    rollbackChanges.forEach(function(change) {
      adjustStock(change.locType, change.locId, change.pId, change.delta, false);
    });
  }
  
  // Mark as Cansaleed
  targetRows.forEach(function(rowObj) {
    txSheet.getRange(rowObj.rowIndex, 9).setValue('Cansaleed');
    txSheet.getRange(rowObj.rowIndex, 11).setValue("'" + adminUserId);
    txSheet.getRange(rowObj.rowIndex, 12).setValue("'" + timestamp);
  });
  
  return { success: true, docNo: docNo };
}

/**
 * Handle real-time stock modifications in tb_inventory
 * dryRun: if true, only validate quantity is sufficient and do not write.
 */
function adjustStock(locationType, locationId, productId, deltaQty, dryRun) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_inventory');
  var invId = locationId + "_" + productId;
  var data = getSheetData('tb_inventory');
  var rowIndex = -1;
  var currentQty = 0;
  
  for (var i = 0; i < data.length; i++) {
    if (data[i].InvID === invId) {
      rowIndex = i + 2;
      currentQty = Number(data[i].Quantity);
      break;
    }
  }
  
  var newQty = currentQty + deltaQty;
  if (newQty < 0) {
    var ownerName = locationId;
    if (locationType === 'Sale_Stock') {
      var users = getSheetData('tb_users');
      var user = users.filter(function(u) { return u.UserID === locationId; })[0];
      if (user) ownerName = user.FullName + " (" + locationId + ")";
    } else {
      var stores = getSheetData('tb_stores');
      var store = stores.filter(function(s) { return s.StoreID === locationId; })[0];
      if (store) ownerName = store.StoreName + " (" + locationId + ")";
    }
    
    throw new Error("Insufficient stock for Product [" + productId + "] at Location [" + ownerName + "]. Available: " + currentQty + ", Required adjustment: " + deltaQty);
  }
  
  if (!dryRun) {
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 5).setValue(newQty);
    } else {
      if (deltaQty < 0) {
        throw new Error("Cannot deduct stock. Product [" + productId + "] does not exist at location [" + locationId + "]");
      }
      sheet.appendRow([invId, productId, locationType, "'" + locationId, deltaQty]);
    }
  }
  SpreadsheetApp.flush();
}

/**
 * Admin Dashboard Stats aggregation
 */
function getAdminDashboardStats() {
  var txs = getSheetData('tb_transactions');
  var inventory = getSheetData('tb_inventory');
  var stores = getSheetData('tb_stores');
  var users = getSheetData('tb_users');
  var products = getSheetData('tb_products');
  
  var pendingDocNos = {};
  txs.forEach(function(t) {
    if (t.Status === 'Pending' && t.DocNo) {
      pendingDocNos[t.DocNo] = true;
    }
  });
  var pendingApprovals = Object.keys(pendingDocNos).length;
  
  // Calculate total stock items
  var totalSaleStock = 0;
  var totalPharmacyStock = 0;
  inventory.forEach(function(inv) {
    if (inv.LocationType === 'Sale_Stock') {
      totalSaleStock += Number(inv.Quantity);
    } else if (inv.LocationType === 'Pharmacy_Stock') {
      totalPharmacyStock += Number(inv.Quantity);
    }
  });
  
  // Shelf life alert: check products where Qtr_EndDate is within 14 days or expired
  var shelfLifeAlerts = 0;
  var today = new Date();
  today.setHours(0,0,0,0);
  var checkDate = new Date();
  checkDate.setDate(today.getDate() + 14); // 2 weeks alert
  
  products.forEach(function(p) {
    if (p.EndDate || p.Qtr_EndDate) {
      var dateStr = p.EndDate || p.Qtr_EndDate;
      var end;
      var parts = String(dateStr).split(/[-/]/);
      if (parts.length === 3) {
        var d = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10) - 1;
        var y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
        end = new Date(y, m, d);
      } else {
        end = new Date(dateStr);
      }
      if (!isNaN(end.getTime()) && end <= checkDate) {
        shelfLifeAlerts++;
      }
    }
  });
  
  return {
    pendingApprovals: pendingApprovals,
    totalStores: stores.length,
    totalSales: users.filter(function(u) { return u.Role === 'Sale'; }).length,
    totalProducts: products.length,
    totalSaleStock: totalSaleStock,
    totalPharmacyStock: totalPharmacyStock,
    shelfLifeAlerts: shelfLifeAlerts
  };
}

/**
 * Running diagnostics to verify the systems
 */
function runDiagnosticTests() {
  try {
    var ss = getSpreadsheet();
    var testUser = { UserID: 'TEST_SALE', Username: 'testsale', Password: 'pwd', FullName: 'Test Sale User', Role: 'Sale' };
    var testProd = { ProductID: 'TEST_PROD', SKU: 'TSKU01', ProductName: 'Test Product', Price: 100, Qtr_EndDate: '2026-12-31' };
    var testStore = { StoreID: 'TEST_STORE', StoreName: 'Test Pharmacy', Location: 'Bangkok', Assigned_UserID: 'TEST_SALE' };
    
    // 1. Save mocks
    saveUser(testUser);
    saveProduct(testProd);
    saveStore(testStore);
    
    // 2. Mock Restock
    var res = submitTransaction('Restock', 'N/A', 'TEST_SALE', [{ ProductID: 'TEST_PROD', Quantity: 10 }], '', '');
    var docNo = res.docNo;
    
    // 3. Approve Restock
    approveTransaction(docNo, 'EMP001');
    
    // Verify stock
    var inv = getSheetData('tb_inventory');
    var saleStock = inv.filter(function(i) { return i.InvID === 'TEST_SALE_TEST_PROD'; })[0];
    if (!saleStock || Number(saleStock.Quantity) !== 10) {
      throw new Error("Restock adjustment assertion failed: Sale Stock should be 10");
    }
    
    // 4. Mock Consign
    var resConsign = submitTransaction('Consign', 'N/A', 'TEST_STORE', [{ ProductID: 'TEST_PROD', Quantity: 4 }], '', '');
    resConsign.CreatedBy = 'TEST_SALE'; // Simulate sale submission
    
    // For test simulation, let's update CreatedBy of the consign txn manually
    var txSheet = ss.getSheetByName('tb_transactions');
    var txData = getSheetData('tb_transactions');
    for(var k=0; k<txData.length; k++) {
      if(txData[k].DocNo === resConsign.docNo) {
        txSheet.getRange(k+2, 7).setValue('TEST_SALE'); // CreatedBy
      }
    }
    
    // Approve Consign
    approveTransaction(resConsign.docNo, 'EMP001');
    
    // Verify Stocks
    inv = getSheetData('tb_inventory');
    saleStock = inv.filter(function(i) { return i.InvID === 'TEST_SALE_TEST_PROD'; })[0];
    var pharmStock = inv.filter(function(i) { return i.InvID === 'TEST_STORE_TEST_PROD'; })[0];
    
    if (Number(saleStock.Quantity) !== 6 || Number(pharmStock.Quantity) !== 4) {
      throw new Error("Consignment stock deduction failed. Sale: " + saleStock.Quantity + ", Pharmacy: " + pharmStock.Quantity);
    }
    
    // 5. Cancel Consignment (Rollback)
    cancelTransaction(resConsign.docNo, 'EMP001');
    
    // Verify Stocks are rolled back
    inv = getSheetData('tb_inventory');
    saleStock = inv.filter(function(i) { return i.InvID === 'TEST_SALE_TEST_PROD'; })[0];
    pharmStock = inv.filter(function(i) { return i.InvID === 'TEST_STORE_TEST_PROD'; })[0];
    
    if (Number(saleStock.Quantity) !== 10 || Number(pharmStock.Quantity) !== 0) {
      throw new Error("Consignment rollback failed. Sale: " + saleStock.Quantity + ", Pharmacy: " + pharmStock.Quantity);
    }
    
    // Clean up test records
    var tables = ['tb_users', 'tb_products', 'tb_stores', 'tb_inventory', 'tb_transactions'];
    tables.forEach(function(t) {
      var sheet = ss.getSheetByName(t);
      var rows = sheet.getLastRow();
      for (var r = rows; r > 1; r--) {
        var key = sheet.getRange(r, 1).getValue();
        if (key === 'TEST_SALE' || key === 'TEST_PROD' || key === 'TEST_STORE' || key === 'TEST_SALE_TEST_PROD' || key === 'TEST_STORE_TEST_PROD' || key.indexOf('TXN-') === 0 || sheet.getRange(r, 6).getValue() === 'TEST_SALE' || sheet.getRange(r, 4).getValue() === 'TEST_SALE') {
          sheet.deleteRow(r);
        }
      }
    });
    
    return { status: 'success', message: 'All integration diagnostics passed successfully!' };
  } catch(err) {
    return { status: 'error', message: 'Diagnostic failed: ' + err.message };
  }
}

/**
 * Get configured script properties
 */
function getScriptProperties() {
  return PropertiesService.getScriptProperties().getProperties();
}

/**
 * Bulk Import APIs
 */
function importUsers(dataArray) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_users');
  var existingData = getSheetData('tb_users');
  var importedCount = 0;
  
  dataArray.forEach(function(row) {
    var userId = (row.UserID || '').toString().trim();
    if (!userId) return; // Skip empty rows
    
    // Check for duplicate UserID
    var exists = existingData.filter(function(u) { return u.UserID === userId; }).length > 0;
    
    if (exists) {
      // User requested: skip if duplicate (ไม่สามารถนำเข้าได้เนื่องจากข้อมูลซ้ำ)
      return; // continue to next iteration
    } else {
      // Insert new
      sheet.appendRow([userId, row.Username, row.Password, row.FullName, row.Role]);
      importedCount++;
    }
  });
  
  return { success: true, count: importedCount, message: 'Imported/Updated ' + importedCount + ' users successfully.' };
}

function importStores(dataArray) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_stores');
  var existingData = getSheetData('tb_stores');
  var importedCount = 0;
  
  dataArray.forEach(function(row) {
    var storeId = (row.StoreID || '').toString().trim();
    if (!storeId) return;
    
    var exists = existingData.filter(function(s) { return s.StoreID === storeId; }).length > 0;
    
    if (exists) {
      return; // Skip duplicates
    } else {
      sheet.appendRow(["'" + storeId, row.StoreName, row.Location, "'" + row.Assigned_UserID]);
      importedCount++;
    }
  });
  
  return { success: true, count: importedCount, message: 'Imported/Updated ' + importedCount + ' stores successfully.' };
}

function importProducts(dataArray) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('tb_products');
  var existingData = getSheetData('tb_products');
  var importedCount = 0;
  
  dataArray.forEach(function(row) {
    var productId = (row.ProductID || '').toString().trim();
    if (!productId) return;
    
    var exists = existingData.filter(function(p) { return p.ProductID === productId; }).length > 0;
    
    if (exists) {
      return; // Skip duplicates
    } else {
      sheet.appendRow([productId, row.SKU, row.ProductName, Number(row.Price), row.StartDate, row.EndDate, row.Status]);
      importedCount++;
    }
  });
  
  return { success: true, count: importedCount, message: 'Imported/Updated ' + importedCount + ' products successfully.' };
}

/**
 * Bulk Approve Transactions
 */
function bulkApproveTransactions(docNos, adminUserId) {
  var results = { success: [], failed: [] };
  for (var i = 0; i < docNos.length; i++) {
    try {
      approveTransaction(docNos[i], adminUserId);
      results.success.push(docNos[i]);
    } catch(err) {
      results.failed.push({ docNo: docNos[i], error: err.message });
    }
  }
  return results;
}

/**
 * Bulk Cancel Transactions
 */
function bulkCancelTransactions(docNos, adminUserId) {
  var results = { success: [], failed: [] };
  for (var i = 0; i < docNos.length; i++) {
    try {
      cancelTransaction(docNos[i], adminUserId);
      results.success.push(docNos[i]);
    } catch(err) {
      results.failed.push({ docNo: docNos[i], error: err.message });
    }
  }
  return results;
}
