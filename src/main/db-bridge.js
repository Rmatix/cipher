/**
 * db-bridge.js — Cipher SQL Viewer IPC Bridge
 * Handles database connections and queries from the renderer process.
 * Supports: SQLite (local files), PostgreSQL, MySQL/MariaDB, MSSQL.
 */

'use strict'

const { ipcMain } = require('electron')
const path = require('path')

// Active connection pool: connId -> { type, client, db }
const connections = new Map()
let connIdCounter = 0

// ── SQLite (better-sqlite3) ───────────────────────────────────────────────────

function openSQLite(filePath) {
  const Database = require('better-sqlite3')
  const db = new Database(filePath, { readonly: false })
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  return db
}

function getSQLiteSchema(db) {
  const tables = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  ).all().map(r => r.name)

  return tables.map(table => {
    const columns = db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all().map(col => ({
      name:       col.name,
      type:       col.type,
      notnull:    col.notnull === 1,
      pk:         col.pk > 0,
      dflt_value: col.dflt_value,
    }))
    const fks = db.prepare(`PRAGMA foreign_key_list(${JSON.stringify(table)})`).all().map(fk => ({
      from:  fk.from,
      table: fk.table,
      to:    fk.to,
    }))
    const indexes = db.prepare(`PRAGMA index_list(${JSON.stringify(table)})`).all().map(idx => ({
      name:   idx.name,
      unique: idx.unique === 1,
    }))
    return { table, columns, fks, indexes }
  })
}

// ── PostgreSQL (pg) ───────────────────────────────────────────────────────────

async function getPgSchema(client) {
  const { rows: tables } = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
  )
  const schema = []
  for (const { table_name } of tables) {
    const { rows: columns } = await client.query(
      `SELECT column_name as name, data_type as type,
              is_nullable = 'NO' as notnull,
              column_default as dflt_value
       FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [table_name]
    )
    schema.push({ table: table_name, columns, fks: [], indexes: [] })
  }
  return schema
}

// ── MySQL (mysql2) ────────────────────────────────────────────────────────────

async function getMysqlSchema(conn, database) {
  const [tables] = await conn.execute(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
    [database]
  )
  const schema = []
  for (const { TABLE_NAME } of tables) {
    const [columns] = await conn.execute(
      `SELECT COLUMN_NAME as name, DATA_TYPE as type,
              IS_NULLABLE = 'NO' as notnull,
              COLUMN_DEFAULT as dflt_value
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
      [database, TABLE_NAME]
    )
    schema.push({ table: TABLE_NAME, columns, fks: [], indexes: [] })
  }
  return schema
}

// ── IPC Handler registration ──────────────────────────────────────────────────

function registerDbHandlers() {

  // ── db:connect ──────────────────────────────────────────
  ipcMain.handle('db:connect', async (_event, params) => {
    const { type, filePath, host, port, database, user, password } = params
    const connId = `conn_${++connIdCounter}`

    try {
      if (type === 'sqlite') {
        const db = openSQLite(filePath)
        connections.set(connId, { type: 'sqlite', db })
        return { ok: true, connId, name: path.basename(filePath) }
      }

      if (type === 'postgresql') {
        const { Client } = require('pg')
        const client = new Client({ host, port: port || 5432, database, user, password })
        await client.connect()
        connections.set(connId, { type: 'postgresql', client, database })
        return { ok: true, connId, name: `${database}@${host}` }
      }

      if (type === 'mysql') {
        const mysql = require('mysql2/promise')
        const conn = await mysql.createConnection({ host, port: port || 3306, database, user, password })
        connections.set(connId, { type: 'mysql', conn, database })
        return { ok: true, connId, name: `${database}@${host}` }
      }

      if (type === 'mssql') {
        const mssql = require('mssql')
        const pool = await mssql.connect({
          server: host,
          port: port || 1433,
          database,
          user,
          password,
          options: { encrypt: false, trustServerCertificate: true }
        })
        connections.set(connId, { type: 'mssql', pool, database })
        return { ok: true, connId, name: `${database}@${host}` }
      }

      return { ok: false, error: `Unknown database type: ${type}` }

    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // ── db:disconnect ───────────────────────────────────────
  ipcMain.handle('db:disconnect', async (_event, { connId }) => {
    const conn = connections.get(connId)
    if (!conn) return { ok: true }
    try {
      if (conn.type === 'sqlite')     conn.db.close()
      if (conn.type === 'postgresql') await conn.client.end()
      if (conn.type === 'mysql')      await conn.conn.end()
      if (conn.type === 'mssql')      await conn.pool.close()
      connections.delete(connId)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // ── db:schema ───────────────────────────────────────────
  ipcMain.handle('db:schema', async (_event, { connId }) => {
    const conn = connections.get(connId)
    if (!conn) return { ok: false, error: 'Connection not found' }
    try {
      let schema
      if (conn.type === 'sqlite')     schema = getSQLiteSchema(conn.db)
      if (conn.type === 'postgresql') schema = await getPgSchema(conn.client)
      if (conn.type === 'mysql')      schema = await getMysqlSchema(conn.conn, conn.database)
      if (conn.type === 'mssql') {
        const result = await conn.pool.request().query(
          `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`
        )
        schema = result.recordset.map(r => ({ table: r.TABLE_NAME, columns: [], fks: [], indexes: [] }))
      }
      return { ok: true, schema }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // ── db:query ────────────────────────────────────────────
  ipcMain.handle('db:query', async (_event, { connId, sql, params: qParams = [] }) => {
    const conn = connections.get(connId)
    if (!conn) return { ok: false, error: 'Connection not found' }

    const startTime = Date.now()
    try {
      let rows = [], columns = [], rowsAffected = 0

      if (conn.type === 'sqlite') {
        const stmt = conn.db.prepare(sql)
        if (stmt.reader) {
          rows = stmt.all(...qParams)
          columns = rows.length > 0 ? Object.keys(rows[0]) : stmt.columns?.().map(c => c.name) || []
        } else {
          const info = stmt.run(...qParams)
          rowsAffected = info.changes
        }
      }

      if (conn.type === 'postgresql') {
        const result = await conn.client.query(sql, qParams)
        rows = result.rows
        columns = result.fields.map(f => f.name)
        rowsAffected = result.rowCount
      }

      if (conn.type === 'mysql') {
        const [result, fields] = await conn.conn.execute(sql, qParams)
        if (Array.isArray(result)) {
          rows = result
          columns = fields ? fields.map(f => f.name) : Object.keys(result[0] || {})
        } else {
          rowsAffected = result.affectedRows
        }
      }

      if (conn.type === 'mssql') {
        const result = await conn.pool.request().query(sql)
        rows = result.recordset || []
        columns = rows.length > 0 ? Object.keys(rows[0]) : []
        rowsAffected = result.rowsAffected?.[0] || 0
      }

      const elapsed = Date.now() - startTime
      return { ok: true, rows, columns, rowsAffected, elapsed }

    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // ── db:update-row ───────────────────────────────────────
  ipcMain.handle('db:update-row', async (_event, { connId, table, rowKey, changes }) => {
    const conn = connections.get(connId)
    if (!conn) return { ok: false, error: 'Connection not found' }

    try {
      const setClauses = Object.keys(changes).map((k, i) => `${quote(k, conn.type)} = ${placeholder(conn.type, i + 1)}`)
      const whereClauses = Object.keys(rowKey).map((k, i) => `${quote(k, conn.type)} = ${placeholder(conn.type, setClauses.length + i + 1)}`)
      const sql = `UPDATE ${quoteTable(table, conn.type)} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`
      const values = [...Object.values(changes), ...Object.values(rowKey)]

      await executeWrite(conn, sql, values)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // ── db:insert-row ───────────────────────────────────────
  ipcMain.handle('db:insert-row', async (_event, { connId, table, row }) => {
    const conn = connections.get(connId)
    if (!conn) return { ok: false, error: 'Connection not found' }

    try {
      const keys = Object.keys(row)
      const colList = keys.map(k => quote(k, conn.type)).join(', ')
      const valList = keys.map((_, i) => placeholder(conn.type, i + 1)).join(', ')
      const sql = `INSERT INTO ${quoteTable(table, conn.type)} (${colList}) VALUES (${valList})`
      await executeWrite(conn, sql, Object.values(row))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // ── db:delete-row ───────────────────────────────────────
  ipcMain.handle('db:delete-row', async (_event, { connId, table, rowKey }) => {
    const conn = connections.get(connId)
    if (!conn) return { ok: false, error: 'Connection not found' }

    try {
      const whereClauses = Object.keys(rowKey).map((k, i) => `${quote(k, conn.type)} = ${placeholder(conn.type, i + 1)}`)
      const sql = `DELETE FROM ${quoteTable(table, conn.type)} WHERE ${whereClauses.join(' AND ')}`
      await executeWrite(conn, sql, Object.values(rowKey))
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

}

// ── SQL helpers ───────────────────────────────────────────────────────────────

function quote(col, type) {
  if (type === 'mssql') return `[${col}]`
  return `"${col}"`
}

function quoteTable(table, type) {
  if (type === 'mssql') return `[${table}]`
  return `"${table}"`
}

function placeholder(type, index) {
  if (type === 'postgresql') return `$${index}`
  if (type === 'mssql') return `@p${index}`
  return '?'
}

async function executeWrite(conn, sql, values) {
  if (conn.type === 'sqlite')     return conn.db.prepare(sql).run(...values)
  if (conn.type === 'postgresql') return conn.client.query(sql, values)
  if (conn.type === 'mysql')      return conn.conn.execute(sql, values)
  if (conn.type === 'mssql') {
    const req = conn.pool.request()
    values.forEach((v, i) => req.input(`p${i + 1}`, v))
    return req.query(sql)
  }
}

module.exports = { registerDbHandlers }
